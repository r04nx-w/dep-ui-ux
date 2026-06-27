'use client'

import { useState, useEffect } from 'react'
import { User, Palette, Layout, Type, Lock, Check } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const accentColors = [
  { name: 'VS Code Blue', value: '#007acc' },
  { name: 'Emerald Green', value: '#6a9955' },
  { name: 'Warm Orange', value: '#ce9178' },
  { name: 'Cool Purple', value: '#8a2be2' },
  { name: 'Active Red', value: '#f44747' },
]

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

export function AccountSettings() {
  const { showToast } = useToast()

  // Profile state
  const [profile, setProfile] = useState<{
    id?: number
    username?: string
    role?: string
    full_name?: string
    email?: string
    created_at?: string
  } | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Fetch active user profile
  useEffect(() => {
    let active = true
    const fetchProfile = async () => {
      try {
        const data = await apiFetch<{
          id: number
          username: string
          role: string
          full_name?: string
          email?: string
          created_at: string
        }>('/users/me')
        if (active) {
          setProfile(data)
          setFullName(data.full_name || '')
          setEmail(data.email || '')
        }
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to load profile details',
        })
      }
    }
    fetchProfile()
    return () => {
      active = false
    }
  }, [])

  const handleUpdateProfile = async () => {
    if (!fullName.trim() || !email.trim()) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Name and email are required fields',
      })
      return
    }
    setProfileSaving(true)
    try {
      const data = await apiFetch<{
        id: number
        username: string
        role: string
        full_name?: string
        email?: string
        created_at: string
      }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName,
          email: email
        })
      })
      setProfile(data)
      window.dispatchEvent(new CustomEvent('dep_profile_updated'))
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Profile updated successfully',
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to update profile',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'All password fields are required',
      })
      return
    }
    if (newPassword !== confirmPassword) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'New password and confirmation do not match',
      })
      return
    }
    setPasswordSaving(true)
    try {
      await apiFetch('/users/me/password', {
        method: 'PATCH',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      })
      showToast({
        type: 'success',
        title: 'Success',
        message: 'Password updated successfully',
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to change password',
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  // Initialize from cookies or localStorage (if exists) or fallback
  const [accentColor, setAccentColor] = useState(() => {
    if (typeof window !== 'undefined') {
      return getCookie('dep-accent-color') || localStorage.getItem('dep-accent-color') || '#007acc'
    }
    return '#007acc'
  })
  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return getCookie('dep-theme-mode') || localStorage.getItem('dep-theme-mode') || 'dark'
    }
    return 'dark'
  })
  const [fontFamily, setFontFamily] = useState(() => {
    if (typeof window !== 'undefined') {
      return getCookie('dep-font-family') || localStorage.getItem('dep-font-family') || 'Inter'
    }
    return 'Inter'
  })
  const [borderRadius, setBorderRadius] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseInt(getCookie('dep-border-radius') || localStorage.getItem('dep-border-radius') || '2', 10)
    }
    return 2
  })

  // Apply customizations dynamically to documentElement style variables
  useEffect(() => {
    localStorage.setItem('dep-accent-color', accentColor)
    localStorage.setItem('dep-font-family', fontFamily)
    localStorage.setItem('dep-theme-mode', themeMode)
    localStorage.setItem('dep-border-radius', borderRadius.toString())

    setCookie('dep-accent-color', accentColor)
    setCookie('dep-font-family', fontFamily)
    setCookie('dep-theme-mode', themeMode)
    setCookie('dep-border-radius', borderRadius.toString())

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

    if (themeMode === 'light') {
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
    } else if (themeMode === 'midnight') {
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
    } else if (themeMode === 'matrix') {
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
    const accentHover = hovers[accentColor] || accentColor

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
    document.documentElement.style.setProperty('--primary', accentColor)
    document.documentElement.style.setProperty('--color-primary', accentColor)
    document.documentElement.style.setProperty('--primary-hover', accentHover)
    document.documentElement.style.setProperty('--font-sans-custom', fontFamily)
    document.documentElement.style.setProperty('--font-mono-custom', 'Fira Code')
    document.documentElement.style.setProperty('--radius-sm-custom', `${borderRadius}px`)
    document.documentElement.style.setProperty('--radius-md-custom', `${borderRadius}px`)
    document.documentElement.style.setProperty('--radius-lg-custom', `${borderRadius + 1}px`)
    document.documentElement.style.setProperty('--radius-xl-custom', `${borderRadius + 2}px`)
    document.documentElement.style.setProperty('--radius-2xl-custom', `${borderRadius + 4}px`)
    document.documentElement.style.setProperty('--radius-3xl-custom', `${borderRadius + 6}px`)
    document.documentElement.style.setProperty('--radius-4xl-custom', `${borderRadius + 10}px`)
    document.documentElement.style.colorScheme = colorScheme
  }, [accentColor, fontFamily, themeMode, borderRadius])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Account Settings</h2>
        <p className="text-sm text-text-secondary mt-1">
          Manage your account profile, credentials, and visual workspace styles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Account Profile & Security */}
        <div className="space-y-6">
          {/* Account Profile */}
          <div className="bg-card border border-border rounded-sm p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider border-b border-border pb-2">
              Account Profile
            </h3>
            {profile ? (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold font-sans">
                    {(profile.full_name || profile.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-text-primary">{profile.full_name || profile.username}</p>
                    <p className="text-sm text-text-secondary">@{profile.username} • {profile.role?.replace('_', ' ').toUpperCase()}</p>
                  </div>
                </div>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter full name"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <button
                    onClick={handleUpdateProfile}
                    disabled={profileSaving}
                    className="w-full px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Joined Date</p>
                    <p className="text-sm text-text-primary font-medium">
                      {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-secondary mb-1">Account ID</p>
                    <p className="text-sm text-text-primary font-medium">{profile.id}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-text-secondary text-sm">
                Loading profile data...
              </div>
            )}
          </div>

          {/* Change Password */}
          <div className="bg-card border border-border rounded-sm p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider border-b border-border pb-2">
              Change Password
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                />
              </div>

              <button
                onClick={handleUpdatePassword}
                disabled={passwordSaving}
                className="w-full px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {passwordSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Theme Customizer */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-sm p-6 animate-fade-in">
            <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Workspace Customization
            </h3>
            
            <div className="space-y-6">
              {/* Accent Color picker */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                  Accent Primary Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setAccentColor(color.value)}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-sm border transition-all ${
                        accentColor === color.value
                          ? 'border-primary bg-input text-text-primary'
                          : 'border-border bg-bg-hover text-text-secondary hover:border-border'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full inline-block flex-shrink-0"
                        style={{ backgroundColor: color.value }}
                      />
                      <span>{color.name}</span>
                      {accentColor === color.value && <Check className="w-3 h-3 text-[#6a9955] ml-1" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Theme selection */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                  Theme Canvas Mode
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'dark', label: 'Default Dark', desc: 'Charcoal Canvas' },
                    { id: 'light', label: 'Light Clean', desc: 'Alabaster Canvas' },
                    { id: 'midnight', label: 'Midnight Blue', desc: 'Ocean Canvas' },
                    { id: 'matrix', label: 'Matrix Terminal', desc: 'Hacker Canvas' },
                  ].map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setThemeMode(theme.id)}
                      className={`p-3 text-left border rounded-sm transition-all ${
                        themeMode === theme.id
                          ? 'border-primary bg-input'
                          : 'border-border bg-bg-hover hover:border-border'
                      }`}
                    >
                      <p className="text-xs font-semibold text-text-primary">{theme.label}</p>
                      <p className="text-[10px] text-text-secondary mt-1">{theme.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font selection */}
              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                  Typography Font Family
                </label>
                <div className="grid grid-cols-3 gap-3 font-sans">
                  {[
                    { id: 'Inter', label: 'Inter (Sans)', font: 'font-sans' },
                    { id: 'Roboto', label: 'Roboto (Sans)', font: 'font-sans' },
                    { id: 'Fira Code', label: 'Fira Code (Mono)', font: 'font-mono' },
                  ].map((font) => (
                    <button
                      key={font.id}
                      onClick={() => setFontFamily(font.id)}
                      className={`p-3 text-center border rounded-sm transition-all ${font.font} ${
                        fontFamily === font.id
                          ? 'border-primary bg-input text-text-primary'
                          : 'border-border bg-bg-hover text-text-secondary hover:border-border'
                      }`}
                    >
                      <span className="text-xs">{font.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Curves / Border radius slider */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-text-secondary mb-3 uppercase tracking-wider">
                  <span>Border Corner Curve</span>
                  <span className="text-text-primary font-mono">{borderRadius}px</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-text-muted">Sharp (0px)</span>
                  <input
                    type="range"
                    min="0"
                    max="8"
                    step="1"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(parseInt(e.target.value, 10))}
                    className="flex-1 accent-[var(--primary)] bg-input h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-[10px] text-text-muted">Curved (8px)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
