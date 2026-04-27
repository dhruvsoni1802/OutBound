import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw) throw new Error('ENCRYPTION_KEY environment variable is not set')
  return Buffer.from(raw, 'base64')
}

/**
 * Encrypts plaintext with AES-256-GCM.
 * Layout: iv (12 bytes) | authTag (16 bytes) | ciphertext — base64 encoded.
 * The Python agent's inbox/client.py decrypts using this same layout.
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, encrypted]).toString('base64')
}

export function decrypt(encoded: string): string {
  const key = getKey()
  const raw = Buffer.from(encoded, 'base64')
  const iv = raw.subarray(0, 12)
  const authTag = raw.subarray(12, 28)
  const ciphertext = raw.subarray(28)
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Generates the masked display preview from the raw key. e.g. `am-****8f3a` */
export function keyPreview(apiKey: string): string {
  return `am-****${apiKey.slice(-4)}`
}
