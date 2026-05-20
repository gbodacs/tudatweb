import dotenv from 'dotenv'
import express from 'express'
import path from 'path'
import fs from 'fs'
import validator from 'validator'
import {
  createI18nContext,
  DEFAULT_LANGUAGE,
  getLanguageCookieHeader,
  type Language,
} from './i18n'
import { isAIStreamRequested, toAIProxy, toAIProxyStream } from './aiproxy'
import { chatApiCors, webCors } from './cors'
import { chatRateLimiters, webRateLimiters } from './ratelimiter'

dotenv.config()

const app = express()
const port = 8080

const trustProxy = process.env.TRUST_PROXY ?? 'loopback'
const baseUrl = (process.env.PUBLIC_BASE_URL ?? 'https://tudatai.hu').replace(
  /\/+$/,
  ''
)

const localeByLanguage: Record<Language, string> = {
  hu: 'hu_HU',
  en: 'en_US',
  de: 'de_DE',
}

function getLocalizedPath(routePath: string, language: Language): string {
  const [pathname, search = ''] = routePath.split('?')
  const params = new URLSearchParams(search)

  if (language === DEFAULT_LANGUAGE) {
    params.delete('lang')
  } else {
    params.set('lang', language)
  }

  const query = params.toString()

  return query ? `${pathname}?${query}` : pathname
}

function getAbsoluteUrl(routePath: string): string {
  if (/^https?:\/\//i.test(routePath)) {
    return routePath
  }

  return `${baseUrl}${routePath.startsWith('/') ? routePath : `/${routePath}`}`
}

app.set('trust proxy', trustProxy)

// Set EJS as the template engine
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, '../views'))

// Middleware for i18n
app.use((req: any, res: any, next: any) => {
  const i18n = createI18nContext(req)

  // Persist user language choice when it comes from query (?lang=...)
  const queryLang =
    typeof req.query?.lang === 'string' ? req.query.lang : undefined
  if (queryLang && queryLang === i18n.language) {
    res.setHeader('Set-Cookie', getLanguageCookieHeader(i18n.language))
  }

  req.i18n = i18n
  res.locals.i18n = i18n
  res.locals.t = i18n.t
  res.locals.language = i18n.language
  res.locals.availableLanguages = i18n.availableLanguages
  res.locals.localizePath = (routePath: string, targetLanguage?: Language) =>
    getLocalizedPath(routePath, targetLanguage ?? i18n.language)
  next()
})

function renderSEO(
  res: express.Response,
  view: string,
  req: any,
  titleKey: string,
  descriptionKey: string,
  currentPath: string,
  extra: Record<string, unknown> = {}
) {
  const t = (req as any).i18n.t
  const title = t(titleKey)
  const description = t(descriptionKey)
  const language = (req as any).i18n.language as Language
  const availableLanguages = (req as any).i18n.availableLanguages as Language[]
  const canonicalUrl = getAbsoluteUrl(getLocalizedPath(currentPath, language))
  const alternateUrls = availableLanguages.map((alternateLanguage) => ({
    hrefLang: alternateLanguage,
    href: getAbsoluteUrl(getLocalizedPath(currentPath, alternateLanguage)),
  }))
  const structuredData = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'TudatAI',
      url: baseUrl,
      logo: getAbsoluteUrl('/apple-touch-icon.png'),
      email: 'tudatai@protonmail.com',
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'TudatAI',
      url: baseUrl,
      inLanguage: availableLanguages,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonicalUrl,
      inLanguage: language,
      isPartOf: {
        '@type': 'WebSite',
        name: 'TudatAI',
        url: baseUrl,
      },
    },
  ]

  res.render(view, {
    title,
    description,
    canonicalUrl,
    alternateUrls,
    xDefaultUrl: getAbsoluteUrl(currentPath),
    robots: 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1',
    siteName: 'TudatAI',
    ogTitle: title,
    ogDescription: description,
    ogType: 'website',
    ogUrl: canonicalUrl,
    ogImage: getAbsoluteUrl('/images/og-image.png'),
    ogImageAlt: `${title} - TudatAI`,
    ogLocale: localeByLanguage[language],
    ogLocaleAlternates: alternateUrls
      .filter(({ hrefLang }) => hrefLang !== language)
      .map(({ hrefLang }) => localeByLanguage[hrefLang]),
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: getAbsoluteUrl('/images/og-image.png'),
    structuredData,
    currentPath,
    ...extra,
  })
}

//----------------------
// Serve static files (CSS, images, etc.)
//----------------------
app.use(express.static(path.join(__dirname, '../public')))

app.use(...webRateLimiters)
app.use('/chatapi', ...chatRateLimiters)

//----------------------
// Middleware for parsing form data
//----------------------
app.use(express.urlencoded({ extended: true }))
app.use(express.json())

//----------------------
// Routes
//----------------------
app.get('/', (req, res) => {
  renderSEO(res, 'index', req, 'home.title', 'home.metaDescription', req.path)
})

app.get('/about', (req, res) => {
  renderSEO(res, 'about', req, 'about.title', 'about.metaDescription', req.path)
})

app.get('/contact', (req, res) => {
  const success = req.query.success === '1'
  const error = req.query.error
  renderSEO(
    res,
    'contact',
    req,
    'contact.title',
    'contact.metaDescription',
    req.path,
    { success, error }
  )
})

app.options('/chatapi/tudatai', chatApiCors)
app.post('/chatapi/tudatai', chatApiCors, async (req, res) => {
  try {
    if (isAIStreamRequested(req.body)) {
      const abortController = new AbortController()
      const abortUpstream = () => {
        if (!abortController.signal.aborted) {
          abortController.abort()
        }
      }

      res.once('close', abortUpstream)

      try {
        const proxyResponse = await toAIProxyStream(req.body, {
          signal: abortController.signal,
        })

        res.status(proxyResponse.status)
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
        res.setHeader('Cache-Control', 'no-cache, no-transform')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('X-Accel-Buffering', 'no')
        res.flushHeaders()

        if (!proxyResponse.body) {
          res.end()
          return
        }

        const reader = proxyResponse.body.getReader()

        while (true) {
          const { done, value } = await reader.read()

          if (done) {
            break
          }

          res.write(value)
        }

        res.end()
      } finally {
        res.off('close', abortUpstream)
      }

      return
    }

    const proxyResponse = await toAIProxy(req.body)
    res.json(proxyResponse)
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.name === 'AbortError' &&
      res.headersSent
    ) {
      res.end()
      return
    }

    if (res.headersSent) {
      res.end()
      return
    }

    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      typeof error.status === 'number' &&
      'body' in error
    ) {
      return res.status(error.status).json(error.body)
    }

    if (error instanceof Error) {
      return res.status(500).json({
        error: {
          message: error.message,
        },
      })
    }

    return res.status(500).json({
      error: {
        message: 'An unknown error occurred.',
      },
    })
  }
})

app.options('/contact', webCors)
app.post('/contact', webCors, (req, res) => {
  const { name, email, message } = req.body
  const t = (req as any).i18n.t

  // Validation
  if (!validator.isEmail(email)) {
    return renderSEO(
      res,
      'contact',
      req,
      'contact.title',
      'contact.metaDescription',
      req.path,
      { success: false, error: t('contact.invalidEmailError') }
    )
  }
  if (message.length > 200) {
    return renderSEO(
      res,
      'contact',
      req,
      'contact.title',
      'contact.metaDescription',
      req.path,
      { success: false, error: t('contact.messageTooLongError') }
    )
  }

  // Sanitize inputs
  const sanitizedName = validator.escape(name)
  const sanitizedEmail = validator.escape(email)
  const sanitizedMessage = validator.escape(message)

  // Create filename with date and time
  const now = new Date()
  const filename = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}.txt`

  // Prepare content
  const content = `Dátum: ${now.toISOString()}\nNév: ${sanitizedName}\nEmail: ${sanitizedEmail}\nÜzenet: ${sanitizedMessage}\n`

  // Save to file
  fs.writeFile(
    path.join(__dirname, '../public/aafAs5V5qdq4y3xa', filename),
    content,
    (err) => {
      if (err) {
        console.error('Error saving file:', err)
        return renderSEO(
          res,
          'contact',
          req,
          'contact.title',
          'contact.metaDescription',
          req.path,
          { success: false, error: t('contact.saveError') }
        )
      }
      res.redirect('/contact?success=1')
    }
  )
})

app.get('/privacy', (req, res) => {
  renderSEO(
    res,
    'privacy',
    req,
    'privacy.title',
    'privacy.metaDescription',
    req.path
  )
})

app.get('/cookiepolicy', (req, res) => {
  renderSEO(
    res,
    'cookiepolicy',
    req,
    'cookiepolicy.title',
    'cookiepolicy.metaDescription',
    req.path
  )
})

app.get('/terms', (req, res) => {
  renderSEO(res, 'terms', req, 'terms.title', 'terms.metaDescription', req.path)
})

app.get('/automat-ai', (req, res) => {
  renderSEO(
    res,
    'automat-ai',
    req,
    'automatization.title',
    'automatization.metaDescription',
    req.path
  )
})

app.get('/solutions', (req, res) => {
  renderSEO(
    res,
    'solutions',
    req,
    'solutions.title',
    'solutions.metaDescription',
    req.path
  )
})

app.get('/blog', (req, res) => {
  renderSEO(res, 'blog', req, 'blog.title', 'blog.metaDescription', req.path)
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})
