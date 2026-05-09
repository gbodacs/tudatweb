import express from 'express'
import { rateLimit } from 'express-rate-limit'

type RateLimitPolicy = {
  identifier: string
  windowMs: number
  limit: number
  skip?: (req: express.Request) => boolean
}

function getPositiveEnvNumber(name: string, fallback: number): number {
  const rawValue = process.env[name]
  if (!rawValue) {
    return fallback
  }

  const parsedValue = Number.parseInt(rawValue, 10)
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    console.warn(`Ignoring invalid ${name} value: ${rawValue}`)
    return fallback
  }

  return parsedValue
}

function createRateLimiters(
  policies: RateLimitPolicy[]
): express.RequestHandler[] {
  return policies.map((policy) =>
    rateLimit({
      windowMs: policy.windowMs,
      limit: policy.limit,
      identifier: policy.identifier,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skip: (req) => policy.skip?.(req) ?? false,
      message: 'Too many requests, please try again later.',
      handler: (req, res, _next, options) => {
        const rateLimitInfo = (
          req as express.Request & { rateLimit?: { resetTime?: Date } }
        ).rateLimit
        const resetTime = rateLimitInfo?.resetTime
        const retryAfterSeconds = resetTime
          ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
          : undefined

        res.status(options.statusCode)
        if (req.originalUrl.startsWith('/chatapi/')) {
          return res.json({
            error: options.message,
            retryAfterSeconds,
            policy: policy.identifier,
          })
        }

        return res.type('text/plain').send(options.message)
      },
    })
  )
}

export const webRateLimiters = createRateLimiters([
  {
    identifier: 'web-20-second',
    windowMs: getPositiveEnvNumber(
      'WEB_RATE_LIMIT_PER_20_SECOND_WINDOW_MS',
      20_000
    ),
    limit: getPositiveEnvNumber('WEB_RATE_LIMIT_PER_20_SECOND_LIMIT', 20),
    skip: (req) => req.path.startsWith('/chatapi/'),
  },
  {
    identifier: 'web-1-hour',
    windowMs: getPositiveEnvNumber(
      'WEB_RATE_LIMIT_PER_HOUR_WINDOW_MS',
      60 * 60 * 1_000
    ),
    limit: getPositiveEnvNumber('WEB_RATE_LIMIT_PER_HOUR_LIMIT', 200),
    skip: (req) => req.path.startsWith('/chatapi/'),
  },
])

export const chatRateLimiters = createRateLimiters([
  {
    identifier: 'chatapi-10-seconds',
    windowMs: getPositiveEnvNumber(
      'CHATAPI_RATE_LIMIT_PER_15_SECONDS_WINDOW_MS',
      15_000
    ),
    limit: getPositiveEnvNumber('CHATAPI_RATE_LIMIT_PER_15_SECONDS_LIMIT', 5),
  },
  {
    identifier: 'chatapi-1-hour',
    windowMs: getPositiveEnvNumber(
      'CHATAPI_RATE_LIMIT_PER_HOUR_WINDOW_MS',
      60 * 60 * 1_000
    ),
    limit: getPositiveEnvNumber('CHATAPI_RATE_LIMIT_PER_HOUR_LIMIT', 50),
  },
  {
    identifier: 'chatapi-1-day',
    windowMs: getPositiveEnvNumber(
      'CHATAPI_RATE_LIMIT_PER_DAY_WINDOW_MS',
      24 * 60 * 60 * 1_000
    ),
    limit: getPositiveEnvNumber('CHATAPI_RATE_LIMIT_PER_DAY_LIMIT', 200),
  },
])
