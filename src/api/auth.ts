import { SignJWT, jwtVerify } from "jose";
import { Context, Next } from "hono";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "taskchecker-secret-change-me");
const PASSWORD = process.env.PASSWORD || "admin123";

export async function login(password: string): Promise<string | null> {
  if (password !== PASSWORD) return null;
  return await new SignJWT({ sub: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function authMiddleware(c: Context, next: Next) {
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  const token = auth.slice(7);
  try {
    await jwtVerify(token, JWT_SECRET);
    return next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}