import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

/*
 * Hash de senha com scrypt (memória-intensivo, nativo do Node, sem dependência externa).
 * Formato armazenado: scrypt$N$r$p$salt$hash (base64url) — permite subir o custo no futuro.
 */
const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;

function scrypt(password: string, salt: Buffer, keylen: number, opts: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) =>
    scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const cost = Number(n);
  const key = await scrypt(password.normalize("NFKC"), Buffer.from(saltB64, "base64url"), expected.length, {
    N: cost,
    r: Number(r),
    p: Number(p),
    maxmem: 128 * cost * Number(r) * 2,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash fixo usado para equalizar o tempo de resposta quando o e-mail não existe. */
export const DUMMY_HASH =
  "scrypt$32768$8$1$c2FsdC1maXhvLWRlLWRlbW8$" + "A".repeat(86);

export const PASSWORD_RULES = "Mínimo de 10 caracteres, com letras e números.";

export function passwordIsStrong(pw: string) {
  return pw.length >= 10 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);
}
