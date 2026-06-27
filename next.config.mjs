/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      // JupyterLite's server drive fetches: /jupyterlite/api/contents/{path}/all.json
      // We rewrite this to our Next.js API route which prepends the workspace ID.
      // The workspace ID is injected by config-utils.js via the URL hash in contentsAllJsonUrl
      // pattern: /jupyterlite/api/contents/...path... → /api/contents/...path...
      {
        source: '/jupyterlite/api/contents/:path*',
        destination: '/api/contents/:path*',
      },
      // JupyterLite fetches static files from /jupyterlite/files/{path}
      // For workspace-scoped content, we serve from our backend
      {
        source: '/jupyterlite/files/:workspace/:path*',
        destination: '/api/jlite-files/:workspace/:path*',
      },
      // Proxy all workspaces sync calls from port 3000 to port 8000 (FastAPI backend)
      {
        source: '/workspaces/sync/:path*',
        destination: 'http://localhost:8000/workspaces/sync/:path*',
      },
      {
        source: '/workspaces/sync',
        destination: 'http://localhost:8000/workspaces/sync',
      },
    ]
  },
}

export default nextConfig


