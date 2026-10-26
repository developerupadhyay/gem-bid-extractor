// Universal Web Crypto HMAC session signer (compatible with Node.js & Vercel Edge)

const SESSION_COOKIE_NAME = "auth_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBuffer(hex: string): ArrayBuffer {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

/**
 * Creates a signed session token: timestamp.signature
 */
export async function createSessionToken(username: string, secret: string): Promise<string> {
  const timestamp = Date.now().toString();
  const payload = `${username}:${timestamp}`;
  const enc = new TextEncoder();
  const key = await getCryptoKey(secret);
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const signatureHex = bufferToHex(signatureBuffer);
  return `${btoa(payload)}.${signatureHex}`;
}

/**
 * Verifies a session token
 */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  try {
    const [payloadB64, signatureHex] = token.split(".");
    if (!payloadB64 || !signatureHex) return false;

    const payload = atob(payloadB64);
    const [, timestampStr] = payload.split(":");
    const timestamp = parseInt(timestampStr, 10);

    // Check expiration (7 days)
    if (isNaN(timestamp) || Date.now() - timestamp > SESSION_MAX_AGE_SECONDS * 1000) {
      return false;
    }

    const enc = new TextEncoder();
    const key = await getCryptoKey(secret);
    const signatureBuffer = hexToBuffer(signatureHex);

    return await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBuffer,
      enc.encode(payload)
    );
  } catch {
    return false;
  }
}

export { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS };
