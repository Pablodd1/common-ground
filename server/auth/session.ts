import * as jose from "jose";
import * as cookie from "cookie";
import { env } from "../lib/env";
import { Session } from "@contracts/constants";
import { findUserByAuthId } from "../queries/users";
import type { User } from "@db/schema";

const JWT_ALG = "HS256";

export type SessionPayload = { authId: string };

export async function signSessionToken(
  payload: SessionPayload,
): Promise<string> {
  const secret = new TextEncoder().encode(env.appSecret);
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime("30 days")
    .sign(secret);
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(env.appSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: [JWT_ALG],
    });
    const { authId } = payload;
    if (typeof authId !== "string" || !authId) return null;
    return { authId };
  } catch {
    return null;
  }
}

export async function authenticateRequest(headers: Headers): Promise<User> {
  const cookies = cookie.parse(headers.get("cookie") || "");
  const token = cookies[Session.cookieName];
  if (!token) {
    throw new Error("No session cookie found in request.");
  }
  const claim = await verifySessionToken(token);
  if (!claim) {
    throw new Error("Invalid session token.");
  }
  const user = await findUserByAuthId(claim.authId);
  if (!user) {
    throw new Error("User not found. Please re-login.");
  }
  return user;
}

export { Session };
