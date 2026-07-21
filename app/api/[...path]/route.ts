import { NextRequest, NextResponse } from 'next/server'

const BACKEND = 'http://localhost:8000'

async function handleProxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname
  const search = req.nextUrl.search
  
  // Strip the leading "/api" from the pathname to match backend routing
  const relativePath = pathname.replace(/^\/api/, '')
  
  // Reconstruct backend URL with preserved path and search query
  const backendUrl = `${BACKEND}${relativePath}${search}`
  
  console.log(`[Proxy Request] ${req.method} ${pathname}${search} -> ${backendUrl}`)
  
  const headers = new Headers(req.headers)
  headers.delete('host')
  
  try {
    const body = req.method !== 'GET' && req.method !== 'HEAD' 
      ? await req.blob() 
      : undefined;
      
    const backendRes = await fetch(backendUrl, {
      method: req.method,
      headers,
      body,
      redirect: 'manual'
    })
    
    console.log(`[Proxy Response] ${backendUrl} -> Status: ${backendRes.status} ${backendRes.statusText}`)
    
    // Read the response body as arrayBuffer to handle both binary and text data
    const resBuffer = await backendRes.arrayBuffer()
    
    // Copy headers from backend response
    const resHeaders = new Headers(backendRes.headers)
    
    return new NextResponse(resBuffer, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders
    })
  } catch (err: any) {
    console.error('[API Proxy Error]:', err)
    return new NextResponse(JSON.stringify({ detail: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function GET(req: NextRequest) { return handleProxy(req) }
export async function POST(req: NextRequest) { return handleProxy(req) }
export async function PUT(req: NextRequest) { return handleProxy(req) }
export async function DELETE(req: NextRequest) { return handleProxy(req) }
export async function PATCH(req: NextRequest) { return handleProxy(req) }
export async function OPTIONS(req: NextRequest) { return handleProxy(req) }
export async function HEAD(req: NextRequest) { return handleProxy(req) }
