'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()

  // Read URL search params
  const inviteToken = searchParams.get('token') || searchParams.get('invite') || ''
  const inviteEmail = searchParams.get('email') || ''
  const inviteRole = searchParams.get('role') || ''
  const inviteTeam = searchParams.get('team') || ''

  // Theme state
  const [theme, setTheme] = useState('dark')
  const [accent, setAccent] = useState('#007acc')

  // Local Form state
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('analyst')
  const [team, setTeam] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Prefill and lock inputs based on URL query parameters
  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail)
    if (inviteRole) setRole(inviteRole.toLowerCase())
    if (inviteTeam) setTeam(inviteTeam)
    if (inviteToken) setToken(inviteToken)
  }, [inviteEmail, inviteRole, inviteTeam, inviteToken])

  // Theme detection
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token.trim()) {
      showToast({
        type: 'error',
        title: 'Registration Blocked',
        message: 'A valid invitation token is required to register on this workbench.',
        duration: 4000,
      })
      return
    }

    if (!fullName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all required fields.',
        duration: 3000,
      })
      return
    }

    if (password !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Passwords do not match.',
        duration: 3000,
      })
      return
    }

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
          role
        })
      })

      // Success action
      showToast({
        type: 'success',
        title: 'Registration Successful!',
        message: 'Your account has been created. Redirecting to login...',
        duration: 3000,
      })

      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'An error occurred during registration.',
        duration: 4000,
      })
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative animate-page-in"
      style={getBackgroundStyle()}
    >
      {/* Vignette overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
      <div className="w-full max-w-lg relative z-10">
        {/* Logo & Title */}
        <div className="mb-6 text-center animate-stagger-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center animate-scale-in">
              <span className="text-white font-bold">DEP</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Create Account</h1>
          <p className="text-xs text-text-muted font-medium mb-2">by Wissen Technology</p>
          <p className="text-text-secondary text-sm">Join the Data Exploration & Governance Platform</p>
        </div>

        {/* Warning card if token parameter is completely missing */}
        {!inviteToken && (
          <div className="mb-6 bg-[#ce9178]/10 border border-[#ce9178]/30 rounded-sm p-4 text-xs text-[#ce9178] flex items-start gap-2 animate-stagger-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Registration Invite Required</p>
              <p className="leading-relaxed">This workbench is invite-only. If you have been invited, please verify your invitation link or enter your token below.</p>
            </div>
          </div>
        )}

        {/* Card Form */}
        <div className="bg-card border border-border rounded-sm p-8 shadow-2xl animate-stagger-3 card-hover">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Invitation Token */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                <span>Invitation Token <span className="text-[#f44747]">*</span></span>
                {inviteToken && (
                  <span className="text-[#6a9955] text-[10px] flex items-center gap-1 font-mono uppercase">
                    <Lock className="w-3 h-3" /> Locked by invite
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => !inviteToken && setToken(e.target.value)}
                  readOnly={!!inviteToken}
                  className={`w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200 ${
                    inviteToken ? 'opacity-60 cursor-not-allowed bg-bg-hover pr-10' : ''
                  }`}
                  placeholder="Enter invitation token (e.g., inv-9988)"
                />
                {inviteToken && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a9955]">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Full Name <span className="text-[#f44747]">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200"
                  placeholder="John Doe"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Username <span className="text-[#f44747]">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200"
                  placeholder="johndoe"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                <span>Email Address <span className="text-[#f44747]">*</span></span>
                {inviteEmail && (
                  <span className="text-[#6a9955] text-[10px] flex items-center gap-1 font-mono uppercase">
                    <Lock className="w-3 h-3" /> Locked by invite
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => !inviteEmail && setEmail(e.target.value)}
                  readOnly={!!inviteEmail}
                  className={`w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200 ${
                    inviteEmail ? 'opacity-60 cursor-not-allowed bg-bg-hover pr-10' : ''
                  }`}
                  placeholder="john.doe@company.com"
                />
                {inviteEmail && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a9955]">
                    <Lock className="w-4 h-4" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                  <span>Assigned Role</span>
                  {inviteRole && (
                    <span className="text-[#6a9955] text-[10px] flex items-center gap-1 font-mono uppercase">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </label>
                <div className="relative">
                  {inviteRole ? (
                    <input
                      type="text"
                      value={role.charAt(0).toUpperCase() + role.slice(1)}
                      readOnly
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary opacity-60 cursor-not-allowed bg-bg-hover pr-10 transition-all duration-200"
                    />
                  ) : (
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200 appearance-none"
                    >
                      <option value="analyst">Analyst</option>
                      <option value="onboarder">Data Onboarder</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                  {inviteRole && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a9955]">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>

              {/* Team Workspace */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                  <span>Team Workspace</span>
                  {inviteTeam && (
                    <span className="text-[#6a9955] text-[10px] flex items-center gap-1 font-mono uppercase">
                      <Lock className="w-3 h-3" /> Locked
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={team}
                    onChange={(e) => !inviteTeam && setTeam(e.target.value)}
                    readOnly={!!inviteTeam}
                    className={`w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200 ${
                      inviteTeam ? 'opacity-60 cursor-not-allowed bg-bg-hover pr-10' : ''
                    }`}
                    placeholder="e.g. RiskAnalytics"
                  />
                  {inviteTeam && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6a9955]">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Password <span className="text-[#f44747]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200"
                  placeholder="••••••••"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Confirm Password <span className="text-[#f44747]">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-all duration-200"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-all duration-200"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2 px-4 rounded-sm transition-all duration-200 text-sm pt-2 active:scale-97"
            >
              Complete Registration
            </button>
          </form>

          {/* Navigation back to login */}
          <div className="mt-4 pt-4 border-t border-border text-center">
            <Link href="/" className="text-xs text-text-secondary hover:text-text-primary transition-all duration-200 flex items-center justify-center gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" />
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center text-text-secondary text-sm">Loading registration details...</div>}>
      <RegisterForm />
    </Suspense>
  )
}
