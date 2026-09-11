import { NextRequest, NextResponse } from "next/server";

function createContentSecurityPolicy(nonce: string) {
  const scriptSources = [`'nonce-${nonce}'`, "'strict-dynamic'"];

  // Next.js uses eval-based source maps and module tooling in development.
  // Keep production strict while allowing the local client bundle to hydrate.
  if (process.env.NODE_ENV !== "production") {
    scriptSources.push("'unsafe-eval'");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    `script-src ${scriptSources.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "media-src 'self' blob:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|brand|favicon.ico).*)",
};
