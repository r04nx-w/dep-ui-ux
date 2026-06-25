'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface LoginPageProps {
  onLogin: (role: 'admin' | 'onboarder' | 'analyst') => void
}

const roleCredentials = {
  admin: { username: 'super_admin', password: 'super_admin123' },
  onboarder: { username: 'aditi', password: 'password123' },
  analyst: { username: 'analyst_user', password: 'password123' },
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'onboarder' | 'analyst'>('admin')

  const handleRoleSelect = (role: 'admin' | 'onboarder' | 'analyst') => {
    setSelectedRole(role)
    const creds = roleCredentials[role]
    setUsername(creds.username)
    setPassword(creds.password)
  }

  const handleLogin = () => {
    onLogin(selectedRole)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181818]">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#007acc] rounded flex items-center justify-center">
              <span className="text-white font-bold">DEP</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-[#cccccc] mb-2">Sign In to DEP</h1>
          <p className="text-[#a3a3a3] text-sm">Data Exploration & Governance Platform</p>
        </div>

        {/* Card */}
        <div className="bg-[#1e1e1e] border border-[#2b2b2b] rounded-sm p-8">
          {/* Role Segmented Control */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-3 uppercase tracking-wide">
              Select Role (Demo)
            </label>
            <div className="flex gap-2">
              {['admin', 'onboarder', 'analyst'].map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role as 'admin' | 'onboarder' | 'analyst')}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-sm transition-colors ${
                    selectedRole === role
                      ? 'bg-[#007acc] text-white'
                      : 'bg-[#2d2d2d] text-[#a3a3a3] hover:bg-[#37373d]'
                  }`}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Username Input */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase tracking-wide">
              Username
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a3a3a3]">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 pl-9 text-[#cccccc] text-sm focus:outline-none focus:border-[#007acc] focus:bg-[#2d2d2d] transition-colors"
                placeholder="username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-[#a3a3a3] mb-2 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#2d2d2d] border border-[#2b2b2b] rounded-sm px-3 py-2 text-[#cccccc] text-sm focus:outline-none focus:border-[#007acc] transition-colors"
                placeholder="password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a3a3a3] hover:text-[#cccccc] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            className="w-full bg-[#007acc] hover:bg-[#0e639c] text-white font-medium py-2 px-4 rounded-sm transition-colors text-sm"
          >
            Unlock Console
          </button>
        </div>

        {/* Helper Text */}
        <p className="text-center text-xs text-[#606060] mt-6">
          Demo credentials are pre-filled based on selected role
        </p>
      </div>
    </div>
  )
}
