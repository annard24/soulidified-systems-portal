// This file sets up a mock middleware for the preview
// The actual Clerk authentication is disabled for the preview

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // For the preview, we'll allow access to all routes without authentication
  return NextResponse.next();
}

export const config = {
  // Matcher for routes that would normally be protected
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
