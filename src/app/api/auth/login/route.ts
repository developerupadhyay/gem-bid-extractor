import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME || "admin";
    const expectedPass = process.env.ADMIN_PASSWORD;

    if (!expectedPass) {
      return NextResponse.json(
        { error: "ADMIN_PASSWORD is not configured in server environment." },
        { status: 500 }
      );
    }

    if (username !== expectedUser || password !== expectedPass) {
      // Simulate delay to prevent brute-force timing attacks
      await new Promise((resolve) => setTimeout(resolve, 600));
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }

    const authSecret = process.env.AUTH_SECRET || `${expectedPass}_secret_signing_key_32bytes`;
    const token = await createSessionToken(username, authSecret);

    const response = NextResponse.json({ success: true });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: unknown) {
    const error = err as Error;
    return NextResponse.json(
      { error: error.message || "Authentication failed." },
      { status: 500 }
    );
  }
}
