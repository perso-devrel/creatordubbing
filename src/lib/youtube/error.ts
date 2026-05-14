import 'server-only'

export class YouTubeError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'YOUTUBE_ERROR',
    public reason?: string,
  ) {
    super(message)
    this.name = 'YouTubeError'
  }
}
