import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchVideoMetadata, updateVideoLocalizations } from './metadata'

describe('youtube metadata', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches snippet and existing localizations', async () => {
    const fetchMock = vi.fn(async () =>
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
      localizations: {
        en: { title: 'Title', description: 'Description' },
      },
    })
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
})
