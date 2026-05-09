import express from 'express'

type CorsPolicy = {
  allowedOrigins: Set<string>
  allowMethods: string
}

function parseAllowedOrigins(name: string, fallback: string): Set<string> {
  return new Set(
    (process.env[name] ?? fallback)
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
  )
}

const defaultCorsAllowedOrigins =
  process.env.CORS_ALLOWED_ORIGINS ??
  'http://localhost:8000,http://localhost:8080'

const chatApiCorsPolicy: CorsPolicy = {
  allowedOrigins: parseAllowedOrigins(
    'CHATAPI_CORS_ALLOWED_ORIGINS',
    defaultCorsAllowedOrigins
  ),
  allowMethods: 'POST,OPTIONS',
}

const webCorsPolicy: CorsPolicy = {
  allowedOrigins: parseAllowedOrigins(
    'WEB_CORS_ALLOWED_ORIGINS',
    defaultCorsAllowedOrigins
  ),
  allowMethods: 'POST,OPTIONS',
}

function getAllowedCorsOrigin(
  req: express.Request,
  allowedOrigins: Set<string>
): string | undefined {
  const requestOrigin = req.get('Origin')

  if (!requestOrigin) {
    return undefined
  }

  return allowedOrigins.has(requestOrigin) ? requestOrigin : undefined
}

function createCorsMiddleware(policy: CorsPolicy): express.RequestHandler {
  return (req, res, next) => {
    const allowedOrigin = getAllowedCorsOrigin(req, policy.allowedOrigins)

    if (allowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
      res.setHeader('Access-Control-Allow-Methods', policy.allowMethods)

      const requestedHeaders = req.get('Access-Control-Request-Headers')
      if (requestedHeaders) {
        res.setHeader('Access-Control-Allow-Headers', requestedHeaders)
      }

      res.vary('Origin')
    }

    if (req.method === 'OPTIONS' && req.get('Origin')) {
      if (!allowedOrigin) {
        return res.sendStatus(403)
      }

      return res.sendStatus(204)
    }

    next()
  }
}

export const chatApiCors = createCorsMiddleware(chatApiCorsPolicy)
export const webCors = createCorsMiddleware(webCorsPolicy)
