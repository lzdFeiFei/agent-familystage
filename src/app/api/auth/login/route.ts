import { NextResponse } from "next/server";
import { buildOAuthAuthorizeUrl } from "@/lib/secondme";
import { createOAuthState, setOAuthState } from "@/lib/session";

export async function GET() {
  const state = createOAuthState();
  await setOAuthState(state);
  const authorizeUrl = buildOAuthAuthorizeUrl(state);
  return NextResponse.redirect(authorizeUrl);
}
