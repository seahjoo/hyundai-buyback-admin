import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authenticateUser,
  createSessionToken,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  const body = (await request.json()) as { username?: string; password?: string };
  const user = authenticateUser(body.username ?? "", body.password ?? "");

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 },
    );
  }

  const token = await createSessionToken({
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return response;
}
