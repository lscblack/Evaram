/**
 * Transport encryption, browser side.
 *
 * Mirrors `server/app/core/crypto.py`: ephemeral ECDH on P-256, HKDF-SHA256 to
 * a 256-bit key, AES-GCM for every body. Runs on Web Crypto, so the symmetric
 * work is hardware-accelerated and costs well under a millisecond per payload.
 *
 * What this does: nothing readable crosses the wire, so the Network tab, proxy
 * logs and scrapers see only ciphertext.
 *
 * What it does not do: the page must decrypt in order to render, so a developer
 * with a breakpoint in this file can still reach plaintext. Treat it as a very
 * high bar against bulk extraction, not as a guarantee against the device owner.
 */

const CURVE = 'P-256'
const INFO = new TextEncoder().encode('evaramu-e2e-v1')
const NONCE_BYTES = 12

export interface SecureSession {
  sessionId: string
  key: CryptoKey
  expiresAt: number
}

/* ------------------------------------------------------------------ base64 */
function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  // Chunked so a large payload cannot blow the argument limit.
  for (let i = 0; i < view.length; i += 0x8000) {
    binary += String.fromCharCode(...view.subarray(i, i + 0x8000))
  }
  return btoa(binary)
}

/** Returns an ArrayBuffer — Web Crypto's BufferSource will not take a
 *  `Uint8Array<ArrayBufferLike>`, which is what a plain view widens to. */
function fromBase64(value: string): ArrayBuffer {
  const binary = atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out.buffer
}

/* ------------------------------------------------------------------ handshake */

/** Generates the ephemeral pair and returns the public point for the server. */
export async function createKeyPair(): Promise<{ pair: CryptoKeyPair; publicKey: string }> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: CURVE },
    false, // non-extractable private key
    ['deriveBits'],
  )
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey)
  return { pair, publicKey: toBase64(raw) }
}

/** ECDH → HKDF → AES-GCM key. Must match the server's derivation exactly. */
export async function deriveSessionKey(
  pair: CryptoKeyPair,
  serverPublicKeyB64: string,
  saltB64: string,
): Promise<CryptoKey> {
  const serverPublic = await crypto.subtle.importKey(
    'raw',
    fromBase64(serverPublicKeyB64),
    { name: 'ECDH', namedCurve: CURVE },
    false,
    [],
  )

  const sharedBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: serverPublic },
    pair.privateKey,
    256,
  )

  const hkdfKey = await crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey'])

  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: fromBase64(saltB64), info: INFO },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false, // the session key itself is never extractable
    ['encrypt', 'decrypt'],
  )
}

/* ------------------------------------------------------------------ payloads */

/** `base64(nonce || ciphertext || tag)` */
export async function seal(key: CryptoKey, plaintext: string): Promise<string> {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_BYTES))
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce.buffer },
    key,
    new TextEncoder().encode(plaintext).buffer,
  )
  const combined = new Uint8Array(NONCE_BYTES + ciphertext.byteLength)
  combined.set(nonce, 0)
  combined.set(new Uint8Array(ciphertext), NONCE_BYTES)
  return toBase64(combined)
}

export async function unseal(key: CryptoKey, payload: string): Promise<string> {
  const raw = new Uint8Array(fromBase64(payload))
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, NONCE_BYTES).buffer },
    key,
    raw.slice(NONCE_BYTES).buffer,
  )
  return new TextDecoder().decode(plaintext)
}

/** Web Crypto needs a secure context — https, localhost or 127.0.0.1. */
export const isCryptoAvailable =
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'
