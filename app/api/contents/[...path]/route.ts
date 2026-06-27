import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'http://localhost:8000'

/**
 * JupyterLite's BrowserStorageDrive._getServerDirectory() fetches:
 *   GET /jupyterlite/api/contents/{path}/all.json?ws={workspaceId}
 *
 * Our Next.js rewrite maps /jupyterlite/api/contents/* → /api/contents/*
 * So we receive: GET /api/contents/{path}/all.json?ws={workspaceId}
 *
 * We extract ws from query param and path from the rest, then proxy to:
 *   GET http://localhost:8000/jlite/contents/{workspaceId}/{path}
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url)
  const ws = url.searchParams.get('ws') || 'default'
  const resolvedParams = await params
  const segments = resolvedParams.path || []

  // Strip trailing "all.json" from path segments
  const pathSegments = segments.filter(s => s !== 'all.json' && !s.startsWith('all.json?'))
  const filePath = pathSegments.join('/')
  const isAllJson = segments[segments.length - 1]?.startsWith('all.json')

  try {
    const backendUrl = filePath
      ? `${BACKEND}/jlite/contents/${ws}/${filePath}?content=1`
      : `${BACKEND}/jlite/contents/${ws}?content=1`

    const res = await fetch(backendUrl, { headers: { 'Content-Type': 'application/json' } })

    if (!res.ok) {
      // Return empty directory for missing paths — JupyterLite needs this for new workspaces
      return NextResponse.json({
        content: [],
        created: new Date().toISOString(),
        format: 'json',
        hash: null,
        hash_algorithm: null,
        last_modified: new Date().toISOString(),
        mimetype: null,
        name: pathSegments[pathSegments.length - 1] || '',
        path: filePath,
        size: null,
        type: 'directory',
        writable: true,
      })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e) {
    // Backend unavailable — return empty dir so JupyterLite can still boot
    return NextResponse.json({
      content: [],
      created: new Date().toISOString(),
      format: 'json',
      hash: null,
      hash_algorithm: null,
      last_modified: new Date().toISOString(),
      mimetype: null,
      name: '',
      path: filePath,
      size: null,
      type: 'directory',
      writable: true,
    })
  }
}

// PUT — save file content
export async function PUT(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url)
  const ws = url.searchParams.get('ws') || 'default'
  const resolvedParams = await params
  const segments = resolvedParams.path || []
  const filePath = segments.join('/')
  const body = await req.json()

  try {
    const backendUrl = filePath
      ? `${BACKEND}/jlite/contents/${ws}/${filePath}`
      : `${BACKEND}/jlite/contents/${ws}`
    const res = await fetch(backendUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 503 })
  }
}

// DELETE — delete file/dir
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url)
  const ws = url.searchParams.get('ws') || 'default'
  const resolvedParams = await params
  const filePath = (resolvedParams.path || []).join('/')

  try {
    const backendUrl = filePath
      ? `${BACKEND}/jlite/contents/${ws}/${filePath}`
      : `${BACKEND}/jlite/contents/${ws}`
    const res = await fetch(backendUrl, { method: 'DELETE' })
    if (res.status === 204) return new NextResponse(null, { status: 204 })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 503 })
  }
}

// PATCH — rename/move file
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const url = new URL(req.url)
  const ws = url.searchParams.get('ws') || 'default'
  const resolvedParams = await params
  const filePath = (resolvedParams.path || []).join('/')
  const body = await req.json()

  try {
    const backendUrl = filePath
      ? `${BACKEND}/jlite/contents/${ws}/${filePath}`
      : `${BACKEND}/jlite/contents/${ws}`
    const res = await fetch(backendUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (e) {
    return NextResponse.json({ message: 'Backend unavailable' }, { status: 503 })
  }
}
