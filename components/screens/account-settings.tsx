'use client'

import { useState, useEffect } from 'react'
import { User, Palette, Lock, Check, Key, Trash2, Copy, ShieldAlert, X, Shield, Eye, EyeOff } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState<'profile' | 'visual' | 'keys'>('profile')

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

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Array<{ id: number, name: string, created_at: string, expires_at?: string, is_active: boolean, privacy_mode: boolean }>>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [keyExpiry, setKeyExpiry] = useState<number | null>(null) // null = never
  const [privacyMode, setPrivacyMode] = useState(false)
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Visual settings state
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

    // Chat bubble custom colors per theme
    let chatUserBg = '#212733'
    let chatUserBorder = '#2b354a'
    let chatUserText = '#cccccc'
    let chatAiBg = '#0c244b'
    let chatAiBorder = 'rgba(59, 130, 246, 0.4)'
    let chatAiText = '#dbeafe'

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
      
      chatUserBg = '#e5e5ea'
      chatUserBorder = '#d1d1d6'
      chatUserText = '#1d1d1f'
      chatAiBg = '#e0f2fe'
      chatAiBorder = 'rgba(56, 189, 248, 0.4)'
      chatAiText = '#0369a1'
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

      chatUserBg = '#1e293b'
      chatUserBorder = '#334155'
      chatUserText = '#b5c2d5'
      chatAiBg = '#0f172a'
      chatAiBorder = '#1e3a8a'
      chatAiText = '#93c5fd'
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

      chatUserBg = '#050505'
      chatUserBorder = '#005500'
      chatUserText = '#00ff00'
      chatAiBg = '#001100'
      chatAiBorder = '#00aa00'
      chatAiText = '#00ff00'
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
    
    // Chat bubble custom styles
    document.documentElement.style.setProperty('--chat-user-bg', chatUserBg)
    document.documentElement.style.setProperty('--chat-user-border', chatUserBorder)
    document.documentElement.style.setProperty('--chat-user-text', chatUserText)
    document.documentElement.style.setProperty('--chat-ai-bg', chatAiBg)
    document.documentElement.style.setProperty('--chat-ai-border', chatAiBorder)
    document.documentElement.style.setProperty('--chat-ai-text', chatAiText)
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

  const fetchApiKeys = async () => {
    try {
      const data = await apiFetch<any[]>('/api-keys')
      setApiKeys(data)
    } catch (err: any) {
      console.error(err)
    }
  }

  useEffect(() => {
    fetchApiKeys()
    
    // Fetch active user profile
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
        setProfile(data)
        setFullName(data.full_name || '')
        setEmail(data.email || '')
      } catch (err: any) {
        showToast({
          type: 'error',
          title: 'Error',
          message: err.message || 'Failed to load profile details',
        })
      }
    }
    fetchProfile()
  }, [])

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setIsGenerating(true)
    try {
      const data = await apiFetch<{ key: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name: newKeyName,
          expires_in_days: keyExpiry,
          privacy_mode: privacyMode
        })
      })
      setGeneratedKey(data.key)
      setNewKeyName('')
      setPrivacyMode(false)
      fetchApiKeys()
      showToast({
        type: 'success',
        title: 'API Key Created',
        message: 'Make sure to copy your API key now. It will not be shown again.',
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to create API key',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRevokeKey = async (id: number) => {
    try {
      await apiFetch(`/api-keys/${id}`, { method: 'DELETE' })
      fetchApiKeys()
      showToast({
        type: 'success',
        title: 'API Key Revoked',
        message: 'The key has been successfully deactivated.',
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to revoke API key',
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: 'API Key is ready to paste.',
    })
  }

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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">System Settings</h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage your account profiles, visual style variables, and API keys.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-input border border-border p-1 rounded-sm overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            Profile & Security
          </button>
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'visual' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Palette className="w-3.5 h-3.5 flex-shrink-0" />
            Visual Style
          </button>
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'keys' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Key className="w-3.5 h-3.5 flex-shrink-0" />
            Developer API Keys
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="space-y-6">
        
        {/* Profile & Security Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start animate-fade-in">
            {/* Account Profile */}
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider border-b border-border/60 pb-2">
                Account Profile
              </h3>
              {profile ? (
                <>
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-sm border border-border bg-input flex items-center justify-center text-text-secondary">
                      <User className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-text-primary">
                        {profile.full_name ? profile.full_name.charAt(0).toUpperCase() + profile.full_name.slice(1) : (profile.username || '').charAt(0).toUpperCase() + (profile.username || '').slice(1)}
                      </p>
                      <p className="text-sm text-text-secondary">
                        Username: {(profile.username || '').charAt(0).toUpperCase() + (profile.username || '').slice(1)} • {profile.role?.replace('_', ' ').toUpperCase()}
                      </p>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border/60">
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
            <div className="bg-card border border-border rounded-sm p-6">
              <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wider border-b border-border/60 pb-2">
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
        )}

        {/* Visual Style Tab */}
        {activeTab === 'visual' && (
          <div className="bg-card border border-border rounded-sm p-6 max-w-3xl mx-auto animate-fade-in">
            <h3 className="text-sm font-semibold text-text-primary mb-6 uppercase tracking-wider border-b border-border/60 pb-2 flex items-center gap-2">
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
                      {accentColor === color.value && <Check className="w-3.5 h-3.5 text-[#007acc] ml-1" />}
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
        )}

        {/* Developer API Keys Tab */}
        {activeTab === 'keys' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start animate-fade-in">
            {/* Create API Token Form */}
            <div className="lg:col-span-1 bg-card border border-border rounded-sm p-6 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-2 uppercase tracking-wider flex items-center gap-2">
                  <Key className="w-4 h-4 text-primary" />
                  Generate Token
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Generate secure tokens to query datasets programmatically. Use Privacy Mode to enforce zero-row raw data exposure.
                </p>
              </div>

              <form onSubmit={handleCreateKey} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Token Description Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Claude Desktop local key"
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Expiration Window
                  </label>
                  <select
                    value={keyExpiry === null ? 'never' : keyExpiry.toString()}
                    onChange={(e) => {
                      const val = e.target.value
                      setKeyExpiry(val === 'never' ? null : parseInt(val, 10))
                    }}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors cursor-pointer"
                  >
                    <option value="never">Never Expires (Permanent)</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="privacy_mode_checkbox"
                    checked={privacyMode}
                    onChange={(e) => setPrivacyMode(e.target.checked)}
                    className="accent-primary rounded-sm h-4 w-4 bg-input border-border focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="privacy_mode_checkbox" className="text-xs font-semibold text-text-secondary cursor-pointer select-none">
                    Enable Privacy Mode (Zero-Row Exposure)
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isGenerating || !newKeyName.trim()}
                  className="w-full px-4 py-2 bg-primary text-white rounded-sm text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {isGenerating ? 'Generating...' : 'Generate New API Token'}
                </button>
              </form>
            </div>

            {/* Active Keys List */}
            <div className="lg:col-span-2 bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider border-b border-border pb-2">
                Active Credentials & Access Tokens
              </h3>

              {apiKeys.length === 0 ? (
                <p className="text-xs text-text-muted italic py-2">
                  No active API keys found. Generate one to authenticate external tools or python notebooks.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="flex items-center justify-between p-3.5 bg-input rounded-sm border border-border/40 text-xs gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-text-primary">{key.name}</p>
                          {key.privacy_mode && (
                            <span className="px-2 py-0.5 rounded-sm bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                              <Shield className="w-2.5 h-2.5" />
                              Privacy Mode (Pilot Data Only)
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary">
                          Created: {new Date(key.created_at).toLocaleDateString()} • Expire: {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRevokeKey(key.id)}
                        className="p-1.5 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded-sm transition-colors cursor-pointer"
                        title="Revoke Token"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Generated Raw Key Modal Alert */}
      {generatedKey && (
        <div className="fixed inset-0 z-[100000] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-md w-full space-y-4 shadow-2xl relative animate-scale-in">
            <div className="flex items-center gap-2 text-[#007acc]">
              <ShieldAlert className="w-5 h-5 text-[#007acc]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">Save your API Key</h3>
            </div>
            
            <p className="text-xs text-text-secondary leading-relaxed">
              Please copy this API key now. For your security, **we do not store the key on our servers and it cannot be shown to you again**.
            </p>

            <div className="flex items-center gap-2 bg-input border border-border rounded-sm p-2">
              <input
                type="text"
                readOnly
                value={generatedKey}
                className="flex-1 bg-transparent font-mono text-xs text-primary focus:outline-none select-all"
              />
              <button
                onClick={() => copyToClipboard(generatedKey)}
                className="p-1.5 hover:bg-primary/10 text-primary rounded-sm transition-colors cursor-pointer"
                title="Copy Key"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setGeneratedKey(null)}
                className="px-4 py-1.5 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
              >
                I have saved it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
