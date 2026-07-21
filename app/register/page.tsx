'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle, ArrowLeft, RefreshCw, KeyRound, Mail, UserCheck } from 'lucide-react'
import Link from 'next/link'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/lib/api'

function RegisterForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { showToast } = useToast()

  // Read URL search params
  const inviteCodeParam = searchParams.get('code') || searchParams.get('token') || searchParams.get('invite') || ''
  const inviteEmailParam = searchParams.get('email') || ''
  const inviteRoleParam = searchParams.get('role') || ''

  // Theme state
  const [theme, setTheme] = useState('dark')

  // Form state
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('analyst')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Validation state
  const [validatingInvite, setValidatingInvite] = useState(false)
  const [inviteValid, setInviteValid] = useState<boolean | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-fill parameters from URL
  useEffect(() => {
    if (inviteEmailParam) setEmail(inviteEmailParam)
    if (inviteRoleParam) setRole(inviteRoleParam.toLowerCase())
    if (inviteCodeParam) setToken(inviteCodeParam)
  }, [inviteEmailParam, inviteRoleParam, inviteCodeParam])

  // Validate invite code when token is set
  useEffect(() => {
    const codeToTest = token.trim()
    if (!codeToTest) {
      setInviteValid(null)
      setInviteError(null)
      return
    }

    const validateCode = async () => {
      setValidatingInvite(true)
      setInviteError(null)
      try {
        const res = await apiFetch<{ valid: boolean; email: string; role: string }>(`/invites/validate/${codeToTest}`)
        setInviteValid(res.valid)
        if (res.email) setEmail(res.email)
        if (res.role) setRole(res.role.toLowerCase())
      } catch (err: any) {
        setInviteValid(false)
        setInviteError(err.message || 'Invalid or expired invitation code.')
      } finally {
        setValidatingInvite(false)
      }
    }

    const timer = setTimeout(validateCode, 500)
    return () => clearTimeout(timer)
  }, [token])

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
    setTheme(currentTheme)
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
        message: 'A valid invitation code is required to register on this platform.',
        duration: 4000,
      })
      return
    }

    if (inviteValid === false) {
      showToast({
        type: 'error',
        title: 'Invalid Invitation',
        message: inviteError || 'Your invitation code is invalid, expired, or already used.',
        duration: 4000,
      })
      return
    }

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
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

    setIsSubmitting(true)
    try {
      await apiFetch('/auth/register-with-invite', {
        method: 'POST',
        body: JSON.stringify({
          code: token.trim(),
          username: username.trim(),
          email: email.trim(),
          password: password,
          full_name: fullName.trim() || null,
        }),
      })

      showToast({
        type: 'success',
        title: 'Account Registered!',
        message: 'Your account has been created successfully. Redirecting to sign in...',
        duration: 3000,
      })

      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Registration Failed',
        message: err.message || 'An error occurred during registration.',
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative animate-page-in"
      style={getBackgroundStyle()}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.3) 100%)',
        }}
      />
      <div className="w-full max-w-lg relative z-10">
        {/* Header */}
        <div className="mb-6 text-center animate-stagger-1">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-primary rounded flex items-center justify-center shadow-lg">
              <span className="text-white font-bold font-mono text-base">DEP</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-1">Invite-Only Registration</h1>
          <p className="text-xs text-text-muted font-medium mb-2">Data Exploration Platform</p>
          <p className="text-text-secondary text-sm">Enter your invitation code to activate your account</p>
        </div>

        {/* Warning if no token parameter */}
        {!token && (
          <div className="mb-6 bg-warning/10 border border-warning/30 rounded-sm p-4 text-xs text-warning flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold mb-1">Admin Invitation Required</p>
              <p className="leading-relaxed">This workbench is invite-only. Please enter the invitation code generated by your system administrator.</p>
            </div>
          </div>
        )}

        {/* Registration Card */}
        <div className="bg-card border border-border rounded-sm p-8 shadow-2xl animate-stagger-3">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Invitation Code */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                <span>Invitation Code <span className="text-destructive">*</span></span>
                {validatingInvite && (
                  <span className="text-primary text-[10px] flex items-center gap-1 font-mono">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Validating...
                  </span>
                )}
                {inviteValid === true && (
                  <span className="text-success text-[10px] flex items-center gap-1 font-mono uppercase font-bold">
                    <CheckCircle className="w-3 h-3" /> Valid Invite
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className={`w-full bg-input border rounded-sm px-3 py-2 text-sm text-text-primary font-mono focus:outline-none transition-all duration-200 ${
                    inviteValid === true
                      ? 'border-success bg-success/5'
                      : inviteValid === false
                      ? 'border-destructive bg-destructive/5'
                      : 'border-border focus:border-primary'
                  }`}
                  placeholder="e.g. INV-8F3A9C12"
                />
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              </div>
              {inviteError && (
                <p className="text-[11px] text-destructive mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {inviteError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  placeholder="Jane Doe"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Username <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors font-mono"
                  placeholder="janedoe"
                />
              </div>
            </div>

            {/* Target Email Address */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                <span>Target Email Address <span className="text-destructive">*</span></span>
                {inviteValid === true && (
                  <span className="text-success text-[10px] flex items-center gap-1 font-mono uppercase">
                    <Lock className="w-3 h-3" /> Locked to Invite
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={inviteValid === true}
                  className={`w-full bg-input border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none transition-colors ${
                    inviteValid === true ? 'opacity-80 bg-input/40 border-success/40' : 'border-border focus:border-primary'
                  }`}
                  placeholder="jane.doe@company.com"
                />
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              </div>
            </div>

            {/* Assigned Role Display */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide flex justify-between items-center">
                <span>Assigned Privilege Role</span>
                {inviteValid === true && (
                  <span className="text-success text-[10px] flex items-center gap-1 font-mono uppercase">
                    <Lock className="w-3 h-3" /> Designated
                  </span>
                )}
              </label>
              <input
                type="text"
                value={role.toUpperCase().replace('_', ' ')}
                readOnly
                className="w-full bg-input/40 border border-border rounded-sm px-3 py-2 text-sm text-primary font-mono font-bold cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Confirm Password <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || inviteValid === false}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-sm transition-all duration-200 text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-98"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Complete Registration
                </>
              )}
            </button>
          </form>

          {/* Navigation back to login */}
          <div className="mt-4 pt-4 border-t border-border text-center">
            <Link href="/" className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center gap-1.5">
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
