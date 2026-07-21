'use client'

import { useState, useEffect } from 'react'
import { Activity, AlertCircle, RefreshCw } from 'lucide-react'

export function InfrastructureManager() {
  const [authenticating, setAuthenticating] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const authenticate = async () => {
    setAuthenticating(true)
    setError(null)
    try {
      const response = await fetch('/portainer/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'admin',
          password: 'depadminpassword123!',
        }),
      })

      if (!response.ok) {
        throw new Error(`Portainer auth failed with status ${response.status}`)
      }

      const data = await response.json()
      if (data && data.jwt) {
        localStorage.setItem('portainer.JWT', data.jwt)
      } else {
        throw new Error('No JWT token returned from Portainer auth')
      }
    } catch (err: any) {
      console.error('Error authenticating Portainer:', err)
      setError(err.message || 'Failed to authenticate with Portainer')
    } finally {
      setAuthenticating(false)
    }
  }

  useEffect(() => {
    authenticate()
  }, [])

  return (
    <div className="flex flex-col h-full w-full bg-background p-6 gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary animate-pulse" />
          <h1 className="text-xl font-bold text-text-primary">Infrastructure & Container Management</h1>
        </div>
        <p className="text-xs text-text-secondary">
          Monitor host performance, inspect container logs, manage volumes and network configurations.
        </p>
      </div>

      <div className="flex-1 bg-bg-panel border border-border rounded-xl shadow-lg overflow-hidden flex flex-col min-h-[500px]">
        {authenticating ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <p className="text-sm font-medium text-text-secondary">Connecting and authenticating with Portainer...</p>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-20 px-4">
            <AlertCircle className="w-12 h-12 text-destructive" />
            <div className="text-center">
              <h3 className="text-base font-bold text-text-primary">Authentication Failed</h3>
              <p className="text-xs text-text-secondary mt-1 max-w-md">{error}</p>
            </div>
            <button
              onClick={authenticate}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-hover transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Connection
            </button>
          </div>
        ) : (
          <iframe
            src="/portainer/"
            className="flex-1 border-none w-full h-full bg-white"
            title="Portainer Dashboard"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
      </div>
    </div>
  )
}
