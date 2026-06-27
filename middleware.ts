import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Mock JupyterLab Git extension endpoints to satisfy frontend checks without a backend
  const isGitApi =
    pathname.startsWith('/jupyterlite/git/') ||
    pathname.startsWith('/git/')

  if (isGitApi) {
    if (pathname.endsWith('/settings')) {
      return new NextResponse(
        JSON.stringify({
          frontendVersion: "0.4.0",
          gitVersion: "2.40.0",
          serverVersion: "0.4.0",
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )
    }

    return new NextResponse(
      JSON.stringify({
        code: 128,
        message: "fatal: not a git repository (or any of the parent directories)",
        path: "/",
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
  }

  // Check if it is a JupyterLite API request (either relative or prefixed)
  const isJupyterApi =
    pathname.startsWith('/jupyterlite/api/') ||
    pathname.startsWith('/jupyterlite/lab/api/') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/lab/api/')

  if (isJupyterApi) {
    // If it's a static content or translations request, let Next.js serve it from public folder if it exists
    if (
      pathname.startsWith('/jupyterlite/api/contents') ||
      pathname.startsWith('/jupyterlite/api/translations')
    ) {
      return NextResponse.next()
    }

    // Otherwise, immediately return a clean JSON 404 response to avoid serving HTML
    return new NextResponse('{}', {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/jupyterlite/api/:path*',
    '/jupyterlite/lab/api/:path*',
    '/api/:path*',
    '/lab/api/:path*',
    '/jupyterlite/git/:path*',
    '/git/:path*',
  ],
}
