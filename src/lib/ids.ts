import { randomBytes, randomUUID } from "node:crypto";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Random base62 string. 22 characters ≈ 131 bits — impossible to guess. */
export function randomToken(length = 22): string {
  const bytes = randomBytes(length * 2);
  let out = "";
  for (let i = 0; i < bytes.length && out.length < length; i++) {
    // Reject values that would bias the distribution (248 = 62 * 4).
    if (bytes[i] < 248) out += ALPHABET[bytes[i] % 62];
  }
  return out.length === length ? out : randomToken(length);
}

export function newId(): string {
  return randomUUID();
}
