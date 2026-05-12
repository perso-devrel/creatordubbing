import 'server-only'

import { createReadStream } from 'node:fs'
import { mkdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import ffmpegPath from 'ffmpeg-static'
import { persoFetch } from '@/lib/perso/client'
import { PersoError } from '@/lib/perso/errors'
import { recordPersoMediaOwner } from '@/lib/perso/ownership'
import type { SasTokenResponse, SttResponse, UploadAudioResponse } from '@/lib/perso/types'

const OVERLAP_MS = 20_000
const MAX_EXPORT_DURATION_MS = 30 * 60 * 1000
const MAX_LOGICAL_SEGMENT_MS = MAX_EXPORT_DURATION_MS - OVERLAP_MS * 2
const DEFAULT_LOGICAL_SEGMENT_MS = 25 * 60 * 1000
const SILENCE_SEARCH_WINDOW_MS = 2 * 60 * 1000
const MIN_LOGICAL_SEGMENT_MS = 5 * 60 * 1000

interface SilenceRange {
  startMs: number
  endMs: number
}

export interface LongSttSegmentPlan {
  segmentIndex: number
  logicalStartMs: number
  logicalEndMs: number
  exportStartMs: number
  exportEndMs: number
}

export interface PreparedLongSttSegment extends LongSttSegmentPlan {
  mediaSeq: number
  projectSeq: number
}

export async function buildLongSttSegmentPlanForSource(args: {
  originalVideoUrl: string
  durationMs: number
}): Promise<LongSttSegmentPlan[]> {
  assertAllowedSourceUrl(args.originalVideoUrl)
  const silences = await detectRelevantSilences(args.originalVideoUrl, args.durationMs).catch(() => [])
  return buildLongSttSegmentPlan(args.durationMs, silences)
}

export async function prepareLongSttSegments(args: {
  userId: string
  jobId: number
  spaceSeq: number
  originalVideoUrl: string
  durationMs: number
  title: string
}): Promise<PreparedLongSttSegment[]> {
  const workDir = path.join(tmpdir(), `dubtube-long-stt-${args.jobId}-${Date.now()}`)
  await mkdir(workDir, { recursive: true })

  try {
    const plan = await buildLongSttSegmentPlanForSource({
      originalVideoUrl: args.originalVideoUrl,
      durationMs: args.durationMs,
    })
    const prepared: PreparedLongSttSegment[] = []

    for (const segment of plan) {
      prepared.push(await prepareLongSttSegment({
        ...args,
        segment,
        workDir,
        totalSegments: plan.length,
      }))
    }

    return prepared
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function prepareLongSttSegment(args: {
  userId: string
  jobId: number
  spaceSeq: number
  originalVideoUrl: string
  title: string
  segment: LongSttSegmentPlan
  totalSegments: number
  workDir?: string
}): Promise<PreparedLongSttSegment> {
  assertAllowedSourceUrl(args.originalVideoUrl)
  const ownsWorkDir = !args.workDir
  const workDir = args.workDir ?? path.join(
    tmpdir(),
    `dubtube-long-stt-${args.jobId}-${args.segment.segmentIndex}-${Date.now()}`,
  )
  await mkdir(workDir, { recursive: true })

  try {
    const fileName = `dubtube-job-${args.jobId}-segment-${args.segment.segmentIndex + 1}.mp3`
    const outputPath = path.join(workDir, fileName)
    await extractAudioSegment(
      args.originalVideoUrl,
      outputPath,
      args.segment.exportStartMs,
      args.segment.exportEndMs,
    )
    const media = await uploadAudioSegment({
      userId: args.userId,
      spaceSeq: args.spaceSeq,
      filePath: outputPath,
      fileName,
    })
    const stt = await startSttProject({
      spaceSeq: args.spaceSeq,
      mediaSeq: media.seq,
      title: `${args.title || 'Dubtube STT'} ${args.segment.segmentIndex + 1}/${args.totalSegments}`,
    })
    const projectSeq = stt.startGenerateProjectIdList[0]
    if (!projectSeq) {
      throw new PersoError('STT_PROJECT_NOT_CREATED', 'Failed to create STT project for a segment', 502)
    }

    return {
      ...args.segment,
      mediaSeq: media.seq,
      projectSeq,
    }
  } finally {
    if (ownsWorkDir) {
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

export function buildLongSttSegmentPlan(durationMs: number, silences: SilenceRange[] = []): LongSttSegmentPlan[] {
  if (durationMs <= MAX_EXPORT_DURATION_MS) {
    return [{
      segmentIndex: 0,
      logicalStartMs: 0,
      logicalEndMs: durationMs,
      exportStartMs: 0,
      exportEndMs: durationMs,
    }]
  }

  const count = getSegmentCount(durationMs)
  const boundaries = [0]
  for (let i = 1; i < count; i += 1) {
    const previous = boundaries[boundaries.length - 1]
    const remainingSegments = count - i
    const target = Math.round((durationMs * i) / count)
    const minBoundary = Math.max(
      previous + MIN_LOGICAL_SEGMENT_MS,
      durationMs - remainingSegments * MAX_LOGICAL_SEGMENT_MS,
    )
    const maxBoundary = Math.min(
      previous + MAX_LOGICAL_SEGMENT_MS,
      durationMs - remainingSegments * MIN_LOGICAL_SEGMENT_MS,
    )
    const desired = clamp(target, minBoundary, maxBoundary)
    boundaries.push(selectBoundary(desired, minBoundary, maxBoundary, silences))
  }
  boundaries.push(durationMs)

  return boundaries.slice(0, -1).map((startMs, index) => {
    const endMs = boundaries[index + 1]
    return {
      segmentIndex: index,
      logicalStartMs: startMs,
      logicalEndMs: endMs,
      exportStartMs: index === 0 ? startMs : Math.max(0, startMs - OVERLAP_MS),
      exportEndMs: index === boundaries.length - 2 ? endMs : Math.min(durationMs, endMs + OVERLAP_MS),
    }
  })
}

function getSegmentCount(durationMs: number): number {
  if (durationMs <= 30 * 60 * 1000) return 1
  if (durationMs <= 50 * 60 * 1000) return 2
  if (durationMs <= 75 * 60 * 1000) return 3
  return Math.ceil(durationMs / DEFAULT_LOGICAL_SEGMENT_MS)
}

async function detectRelevantSilences(sourceUrl: string, durationMs: number): Promise<SilenceRange[]> {
  if (durationMs <= MAX_EXPORT_DURATION_MS) return []

  const roughPlan = buildLongSttSegmentPlan(durationMs)
  const boundaries = roughPlan
    .slice(0, -1)
    .map((segment) => segment.logicalEndMs)
  const ranges: SilenceRange[] = []

  for (const boundaryMs of boundaries) {
    const windowStartMs = Math.max(0, boundaryMs - SILENCE_SEARCH_WINDOW_MS)
    const windowEndMs = Math.min(durationMs, boundaryMs + SILENCE_SEARCH_WINDOW_MS)
    const output = await runFfmpeg([
      '-hide_banner',
      '-nostats',
      '-ss',
      msToSeconds(windowStartMs),
      '-t',
      msToSeconds(windowEndMs - windowStartMs),
      '-i',
      sourceUrl,
      '-af',
      'silencedetect=noise=-35dB:d=0.35',
      '-f',
      'null',
      '-',
    ])

    ranges.push(...parseSilences(output.stderr, windowStartMs)
      .filter((range) => range.endMs >= windowStartMs && range.startMs <= windowEndMs))
  }

  return ranges
}

function selectBoundary(
  desiredMs: number,
  minMs: number,
  maxMs: number,
  silences: SilenceRange[],
) {
  const windowStart = Math.max(minMs, desiredMs - SILENCE_SEARCH_WINDOW_MS)
  const windowEnd = Math.min(maxMs, desiredMs + SILENCE_SEARCH_WINDOW_MS)
  let best: { point: number; distance: number } | null = null

  for (const silence of silences) {
    const point = Math.round((silence.startMs + silence.endMs) / 2)
    if (point < windowStart || point > windowEnd) continue
    const distance = Math.abs(point - desiredMs)
    if (!best || distance < best.distance) best = { point, distance }
  }

  return best ? best.point : desiredMs
}

function assertAllowedSourceUrl(url: string) {
  const parsed = new URL(url)
  const allowed = ['perso.ai', '.perso.ai', '.blob.core.windows.net']
  const host = parsed.hostname
  const ok = allowed.some((domain) => (
    domain.startsWith('.')
      ? host.endsWith(domain)
      : host === domain || host.endsWith(`.${domain}`)
  ))
  if (!ok) {
    throw new PersoError('INVALID_SOURCE_URL', 'Source video URL is not allowed for long STT processing', 400)
  }
}

export function parseSilences(text: string, offsetMs = 0): SilenceRange[] {
  const ranges: SilenceRange[] = []
  let pendingStart: number | null = null

  for (const line of text.split(/\r?\n/)) {
    const startMatch = line.match(/silence_start:\s*([0-9.]+)/)
    if (startMatch) {
      pendingStart = offsetMs + secondsToMs(Number(startMatch[1]))
      continue
    }
    const endMatch = line.match(/silence_end:\s*([0-9.]+)/)
    if (endMatch && pendingStart !== null) {
      const endMs = offsetMs + secondsToMs(Number(endMatch[1]))
      if (endMs > pendingStart) ranges.push({ startMs: pendingStart, endMs })
      pendingStart = null
    }
  }

  return ranges
}

async function extractAudioSegment(
  sourceUrl: string,
  outputPath: string,
  startMs: number,
  endMs: number,
) {
  await runFfmpeg([
    '-hide_banner',
    '-y',
    '-ss',
    msToSeconds(startMs),
    '-t',
    msToSeconds(endMs - startMs),
    '-i',
    sourceUrl,
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-codec:a',
    'libmp3lame',
    '-b:a',
    '96k',
    outputPath,
  ])
}

async function uploadAudioSegment(args: {
  userId: string
  spaceSeq: number
  filePath: string
  fileName: string
}): Promise<UploadAudioResponse> {
  const { blobSasUrl } = await persoFetch<SasTokenResponse>('/file/api/upload/sas-token', {
    baseURL: 'file',
    query: { fileName: args.fileName },
  })
  const fileStat = await stat(args.filePath)
  const putResponse = await fetch(blobSasUrl, {
    method: 'PUT',
    headers: {
      'x-ms-blob-type': 'BlockBlob',
      'Content-Type': 'audio/mpeg',
      'Content-Length': String(fileStat.size),
    },
    body: createReadStream(args.filePath) as unknown as BodyInit,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' })
  if (!putResponse.ok) {
    throw new PersoError('SEGMENT_UPLOAD_FAILED', `Segment upload failed: ${putResponse.status}`, 502)
  }

  const fileUrl = blobSasUrl.split('?')[0]
  const media = await persoFetch<UploadAudioResponse>('/file/api/upload/audio', {
    method: 'PUT',
    baseURL: 'file',
    timeoutMs: 300_000,
    body: {
      spaceSeq: args.spaceSeq,
      fileUrl,
      fileName: args.fileName,
    },
  })
  await recordPersoMediaOwner({
    userId: args.userId,
    spaceSeq: args.spaceSeq,
    media,
    sourceType: 'upload',
    fileUrl,
  })
  return media
}

function startSttProject(args: {
  spaceSeq: number
  mediaSeq: number
  title: string
}) {
  return persoFetch<SttResponse>(
    `/video-translator/api/v1/projects/spaces/${args.spaceSeq}/stt`,
    {
      method: 'POST',
      baseURL: 'api',
      body: {
        mediaSeq: args.mediaSeq,
        isVideoProject: false,
        title: args.title,
      },
    },
  )
}

function runFfmpeg(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const binaryPath = ffmpegPath
  if (!binaryPath) {
    throw new PersoError('FFMPEG_NOT_AVAILABLE', 'ffmpeg is not available on this server', 500)
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, args, {
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += String(chunk)
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += String(chunk)
    })
    child.on('error', reject)
    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        reject(new PersoError('FFMPEG_FAILED', stderr.slice(-2000) || `ffmpeg exited with ${code}`, 500))
      }
    })
  })
}

function secondsToMs(seconds: number) {
  return Math.max(0, Math.round(seconds * 1000))
}

function msToSeconds(ms: number) {
  return (ms / 1000).toFixed(3)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
