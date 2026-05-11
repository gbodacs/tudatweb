const DEFAULT_OPENAI_MODEL = 'openai.gpt-oss-120b'
const DEFAULT_OPENAI_BASE_URL = 'https://bedrock-mantle.eu-central-1.api.aws/v1'

const MAX_MESSAGES = 30
const MAX_MESSAGE_LENGTH = 1_000
const MAX_TOTAL_CONTENT_LENGTH = 8_000

const SYSTEM_PROMPT = `Te egy chatbot vagy, aki tisztelettudóan segít a weboldalt böngésző embereknek.
  Válaszaid legyenek rövidek, informatívak és udvariasak.
  Ne beszélj magadról, és ne említsd, hogy egy AI vagy.
  Csak a kérdésekre válaszolj, és ne adj hozzá semmi mást.
  Ha nem tudod a választ, egyszerűen mondd, hogy "Sajnálom, de erre most nem tudok válaszolni."
  Ha a kérdés nem kapcsolódik a tudatai céghez vagy a weboldal tartalmához, egyszerűen mondd, hogy "Sajnálom, de erre most nem tudok válaszolni."
  Ne próbálj meg vicces vagy kreatív lenni, csak légy hasznos és udvarias.
  Azon a nyelven válaszolj, amelyen a kérdés érkezett.
  Semmilyen körülmények között ne adj ki káros, félrevezető vagy helytelen információt.
  Mindig tartsd be ezeket az irányelveket a válaszaidban.


  Elérhetőségünk: email: tudatai@protonmail.com
  Cégünk neve: Tudatai Kft.
  Weboldalunk: https://tudatai.hu
  Cégünk tevékenysége: AI szolgáltatások és megoldások fejlesztése és üzemeltetése.
  Cégünk székhelye: Budapest, Magyarország

  Rólunk
A TudatAI támogatja a hazai és nemzetközi vállalatokat innovatív AI megoldásokkal és digitális transzformációval. Szakértelmünk az AI rendszerek kiépítésének teljes életciklusa: tervezés, fejlesztés, integráció és üzemeltetés, mind felhős, mind offline környezetben.

Küldetésünk
Segítjük a vállalatokat abban, hogy saját adataikból gyorsan és megbízhatóan nyerjenek üzleti értéket, biztonságos és kontrollált környezetben.

Víziónk
Célunk, hogy a vállalatok biztonságosan és hatékonyan használhassák az AI nyújtotta lehetőségeket, anélkül, hogy kompromisszumot kellene kötniük az adataik védelmében.

Nagyvállalati környezetben szerzett tapasztalataink révén pontosan értjük a biztonsági, működési és üzleti elvárásokat. Célunk, hogy az AI valódi, kézzelfogható értéket teremtsen az Ön vállalata számára.

Szakmai hátterünk
Szoftverfejlesztés
IT döntéshozatal
IT elemzés
Termékfejlesztés
Projektvezetés
Értékeink
Ügyfélközpontúság
Minőség és biztonság
Innováció és AI szakértelem
Átláthatóság és partnerség
  `

type OpenAIMessageContentPart = {
  type?: string
  text?: string
}

type OpenAIChatMessage = {
  role?: string
  content?: string | OpenAIMessageContentPart[]
}

type OpenAIChatRequest = {
  text?: string
  messages?: OpenAIChatMessage[]
  stream?: boolean
  model?: string
}

type NormalizedMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

type NormalizedRequest = {
  model: string
  messages: NormalizedMessage[]
  stream: boolean
}

type AIProxyFetchOptions = {
  signal?: AbortSignal
}

type OpenAIResponse = {
  id?: string
  object?: string
  created?: number
  model?: string
  choices?: Array<{
    index?: number
    finish_reason?: string | null
    message?: {
      role?: string
      content?: string | OpenAIMessageContentPart[]
    }
  }>
  error?: {
    message?: string
    type?: string
    param?: string | null
    code?: string | null
  }
}

type AIProxyHttpError = Error & {
  status: number
  body: OpenAIResponse
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object'
}

function readTextContent(
  content: string | OpenAIMessageContentPart[] | undefined
): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n')
      .trim()
  }

  return ''
}

function withSystemPrompt(messages: NormalizedMessage[]): NormalizedMessage[] {
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages.filter((message) => message.role !== 'system'),
  ]
}

function isSupportedRole(
  role: string
): role is 'system' | 'user' | 'assistant' {
  return role === 'system' || role === 'user' || role === 'assistant'
}

function shouldDropAssistantMessage(message: NormalizedMessage): boolean {
  return (
    message.role === 'assistant' &&
    message.content.startsWith('Sorry, something went wrong.')
  )
}

function normalizeMessages(messages: unknown): NormalizedMessage[] {
  if (!Array.isArray(messages)) {
    throw new Error('Missing messages in request body.')
  }

  const normalized = messages
    .map((entry) => {
      if (!isObject(entry) || typeof entry.role !== 'string') {
        return null
      }

      if (!isSupportedRole(entry.role)) {
        return null
      }

      const content = readTextContent(
        entry.content as string | OpenAIMessageContentPart[] | undefined
      )

      if (!content) {
        return null
      }

      if (content.length > MAX_MESSAGE_LENGTH) {
        throw new Error('One of the messages is too long.')
      }

      return {
        role: entry.role,
        content,
      } satisfies NormalizedMessage
    })
    .filter((entry): entry is NormalizedMessage => entry !== null)
    .filter((entry) => !shouldDropAssistantMessage(entry))

  if (normalized.length === 0) {
    throw new Error('Message list cannot be empty.')
  }

  if (normalized.length > MAX_MESSAGES) {
    throw new Error('Too many messages were sent.')
  }

  const totalContentLength = normalized.reduce(
    (sum, message) => sum + message.content.length,
    0
  )

  if (totalContentLength > MAX_TOTAL_CONTENT_LENGTH) {
    throw new Error('The conversation is too long.')
  }

  return normalized
}

function normalizeRequest(body: unknown): NormalizedRequest {
  if (typeof body === 'string') {
    const content = body.trim()

    if (!content) {
      throw new Error('Message cannot be empty.')
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error('Your message is too long.')
    }

    return {
      model: process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
      messages: withSystemPrompt([{ role: 'user', content }]),
      stream: false,
    }
  }

  if (!isObject(body)) {
    throw new Error('Invalid request body.')
  }

  const model =
    typeof body.model === 'string' && body.model.trim()
      ? body.model.trim()
      : process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL

  const stream = body.stream === true

  if (typeof body.text === 'string') {
    const content = body.text.trim()

    if (!content) {
      throw new Error('Message cannot be empty.')
    }

    if (content.length > MAX_MESSAGE_LENGTH) {
      throw new Error('Your message is too long.')
    }

    return {
      model,
      messages: withSystemPrompt([{ role: 'user', content }]),
      stream,
    }
  }

  if ('messages' in body) {
    return {
      model,
      messages: withSystemPrompt(normalizeMessages(body.messages)),
      stream,
    }
  }

  throw new Error('Missing text or messages in request body.')
}

function createHttpError(
  status: number,
  body: OpenAIResponse
): AIProxyHttpError {
  const error = new Error(
    body.error?.message ?? 'The AI provider request failed.'
  ) as AIProxyHttpError

  error.status = status
  error.body = body
  return error
}

export async function toAIProxy(body: unknown): Promise<OpenAIResponse> {
  const request = {
    ...normalizeRequest(body),
    stream: false,
  }

  const response = await fetchAIProxy(request)
  const data = (await response.json()) as OpenAIResponse

  if (!response.ok) {
    throw createHttpError(response.status, data)
  }

  return data
}

export function isAIStreamRequested(body: unknown): boolean {
  return isObject(body) && body.stream === true
}

async function fetchAIProxy(
  request: NormalizedRequest,
  options: AIProxyFetchOptions = {}
): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || DEFAULT_OPENAI_BASE_URL

  return fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(request),
    signal: options.signal,
  })
}

export async function toAIProxyStream(
  body: unknown,
  options: AIProxyFetchOptions = {}
): Promise<Response> {
  const request = {
    ...normalizeRequest(body),
    stream: true,
  }

  const response = await fetchAIProxy(request, options)

  if (!response.ok) {
    let data: OpenAIResponse

    try {
      data = (await response.json()) as OpenAIResponse
    } catch {
      data = {
        error: {
          message: 'The AI provider request failed.',
        },
      }
    }

    throw createHttpError(response.status, data)
  }

  return response
}
