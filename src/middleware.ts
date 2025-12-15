import { NextRequest, NextResponse } from "next/server"
import { UserRole } from "@prisma/client"
import { verifySessionToken } from "@/lib/auth/session"

type RouteRule = { prefix: string; roles: UserRole[]; type: "page" | "api" }

const routeRules: RouteRule[] = [
  { prefix: "/admin", roles: [UserRole.ADMIN], type: "page" },
  { prefix: "/courier", roles: [UserRole.COURIER], type: "page" },
  { prefix: "/ops", roles: [UserRole.ADMIN, UserRole.STAFF], type: "page" },
  { prefix: "/api/admin", roles: [UserRole.ADMIN], type: "api" },
  { prefix: "/api/courier", roles: [UserRole.COURIER], type: "api" },
  { prefix: "/api/ops", roles: [UserRole.ADMIN, UserRole.STAFF], type: "api" },
]

function matchRule(pathname: string) {
  return routeRules.find((rule) => pathname.startsWith(rule.prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const rule = matchRule(pathname)
  if (!rule) {
    return NextResponse.next()
  }

  const token = request.cookies.get('oysters_session')?.value
  const session = await verifySessionToken(token)

  if (!session || !rule.roles.includes(session.role)) {
    if (rule.type === "api") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/courier/:path*',
    '/ops/:path*',
    '/api/admin/:path*',
    '/api/courier/:path*',
    '/api/ops/:path*',
  ],
}
