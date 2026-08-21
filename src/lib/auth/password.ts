import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

/**
 * Native scrypt-based password hashing (Node's `crypto` module) instead of
 * the `bcrypt`/`bcryptjs` packages: scrypt is a memory-hard KDF built into
 * Node with no native bindings or extra dependency to vendor, and it is the
 * algorithm Node's own docs recommend for password storage.
 * Format persisted to `User.passwordHash`: "<hexSalt>:<hexDerivedKey>".
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  const [salt, hashHex] = storedHash.split(":");
  if (!salt || !hashHex) return false;

  const derivedKey = (await scrypt(plainPassword, salt, KEY_LENGTH)) as Buffer;
  const storedBuffer = Buffer.from(hashHex, "hex");

  if (storedBuffer.length !== derivedKey.length) return false;
  return timingSafeEqual(storedBuffer, derivedKey);
}
