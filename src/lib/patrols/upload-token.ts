import { createHmac, timingSafeEqual } from 'node:crypto'

const TOKEN_TTL_MS = 60 * 60_000

export type UploadTokenPayload = {
  userId: string
  expiresAt: number
}

function getSecret(): string | null {
  const secret = process.env.PATROL_UPLOAD_SECRET

  return secret && secret.length > 0 ? secret : null
}

function encode(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url')
}

export function isUploadTokenConfigured(): boolean {
  return getSecret() !== null
}

export function createUploadToken(
  userId: string,
  now = Date.now(),
): string | null {
  const secret = getSecret()

  if (!secret) {
    return null
  }

  const body = encode(JSON.stringify({ userId, expiresAt: now + TOKEN_TTL_MS }))

  return `${body}.${sign(body, secret)}`
}

export function readUploadToken(
  token: string,
  now = Date.now(),
): UploadTokenPayload | null {
  const secret = getSecret()

  if (!secret) {
    return null
  }

  const [body, signature] = token.split('.')

  if (!body || !signature) {
    return null
  }

  const expected = Buffer.from(sign(body, secret), 'utf8')
  const provided = Buffer.from(signature, 'utf8')

  if (
    expected.length !== provided.length ||
    !timingSafeEqual(expected, provided)
  ) {
    return null
  }

  let payload: unknown

  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload !== 'object' || payload === null) {
    return null
  }

  const { userId, expiresAt } = payload as Partial<UploadTokenPayload>

  if (typeof userId !== 'string' || typeof expiresAt !== 'number') {
    return null
  }

  if (expiresAt <= now) {
    return null
  }

  return { userId, expiresAt }
}
