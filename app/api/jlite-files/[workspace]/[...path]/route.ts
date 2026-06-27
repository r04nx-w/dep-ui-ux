import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'http://localhost:8000'

// GET /api/jlite-files/[workspace]/[...path]
// Serves static files directly from the FastAPI backend's JupyterLite workspace
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspace: string; path: string[] }> }
) {
  const resolvedParams = await params
  const workspaceId = resolvedParams.workspace
  const segments = resolvedParams.path || []
  const filePath = segments.join('/')

  try {
    const backendUrl = `${BACKEND}/jlite/contents/${workspaceId}/${filePath}?content=1`
    const res = await fetch(backendUrl)
    if (!res.ok) {
      return new NextResponse('File not found', { status: 404 })
    }

    const fileModel = await res.json()

    // JupyterLite file models contain base64 content for binary files,
    // or plain text for notebooks/text files.
    if (fileModel.format === 'base64') {
      const buf = Buffer.from(fileModel.content, 'base64')
      return new NextResponse(buf, {
        headers: {
          'Content-Type': fileModel.mimetype || 'application/octet-stream',
        },
      })
    } else if (fileModel.format === 'json' || fileModel.type === 'notebook') {
      const text = typeof fileModel.content === 'string'
        ? fileModel.content
        : JSON.stringify(fileModel.content, null, 2)
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      })
    } else {
      return new NextResponse(fileModel.content || '', {
        headers: {
          'Content-Type': fileModel.mimetype || 'text/plain; charset=utf-8',
        },
      })
    }
  } catch (e) {
    return new NextResponse('Backend unavailable', { status: 503 })
  }
}
