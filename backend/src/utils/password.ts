import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const SALT_LENGTH = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const derivedKey = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}
