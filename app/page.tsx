'use client'

import { useState, useEffect } from 'react'
import { LoginPage } from '@/components/auth/login-page'
import { MainLayout } from '@/components/layout/main-layout'
import { apiFetch } from '@/lib/api'

function PageTransition({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`animate-page-in ${className}`}>
      {children}
    </div>
  )
}

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

const setCookie = (name: string, value: string) => {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=${value};path=/;max-age=31536000;SameSite=Lax`
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'onboarder' | 'analyst'>('admin')
  const [username, setUsername] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<string>('dashboard')

  useEffect(() => {
    const accent = getCookie('dep-accent-color') || localStorage.getItem('dep-accent-color') || '#007acc'
    const font = getCookie('dep-font-family') || localStorage.getItem('dep-font-family') || 'Inter'
    const theme = getCookie('dep-theme-mode') || localStorage.getItem('dep-theme-mode') || 'dark'
    const radius = getCookie('dep-border-radius') || localStorage.getItem('dep-border-radius') || '2'

    // Synchronize both cookie and localStorage
    setCookie('dep-accent-color', accent)
    setCookie('dep-font-family', font)
    setCookie('dep-theme-mode', theme)
    setCookie('dep-border-radius', radius)

    localStorage.setItem('dep-accent-color', accent)
    localStorage.setItem('dep-font-family', font)
    localStorage.setItem('dep-theme-mode', theme)
    localStorage.setItem('dep-border-radius', radius)

    // Apply styles to document variables
    let bg = '#181818'
    let bgSidebar = '#1e1e1e'
    let bgCard = '#1e1e1e'
    let fg = '#cccccc'
    let border = '#2b2b2b'
    let input = '#2d2d2d'
    let textPrimary = '#cccccc'
    let textSecondary = '#a3a3a3'
    let textMuted = '#606060'
    let bgHover = '#37373d'
    let colorScheme = 'dark'

    if (theme === 'light') {
      bg = '#f5f5f7'
      bgSidebar = '#eaeaea'
      bgCard = '#ffffff'
      fg = '#1d1d1f'
      border = '#d2d2d7'
      input = '#ffffff'
      textPrimary = '#1d1d1f'
      textSecondary = '#86868b'
      textMuted = '#a1a1a6'
      bgHover = '#e5e5ea'
      colorScheme = 'light'
    } else if (theme === 'midnight') {
      bg = '#0b0e14'
      bgSidebar = '#0f131a'
      bgCard = '#0f131a'
      fg = '#b5c2d5'
      border = '#1b2330'
      input = '#161c24'
      textPrimary = '#b5c2d5'
      textSecondary = '#7e8f9f'
      textMuted = '#4a5768'
      bgHover = '#1e293b'
      colorScheme = 'dark'
    } else if (theme === 'matrix') {
      bg = '#000000'
      bgSidebar = '#050505'
      bgCard = '#0a0a0a'
      fg = '#00ff00'
      border = '#003300'
      input = '#050505'
      textPrimary = '#00ff00'
      textSecondary = '#00aa00'
      textMuted = '#005500'
      bgHover = '#002200'
      colorScheme = 'dark'
    }

    const hovers: Record<string, string> = {
      '#007acc': '#0e639c',
      '#6a9955': '#5a8248',
      '#ce9178': '#b78069',
      '#8a2be2': '#7324bd',
      '#f44747': '#d83a3a',
    }
    const accentHover = hovers[accent] || accent

    document.documentElement.style.setProperty('--background', bg)
    document.documentElement.style.setProperty('--bg-primary', bg)
    document.documentElement.style.setProperty('--bg-sidebar', bgSidebar)
    document.documentElement.style.setProperty('--bg-card', bgCard)
    document.documentElement.style.setProperty('--foreground', fg)
    document.documentElement.style.setProperty('--card', bgCard)
    document.documentElement.style.setProperty('--card-foreground', fg)
    document.documentElement.style.setProperty('--sidebar', bgSidebar)
    document.documentElement.style.setProperty('--sidebar-foreground', fg)
    document.documentElement.style.setProperty('--border', border)
    document.documentElement.style.setProperty('--border-color', border)
    document.documentElement.style.setProperty('--input', input)
    document.documentElement.style.setProperty('--bg-input', input)
    document.documentElement.style.setProperty('--text-primary', textPrimary)
    document.documentElement.style.setProperty('--text-secondary', textSecondary)
    document.documentElement.style.setProperty('--text-muted', textMuted)
    document.documentElement.style.setProperty('--bg-hover', bgHover)
    document.documentElement.style.setProperty('--primary', accent)
    document.documentElement.style.setProperty('--color-primary', accent)
    document.documentElement.style.setProperty('--primary-hover', accentHover)
    document.documentElement.style.setProperty('--font-sans-custom', font)
    document.documentElement.style.setProperty('--font-mono-custom', 'Fira Code')
    const r = parseInt(radius, 10)
    document.documentElement.style.setProperty('--radius-sm-custom', `${r}px`)
    document.documentElement.style.setProperty('--radius-md-custom', `${r}px`)
    document.documentElement.style.setProperty('--radius-lg-custom', `${r + 1}px`)
    document.documentElement.style.setProperty('--radius-xl-custom', `${r + 2}px`)
    document.documentElement.style.setProperty('--radius-2xl-custom', `${r + 4}px`)
    document.documentElement.style.setProperty('--radius-3xl-custom', `${r + 6}px`)
    document.documentElement.style.setProperty('--radius-4xl-custom', `${r + 10}px`)
    document.documentElement.style.colorScheme = colorScheme
  }, [])

  useEffect(() => {
    const token = getCookie('dep_jwt_token') || localStorage.getItem('dep_jwt_token')
    if (token) {
      apiFetch<{ username: string; role: string }>('/users/me')
        .then(user => {
          let role: 'admin' | 'onboarder' | 'analyst' = 'analyst'
          if (user.role === 'super_admin') role = 'admin'
          else if (user.role === 'data_onboarder') role = 'onboarder'
          
          setUsername(user.username)
          setUserRole(role)
          setIsLoggedIn(true)
        })
        .catch(err => {
          console.error('Session restoration failed:', err)
          document.cookie = 'dep_jwt_token=;path=/;max-age=0'
          localStorage.removeItem('dep_jwt_token')
          localStorage.removeItem('token')
        })
    }
  }, [])

  const handleLogin = (role: 'admin' | 'onboarder' | 'analyst') => {
    apiFetch<{ username: string }>('/users/me')
      .then(user => {
        setUsername(user.username)
      })
      .catch(() => {})

    setUserRole(role)
    setIsLoggedIn(true)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    document.cookie = 'dep_jwt_token=;path=/;max-age=0'
    localStorage.removeItem('dep_jwt_token')
    localStorage.removeItem('token')
    setUsername('')
    setIsLoggedIn(false)
    setCurrentPage('dashboard')
  }

  if (!isLoggedIn) {
    return <PageTransition><LoginPage onLogin={handleLogin} /></PageTransition>
  }

  return (
    <PageTransition>
      <MainLayout
        userRole={userRole}
        username={username}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />
    </PageTransition>
  )
}
