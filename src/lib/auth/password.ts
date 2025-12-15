import bcrypt from "bcryptjs"

const DEFAULT_SALT_ROUNDS = 12

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, DEFAULT_SALT_ROUNDS)
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash)
}
