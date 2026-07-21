/** @type {import('next').NextConfig} */

// In Docker: NEXT_INTERNAL_API_URL=http://control-plane:8000
// In local dev: falls back to http://localhost:8000
const apiBase = process.env.NEXT_INTERNAL_API_URL || 'http://localhost:8000'
const hubBase = process.env.NEXT_INTERNAL_HUB_URL || 'http://localhost:8001'
const portainerBase = process.env.NEXT_INTERNAL_PORTAINER_URL || 'http://localhost:9002'

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return {
      beforeFiles: [
        // JupyterLite's server drive fetches: /jupyterlite/api/contents/{path}/all.json
        {
          source: '/jupyterlite/api/contents/:path*',
          destination: '/api/contents/:path*',
        },
        // JupyterLite fetches static files from /jupyterlite/files/{path}
        {
          source: '/jupyterlite/files/:workspace/:path+',
          destination: '/api/jlite-files/:workspace/:path+',
        },
        // Proxy all workspaces API requests to the control plane
        {
          source: '/workspaces/:path*',
          destination: `${apiBase}/workspaces/:path*`,
        },
        {
          source: '/api/workspaces/:path*',
          destination: `${apiBase}/workspaces/:path*`,
        },
        // Proxy JupyterHub requests
        {
          source: '/jupyter/:path*',
          destination: `${hubBase}/jupyter/:path*`,
        },
        // Proxy Portainer requests
        {
          source: '/portainer/:path*',
          destination: `${portainerBase}/:path*`,
        },
      ],
    }
  },
}

export default nextConfig
