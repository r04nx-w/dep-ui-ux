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
      // Proxy all workspaces API requests (sync, history, rollback, promote) to port 8000
      {
        source: '/workspaces/:path*',
        destination: 'http://localhost:8000/workspaces/:path*',
      },
      {
        source: '/api/workspaces/:path*',
        destination: 'http://localhost:8000/workspaces/:path*',
      },
      // Proxy JupyterHub requests to port 8001
      {
        source: '/jupyter/:path*',
        destination: 'http://localhost:8001/jupyter/:path*',
      },
    ]
  },
}

export default nextConfig


