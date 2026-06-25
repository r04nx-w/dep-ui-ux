'use client'

import { useState } from 'react'
import { LoginPage } from '@/components/auth/login-page'
import { MainLayout } from '@/components/layout/main-layout'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'onboarder' | 'analyst'>('admin')
  const [currentPage, setCurrentPage] = useState<string>('dashboard')

  const handleLogin = (role: 'admin' | 'onboarder' | 'analyst') => {
    setUserRole(role)
    setIsLoggedIn(true)
    setCurrentPage('dashboard')
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setCurrentPage('dashboard')
  }

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <MainLayout
      userRole={userRole}
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      onLogout={handleLogout}
    />
  )
}
