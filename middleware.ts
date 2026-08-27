import { NextResponse, type NextRequest } from "next/server";
import { CONTROL_CENTER_RETURN_HEADER } from "@/lib/admin-return-url";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    CONTROL_CENTER_RETURN_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/admin/companies/:path*",
    "/admin/participants/:path*",
    "/admin/credits/:path*",
    "/admin/complimentary/:path*",
    "/admin/access-center/:path*",
  ],
};
