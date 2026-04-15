import crypto from "crypto"

const ALGO = "aes-256-gcm"

function getKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY is not configured")
  }

  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be base64 for exactly 32 bytes")
  }

  return key
}

export function encryptValue(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`
}

export function decryptValue(payload: string): string {
  const key = getKey()
  const parts = payload.split(":")
  if (parts.length !== 3) {
    throw new Error("Encrypted payload format is invalid")
  }

  const [ivB64, tagB64, dataB64] = parts
  const iv = Buffer.from(ivB64, "base64")
  const tag = Buffer.from(tagB64, "base64")
  const data = Buffer.from(dataB64, "base64")

  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([decipher.update(data), decipher.final()])
  return decrypted.toString("utf8")
}