const DEFAULT_OPENAI_MODEL = 'openai.gpt-oss-120b'
const DEFAULT_OPENAI_BASE_URL = 'https://bedrock-mantle.eu-central-1.api.aws/v1'
const MAX_MESSAGE_LENGTH = 1_000

type OpenAIMessageContentPart = {
  type?: string
  text?: string
}

type OpenAIResponse = {
  error?: {
    message?: string
  }
  choices?: Array<{
    message?: {
      content?: string | OpenAIMessageContentPart[]
    }
  }>
}

function normalizePrompt(body: unknown): string {
  if (typeof body === 'string') {
    return body.trim()
  }

  if (
    body &&
    typeof body === 'object' &&
    'text' in body &&
    typeof body.text === 'string'
  ) {
    return body.text.trim()
  }

  throw new Error('Missing text in request body.')
}

function readAssistantText(response: OpenAIResponse): string {
  const content = response.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text?.trim() ?? '')
      .join('\n')
      .trim()
  }

  return ''
}

export async function toAIProxy(body: unknown): Promise<string> {
  const message = normalizePrompt(body)
  if (!message) {
    throw new Error('Message cannot be empty.')
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error('Your message is too long.')
  }

  const apiKey = process.env.OPENAI_API_KEY ?? 'apikey_here!!' // Placeholder to prevent empty string, will be caught by check below
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured.')
  }

  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL
  const baseUrl = process.env.OPENAI_BASE_URL ?? DEFAULT_OPENAI_BASE_URL
  const response = await fetch(
    `${baseUrl.replace(/\/$/, '')}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
        stream: false,
      }),
    }
  )

  const data = (await response.json()) as OpenAIResponse
  if (!response.ok) {
    throw new Error(data.error?.message ?? 'The AI provider request failed.')
  }

  const answer = readAssistantText(data)
  if (!answer) {
    throw new Error('The AI provider returned an empty response.')
  }

  return answer
}
