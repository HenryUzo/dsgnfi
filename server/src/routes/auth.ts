import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";

import { prisma } from "../db/prisma";
import { env } from "../config/env";

const router = Router();

// If this 404s, /auth is not mounted or server didn't reload
router.get("/ping", (_req, res) => {
  res.json({ ok: true, route: "/auth/ping" });
});

/** Minimal HS256 JWT (no extra dependency) */
function base64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHS256(data: string, secret: string) {
  return base64url(crypto.createHmac("sha256", secret).update(data).digest());
}

function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number) {
  const header = { alg: "HS256", typ: "JWT" };
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresInSeconds;

  const fullPayload = { ...payload, iat, exp };

  const headerPart = base64url(JSON.stringify(header));
  const payloadPart = base64url(JSON.stringify(fullPayload));
  const data = `${headerPart}.${payloadPart}`;
  const sig = signHS256(data, secret);

  return `${data}.${sig}`;
}

function verifyJwt(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [h, p, s] = parts;
  const data = `${h}.${p}`;
  const expected = signHS256(data, secret);

  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;

  const payloadJson = Buffer.from(p.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const payload = JSON.parse(payloadJson) as { exp?: number; [k: string]: unknown };

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && now > payload.exp) return null;

  return payload;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.flatten() });
  }

  const { email, password } = parsed.data;

  const user = await prisma.adminUser.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ ok: false, error: { message: "Invalid credentials" } });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ ok: false, error: { message: "Invalid credentials" } });

  const token = signJwt({ id: user.id, email: user.email }, env.JWT_SECRET, 7 * 24 * 60 * 60);

  res.cookie("cms_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
  });

  return res.json({ ok: true });
});

router.get("/me", (req, res) => {
  const token = req.cookies?.cms_token;
  if (!token) return res.status(401).json({ ok: false, error: { message: "Not authenticated" } });

  const decoded = verifyJwt(token, env.JWT_SECRET);
  if (!decoded || typeof decoded.id !== "string" || typeof decoded.email !== "string") {
    return res.status(401).json({ ok: false, error: { message: "Not authenticated" } });
  }

  return res.json({ ok: true, id: decoded.id, email: decoded.email });
});

router.post("/logout", (_req, res) => {
  res.clearCookie("cms_token", { path: "/" });
  return res.json({ ok: true });
});

export default router;