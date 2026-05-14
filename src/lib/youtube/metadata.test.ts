import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchVideoMetadata, updateVideoLocalizations } from './metadata'

describe('youtube metadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches snippet and existing localizations', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        items: [
          {
            id: 'v1',
            snippet: {
              title: '원문',
              description: '설명',
              categoryId: '22',
              tags: ['a'],
              defaultLanguage: 'ko',
            },
            localizations: {
              en: { title: 'Title', description: 'Description' },
            },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchVideoMetadata('token', 'v1')).resolves.toEqual({
      videoId: 'v1',
      title: '원문',
      description: '설명',
      categoryId: '22',
      tags: ['a'],
      defaultLanguage: 'ko',
      resolvedLanguage: 'ko',
      resolvedFrom: 'default',
      localizations: {
        en: { title: 'Title', description: 'Description' },
      },
    })
  })

  it('prefers the requested source localization when the default snippet is another language', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () =>
      Response.json({
        items: [
          {
            id: 'v1',
            snippet: {
              title: 'English title',
              description: 'English description',
              categoryId: '22',
              defaultLanguage: 'en',
            },
            localizations: {
              ko: { title: 'Korean title', description: 'Korean description' },
            },
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchVideoMetadata('token', 'v1', 'ko')).resolves.toMatchObject({
      title: 'Korean title',
      description: 'Korean description',
      defaultLanguage: 'en',
      resolvedLanguage: 'ko',
      resolvedFrom: 'localization',
    })
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('hl=ko')
  })

  it('merges localizations and preserves required snippet fields on update', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: 'v1',
              snippet: {
                title: '원문',
                description: '설명',
                categoryId: '22',
                tags: ['keep'],
                defaultLanguage: 'ko',
              },
              localizations: {
                ja: { title: '既存', description: '既存説明' },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 'v1',
          snippet: {
            title: '원문 수정',
            description: '설명 수정',
            categoryId: '22',
            tags: ['keep'],
            defaultLanguage: 'ko',
          },
          localizations: {
            ja: { title: '既存', description: '既存説明' },
            en: { title: 'Updated', description: 'Updated description' },
          },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateVideoLocalizations({
      accessToken: 'token',
      videoId: 'v1',
      sourceLang: 'ko',
      title: '원문 수정',
      description: '설명 수정',
      localizations: {
        en: { title: 'Updated', description: 'Updated description' },
      },
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const updateBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(updateBody).toMatchObject({
      id: 'v1',
      snippet: {
        title: '원문 수정',
        description: '설명 수정',
        categoryId: '22',
        tags: ['keep'],
        defaultLanguage: 'ko',
      },
      localizations: {
        ja: { title: '既存', description: '既存説明' },
        en: { title: 'Updated', description: 'Updated description' },
      },
    })
    expect(result.localizations.en.title).toBe('Updated')
  })

  it('keeps the selected source language in the default snippet and omits it from localizations', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: 'v1',
              snippet: {
                title: 'English title',
                description: 'English description',
                categoryId: '22',
                defaultLanguage: 'en',
              },
              localizations: {
                ko: { title: 'Korean title', description: 'Korean description' },
                ja: { title: 'Japanese title', description: 'Japanese description' },
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 'v1',
          snippet: {
            title: 'Korean title',
            description: 'Korean description',
            categoryId: '22',
            defaultLanguage: 'ko',
          },
          localizations: {
            en: { title: 'English title', description: 'English description' },
            ja: { title: 'Japanese title', description: 'Japanese description' },
          },
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await updateVideoLocalizations({
      accessToken: 'token',
      videoId: 'v1',
      sourceLang: 'ko',
      title: 'Korean title',
      description: 'Korean description',
      localizations: {
        ko: { title: 'Korean title', description: 'Korean description' },
        en: { title: 'English title', description: 'English description' },
      },
    })

    const updateBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(updateBody.snippet.defaultLanguage).toBe('ko')
    expect(updateBody.snippet.title).toBe('Korean title')
    expect(updateBody.localizations.ko).toBeUndefined()
    expect(updateBody.localizations.en.title).toBe('English title')
  })

  it('updates tags when provided', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          items: [
            {
              id: 'v1',
              snippet: {
                title: '원문',
                description: '설명',
                categoryId: '22',
                tags: ['keep'],
                defaultLanguage: 'ko',
              },
              localizations: {},
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          id: 'v1',
          snippet: {
            title: '원문',
            description: '설명',
            categoryId: '22',
            tags: ['keep', 'Dubtube'],
            defaultLanguage: 'ko',
          },
          localizations: {},
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    const result = await updateVideoLocalizations({
      accessToken: 'token',
      videoId: 'v1',
      sourceLang: 'ko',
      title: '원문',
      description: '설명',
      tags: ['keep', 'Dubtube'],
      localizations: {},
    })

    const updateBody = JSON.parse(fetchMock.mock.calls[1][1].body as string)
    expect(updateBody.snippet.tags).toEqual(['keep', 'Dubtube'])
    expect(result.tags).toEqual(['keep', 'Dubtube'])
  })
})
