import { describe, expect, it } from 'vitest'
import { buildLongSttSegmentPlan, parseSilences } from './media'

const minute = 60_000

describe('buildLongSttSegmentPlan', () => {
  it('keeps videos at or under 30 minutes as a single segment', () => {
    expect(buildLongSttSegmentPlan(30 * minute)).toEqual([{
      segmentIndex: 0,
      logicalStartMs: 0,
      logicalEndMs: 30 * minute,
      exportStartMs: 0,
      exportEndMs: 30 * minute,
    }])
  })

  it('splits a 60 minute video into three balanced overlapped STT exports', () => {
    const plan = buildLongSttSegmentPlan(60 * minute)

    expect(plan).toHaveLength(3)
    expect(plan.every((segment) => segment.exportEndMs - segment.exportStartMs <= 30 * minute)).toBe(true)
    expect(plan[0].logicalStartMs).toBe(0)
    expect(plan[2].logicalEndMs).toBe(60 * minute)
    expect(plan[1].exportStartMs).toBeLessThan(plan[1].logicalStartMs)
    expect(plan[1].exportEndMs).toBeGreaterThan(plan[1].logicalEndMs)
  })

  it('prefers a nearby silence point for boundaries', () => {
    const plan = buildLongSttSegmentPlan(45 * minute, [
      { startMs: 23 * minute, endMs: 23 * minute + 1000 },
    ])

    expect(plan).toHaveLength(2)
    expect(plan[0].logicalEndMs).toBe(23 * minute + 500)
    expect(plan[1].logicalStartMs).toBe(23 * minute + 500)
  })

  it('offsets ffmpeg silence windows back to the original timeline', () => {
    const silences = parseSilences([
      '[silencedetect @ 000] silence_start: 12.5',
      '[silencedetect @ 000] silence_end: 13.2 | silence_duration: 0.7',
    ].join('\n'), 20 * minute)

    expect(silences).toEqual([{
      startMs: 20 * minute + 12_500,
      endMs: 20 * minute + 13_200,
    }])
  })
})
