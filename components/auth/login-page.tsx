'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

interface LoginPageProps {
  onLogin: (role: 'admin' | 'onboarder' | 'analyst') => void
}

const roleCredentials = {
  admin: { username: 'admin', password: 'password123' },
  onboarder: { username: 'dataonboarder', password: 'password123' },
  analyst: { username: 'analyst', password: 'password123' },
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'onboarder' | 'analyst'>('admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()
  const [theme, setTheme] = useState('dark')
  const [accent, setAccent] = useState('#007acc')

  useEffect(() => {
    const getCookie = (name: string): string | null => {
      if (typeof document === 'undefined') return null
      const nameEQ = name + "="
      const ca = document.cookie.split(';')
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i]
        while (c.charAt(0) === ' ') c = c.substring(1, c.length)
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length)
      }
      return null
    }

    const currentTheme = getCookie('dep-theme-mode') || localStorage.getItem('dep-theme-mode') || 'dark'
    const currentAccent = getCookie('dep-accent-color') || localStorage.getItem('dep-accent-color') || '#007acc'
    setTheme(currentTheme)
    setAccent(currentAccent)
  }, [])

  const getBackgroundStyle = () => {
    const patternColor = theme === 'light' ? '#9C92AC' : '#2b2b2b'
    const bgColor = theme === 'light' ? '#DFDBE5' : '#1e1e1e'
    const opacity = theme === 'light' ? '0.4' : '0.12'

    return {
      backgroundColor: bgColor,
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='168' height='96' viewBox='0 0 84 48' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h12v6H0V0zm28 8h12v6H28V8zm14-8h12v6H42V0zm14 0h12v6H56V0zm0 8h12v6H56V8zM42 8h12v6H42V8zm0 16h12v6H42v-6zm14-8h12v6H56v-6zm14 0h12v6H70v-6zm0-16h12v6H70V0zM28 32h12v6H28v-6zM14 16h12v6H14v-6zM0 24h12v6H0v-6zm0 8h12v6H0v-6zm14 0h12v6H14v-6zm14 8h12v6H28v-6zm-14 0h12v6H14v-6zm28 0h12v6H42v-6zm14-8h12v6H56v-6zm0-8h12v6H56v-6zm14 8h12v6H70v-6zm0 8h12v6H70v-6zM14 24h12v6H14v-6zm14-8h12v6H28v-6zM14 8h12v6H14V8zM0 8h12v6H0V8z' fill='${encodeURIComponent(patternColor)}' fill-opacity='${opacity}' fill-rule='evenodd'/%3E%3C/svg%3E")`,
      backdropFilter: 'blur(0.5px)',
    }
  }

  const handleRoleSelect = (role: 'admin' | 'onboarder' | 'analyst') => {
    setSelectedRole(role)
    const creds = roleCredentials[role]
    setUsername(creds.username)
    setPassword(creds.password)
    setError(null)
  }

  const handleLogin = async () => {
    setError(null)
    setLoading(true)
    try {
      const res = await apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })

      localStorage.setItem('dep_jwt_token', res.access_token)
      document.cookie = `dep_jwt_token=${res.access_token};path=/;max-age=31536000;SameSite=Lax`

      const user = await apiFetch<{ username: string; role: string }>('/users/me')

      let role: 'admin' | 'onboarder' | 'analyst' = 'analyst'
      if (user.role === 'super_admin') role = 'admin'
      else if (user.role === 'data_onboarder') role = 'onboarder'

      showToast({
        type: 'success',
       title: 'Welcome back!',
        message: `Successfully logged in as ${user.username}`,
        duration: 3000,
      })

      onLogin(role)
    } catch (err: any) {
      setError(err.message || 'Login failed')
      showToast({
        type: 'error',
        title: 'Authentication Failed',
        message: err.message || 'Please check your credentials and try again',
        duration: 4000,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center animate-page-in relative"
      style={getBackgroundStyle()}
    >
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
          pointerEvents: 'none',
        }}
      />
      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="mb-8 text-center animate-stagger-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center animate-scale-in">
              <span className="text-white font-bold">DEP</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Sign In to DEP</h1>
          <p className="text-xs text-text-muted font-medium mb-3">by Wissen Technology</p>
          <p className="text-text-secondary text-sm">Data Exploration & Governance Platform</p>
        </div>

        {/* Card */}
        <form 
          onSubmit={(e) => {
            e.preventDefault()
            handleLogin()
          }}
          className="bg-card border border-border rounded-sm p-8 animate-stagger-2 card-hover"
        >
          {/* Username Input */}
          <div className="mb-4 animate-stagger-4">
            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Username
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 pl-9 text-text-primary text-sm focus:outline-none focus:border-primary focus:bg-input transition-all duration-200"
                placeholder="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6 animate-stagger-5">
            <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-input border border-border rounded-sm px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-primary transition-all duration-200"
                placeholder="password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-all duration-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-destructive/10 border border-destructive/30 rounded-sm p-3 text-xs text-destructive flex items-start gap-2 animate-shake">
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>{error}</div>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-sm transition-all duration-200 text-sm active:scale-97"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Unlocking Console...
              </span>
            ) : 'Unlock Console'}
          </button>

          <div className="mt-4 text-center">
            <Link href="/register" className="text-xs text-primary hover:underline">
              Have an invitation? Register here
            </Link>
          </div>
        </form>

        {/* Helper Text */}
        <p className="text-center text-xs text-text-muted mt-6">
          Secure access to your data exploration platform
        </p>
      </div>
    </div>
  )
}
