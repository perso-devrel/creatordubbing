import type { Instrumentation } from 'next'

export const onRequestError: Instrumentation.onRequestError = async (
  err,
  request,
  context,
) => {
  const { logger } = await import('@/lib/logger')
  const e = err as Error & { digest?: string }
  logger.error('unhandled request error', {
    message: e.message,
    digest: e.digest,
    method: request.method,
    path: request.path,
    routePath: context.routePath,
    routeType: context.routeType,
  })
}
