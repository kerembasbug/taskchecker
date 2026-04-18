import { SignJWT, jwtVerify } from "jose";

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