import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

// Password hashing with Argon2id (CLAUDE.md §16), using Node's built-in
// implementation (Node 24.7+). Hashes are stored in the standard PHC string
// format, so the parameters travel with each hash and can be raised later
// without invalidating existing ones. Plaintext is never logged or stored.

// RFC 9106's second recommended option: 64 MiB, 3 passes, 4 lanes.
const PARAMETERS = { memory: 65536, passes: 3, parallelism: 4, tagLength: 32 } as const;
const SALT_BYTES = 16;

type Parameters = { memory: number; passes: number; parallelism: number; tagLength: number };

function derive(password: string, salt: Buffer, parameters: Parameters): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    argon2(
      "argon2id",
      { message: Buffer.from(password, "utf8"), nonce: salt, ...parameters },
      (error, key) => (error ? reject(error) : resolve(key)),
    ),
  );
}

const b64 = (value: Buffer) => value.toString("base64").replace(/=+$/, "");

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await derive(password, salt, PARAMETERS);
  const { memory, passes, parallelism } = PARAMETERS;
  return `$argon2id$v=19$m=${memory},t=${passes},p=${parallelism}$${b64(salt)}$${b64(key)}`;
}

const PHC = /^\$argon2id\$v=19\$m=(\d{1,7}),t=(\d{1,3}),p=(\d{1,3})\$([A-Za-z0-9+/]{16,})\$([A-Za-z0-9+/]{16,})$/;

// False for a wrong password and for anything that is not an Argon2id hash.
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const match = PHC.exec(stored);
  if (!match) return false;
  const [, memory, passes, parallelism, salt, hash] = match;
  const expected = Buffer.from(hash, "base64");
  const key = await derive(password, Buffer.from(salt, "base64"), {
    memory: Number(memory),
    passes: Number(passes),
    parallelism: Number(parallelism),
    tagLength: expected.length,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Spends the same work as a real verification, for an unknown account, so
// response time does not reveal whether an email is registered.
let dummy: Promise<string> | undefined;
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummy ??= hashPassword(randomBytes(24).toString("base64"));
  await verifyPassword(password, await dummy);
  return false;
}
