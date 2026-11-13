import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").split(":")[0];
  if (host === "efatalk.fyi") {
    const path = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    return NextResponse.redirect(`https://www.efatalk.fyi${path}`, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/|brand/|sw\\.js|manifest\\.webmanifest).*)"],
};
