'use client'

import { useState, useEffect, useRef } from 'react'
import { User, Palette, Lock, Check, Key, Trash2, Copy, ShieldAlert, X, Shield, Eye, EyeOff, Sparkles, Globe, Share2, Camera, Upload } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useToast } from '@/components/ui/toast'

const accentColors = [
  { name: 'VS Code Blue', value: '#007acc' },
  { name: 'Ocean Slate', value: '#0f59a4' },
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
  const [activeTab, setActiveTab] = useState<'profile' | 'visual' | 'keys' | 'seo'>('profile')

  // SEO settings state
  const [seoTitle, setSeoTitle] = useState('DEP Workbench | Enterprise Data Exploration & Governance')
  const [seoDescription, setSeoDescription] = useState('Governed Data Exploration Platform (DEP) for secure SQL querying, JupyterLite notebooks, schema catalogs, and role-based access control compliance.')
  const [seoKeywords, setSeoKeywords] = useState('data exploration, data governance, JupyterLite, SQL editor, access control')
  const [seoSiteName, setSeoSiteName] = useState('DEP Platform')
  const [seoTargetUrl, setSeoTargetUrl] = useState('https://dep.rohanpawar.app/')

  // Load SEO settings from localStorage on mount
  useEffect(() => {
    const t = localStorage.getItem('dep-seo-title')
    const d = localStorage.getItem('dep-seo-desc')
    const k = localStorage.getItem('dep-seo-keywords')
    const s = localStorage.getItem('dep-seo-sitename')
    const u = localStorage.getItem('dep-seo-url')
    if (t) setSeoTitle(t)
    if (d) setSeoDescription(d)
    if (k) setSeoKeywords(k)
    if (s) setSeoSiteName(s)
    if (u) setSeoTargetUrl(u)
  }, [])

  // Profile state
  const [profile, setProfile] = useState<{
    id?: number
    username?: string
    role?: string
    full_name?: string
    email?: string
    profile_pic?: string
    created_at?: string
  } | null>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [profilePic, setProfilePic] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Avatar Selector & CDN Modal State
  const [showAvatarModal, setShowAvatarModal] = useState(false)
  const [avatarCategory, setAvatarCategory] = useState<'bottts' | 'avataaars' | 'lorelei' | 'portraits' | 'custom'>('bottts')
  const [customCdnUrl, setCustomCdnUrl] = useState('')

  const cdnPresets = {
    bottts: [
      'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Aneka',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Zoe',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Pepper',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Casper',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Milo',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Leo',
      'https://api.dicebear.com/7.x/bottts/svg?seed=Willow',
    ],
    avataaars: [
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Alexander',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Samantha',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Ethan',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Isabella',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Mason',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    ],
    lorelei: [
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Charlie',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Luna',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Max',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Maya',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Oscar',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Teddy',
      'https://api.dicebear.com/7.x/lorelei/svg?seed=Grace',
    ],
    portraits: [
      'https://i.pravatar.cc/150?img=12',
      'https://i.pravatar.cc/150?img=32',
      'https://i.pravatar.cc/150?img=68',
      'https://i.pravatar.cc/150?img=47',
      'https://i.pravatar.cc/150?img=60',
      'https://i.pravatar.cc/150?img=59',
      'https://i.pravatar.cc/150?img=33',
      'https://i.pravatar.cc/150?img=18',
    ]
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showToast({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select an image file (PNG, JPG, WEBP).'
      })
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: 'File Too Large',
        message: 'Please choose an image smaller than 5MB.'
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_SIZE = 300
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width)
            width = MAX_SIZE
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height)
            height = MAX_SIZE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85)
        setProfilePic(compressedBase64)
        showToast({
          type: 'success',
          title: 'Photo Selected',
          message: 'Click "Save Profile Changes" to save your new profile picture.'
        })
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

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
    } else if (themeMode === 'slate') {
      bg = '#eef2f7'
      bgSidebar = '#091322'
      bgCard = '#ffffff'
      fg = '#0f172a'
      border = '#cbd5e1'
      input = '#ffffff'
      textPrimary = '#0f172a'
      textSecondary = '#334155'
      textMuted = '#64748b'
      bgHover = '#f1f5f9'
      colorScheme = 'light'

      chatUserBg = '#f1f5f9'
      chatUserBorder = '#cbd5e1'
      chatUserText = '#0f172a'
      chatAiBg = '#dbeafe'
      chatAiBorder = 'rgba(15, 89, 164, 0.4)'
      chatAiText = '#0f59a4'
    }

    const hovers: Record<string, string> = {
      '#007acc': '#0e639c',
      '#6a9955': '#5a8248',
      '#ce9178': '#b78069',
      '#8a2be2': '#7324bd',
      '#f44747': '#d83a3a',
      '#0f59a4': '#0a4682',
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
      setApiKeys((prev) => prev.filter((k) => k.id !== id))
      showToast({
        type: 'success',
        title: 'Token Revoked',
        message: 'The API key was successfully revoked.',
      })
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err.message || 'Failed to revoke token',
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
        profile_pic?: string
        created_at: string
      }>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: fullName,
          email: email,
          profile_pic: profilePic
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
          <button
            onClick={() => setActiveTab('seo')}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'seo' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0 text-amber-500" />
            SEO & Link Previews
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
                  <div className="flex items-center gap-5 mb-6">
                    <div className="relative group">
                      <div className="w-20 h-20 rounded-md border-2 border-border bg-input flex items-center justify-center text-text-secondary overflow-hidden shadow-sm">
                        {profilePic ? (
                          <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-2xl uppercase">
                            {profile.full_name ? profile.full_name.charAt(0) : (profile.username || 'U').charAt(0)}
                          </div>
                        )}
                      </div>
                      
                      {/* Edit Overlay Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium rounded-md cursor-pointer gap-1"
                        title="Change Profile Photo"
                      >
                        <Camera className="w-5 h-5 text-white" />
                        Change
                      </button>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                      />
                    </div>

                    <div className="space-y-1.5 flex-1">
                      <p className="text-lg font-semibold text-text-primary">
                        {profile.full_name ? profile.full_name.charAt(0).toUpperCase() + profile.full_name.slice(1) : (profile.username || '').charAt(0).toUpperCase() + (profile.username || '').slice(1)}
                      </p>
                      <p className="text-xs text-text-secondary">
                        Username: <span className="font-mono text-text-primary font-semibold">{(profile.username || '').charAt(0).toUpperCase() + (profile.username || '').slice(1)}</span> • <span className="px-1.5 py-0.5 bg-primary/15 text-primary rounded text-[10px] font-bold uppercase">{profile.role?.replace('_', ' ').toUpperCase()}</span>
                      </p>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-2.5 py-1 bg-input border border-border hover:bg-bg-hover text-text-primary text-xs font-medium rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3 h-3 text-primary" />
                          Upload Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAvatarModal(true)}
                          className="px-2.5 py-1 bg-primary/10 border border-primary/30 hover:bg-primary/20 text-primary text-xs font-medium rounded-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          Choose Preset / CDN Avatar
                        </button>
                        {profilePic && (
                          <button
                            type="button"
                            onClick={() => setProfilePic('')}
                            className="px-2.5 py-1 bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 text-destructive text-xs font-medium rounded-sm transition-colors cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </div>
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
                    { id: 'slate', label: 'Slate Clean', desc: 'Ice Canvas' },
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

        {/* SEO & Link Previews Tab */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start animate-fade-in pb-8">
            {/* SEO Metadata Form */}
            <div className="bg-card border border-border rounded-sm p-6 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2 uppercase tracking-wider border-b border-border pb-2 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                SEO Metadata Configuration
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Configure meta titles, tags, descriptions, and site identities. Previews will automatically generate and update below.
              </p>

              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Meta Title / Page Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Optimal length: 50–60 characters. Current: {seoTitle.length} characters.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Meta Description
                  </label>
                  <textarea
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors resize-none"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Optimal length: 150–160 characters. Current: {seoDescription.length} characters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                      Site Name (OpenGraph)
                    </label>
                    <input
                      type="text"
                      value={seoSiteName}
                      onChange={(e) => setSeoSiteName(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                      Canonical Share URL
                    </label>
                    <input
                      type="text"
                      value={seoTargetUrl}
                      onChange={(e) => setSeoTargetUrl(e.target.value)}
                      className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Meta Keywords (Comma-Separated)
                  </label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      localStorage.setItem('dep-seo-title', seoTitle)
                      localStorage.setItem('dep-seo-desc', seoDescription)
                      localStorage.setItem('dep-seo-keywords', seoKeywords)
                      localStorage.setItem('dep-seo-sitename', seoSiteName)
                      localStorage.setItem('dep-seo-url', seoTargetUrl)
                      showToast({
                        type: 'success',
                        title: 'SEO Settings Saved',
                        message: 'Metadata configurations saved in local container state.',
                      })
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-hover transition-colors cursor-pointer"
                  >
                    Save Metadata Configuration
                  </button>
                </div>
              </div>
            </div>

            {/* Link Previews Panel */}
            <div className="space-y-6">
              
              {/* Google Search Snippet Preview */}
              <div className="bg-card border border-border rounded-sm p-6 space-y-3">
                <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border/45 pb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-primary" /> Google Search Preview
                </h4>
                <div className="font-sans py-1">
                  <div className="flex items-center gap-2 text-xs text-[#202124] dark:text-[#bdc1c6] mb-1">
                    <span className="w-4 h-4 bg-input border border-border/80 rounded-full flex items-center justify-center font-bold text-[9px] text-primary flex-shrink-0">
                      DEP
                    </span>
                    <span className="truncate">{seoTargetUrl}</span>
                  </div>
                  <a href="#" className="text-[#1a0dab] dark:text-[#8ab4f8] text-[19px] hover:underline block leading-tight font-medium mb-1">
                    {seoTitle}
                  </a>
                  <p className="text-[14px] text-[#4d5156] dark:text-[#bdc1c6] leading-snug">
                    {seoDescription}
                  </p>
                </div>
              </div>

              {/* Slack Card Preview */}
              <div className="bg-card border border-border rounded-sm p-6 space-y-3">
                <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border/45 pb-1.5 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-success" /> Slack Attachment Preview
                </h4>
                
                <div className="bg-[#1a1d21] text-[#d1d2d3] border border-border/60 p-4 rounded-lg font-sans space-y-2">
                  <div className="flex gap-2.5 items-start">
                    <div className="w-9 h-9 bg-primary/20 text-primary border border-primary/30 rounded flex items-center justify-center font-bold text-xs flex-shrink-0">
                      DEP
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#f8f8f8]">Data Explorer Bot</span>
                        <span className="text-[10px] text-text-muted">12:35 PM</span>
                      </div>
                      <p className="text-text-secondary">Here is the link for our workspace app:</p>
                      
                      {/* Slack Rich Embed block */}
                      <div className="flex gap-3 border-l-4 pl-3 py-0.5 mt-2" style={{ borderLeftColor: accentColor }}>
                        <div className="space-y-1 max-w-md">
                          <p className="text-[11px] text-text-secondary">{seoSiteName}</p>
                          <a href="#" className="font-bold text-[#e8912d] hover:underline font-sans" style={{ color: accentColor }}>
                            {seoTitle}
                          </a>
                          <p className="text-text-secondary leading-relaxed">{seoDescription}</p>
                        </div>
                        
                        {/* Right-aligned image representing OG image / logo */}
                        <div className="w-16 h-16 bg-white border border-border/80 rounded flex items-center justify-center p-2 flex-shrink-0">
                          <img src="/dep-logo-light-transparent.png" alt="DEP Logo" className="w-full h-full object-contain" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Twitter Card Preview */}
              <div className="bg-card border border-border rounded-sm p-6 space-y-3">
                <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border/45 pb-1.5 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-sky-400" /> Twitter (X) Card Preview
                </h4>
                
                <div className="bg-black border border-[#2f3336] p-4 rounded-xl font-sans space-y-3">
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center p-1 flex-shrink-0">
                      <img src="/dep-logo-light-transparent.png" alt="DEP Logo" className="w-full h-full object-contain" />
                    </div>
                    <div className="text-xs">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-white hover:underline">DEP Platform</span>
                        <span className="text-text-muted">@DEPPlatform • 1h</span>
                      </div>
                      <p className="text-white mt-0.5">Explore our data dictionary catalogs and managed Jupyter notebooks securely.</p>
                    </div>
                  </div>

                  {/* Summary Card with large image */}
                  <div className="border border-[#2f3336] rounded-2xl overflow-hidden hover:bg-[#070707] transition-all cursor-pointer">
                    {/* Visual Card Banner using Official DEP Brand Logo on Plain White Background */}
                    <div className="h-44 bg-white flex flex-col items-center justify-center gap-2 relative overflow-hidden p-4">
                      <img src="/dep-logo-light-transparent.png" alt="DEP Official Logo" className="h-28 object-contain" />
                    </div>

                    <div className="p-3 text-[13px] border-t border-[#2f3336] space-y-0.5">
                      <p className="text-[11px] text-text-muted uppercase tracking-wide">
                        {(() => {
                          try {
                            return new URL(seoTargetUrl).hostname;
                          } catch {
                            return 'dep.rohanpawar.app';
                          }
                        })()}
                      </p>
                      <p className="font-semibold text-white truncate">{seoTitle}</p>
                      <p className="text-text-secondary text-xs line-clamp-2 leading-relaxed">
                        {seoDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discord Embed Preview */}
              <div className="bg-card border border-border rounded-sm p-6 space-y-3">
                <h4 className="text-[11px] font-bold text-text-secondary uppercase tracking-wider border-b border-border/45 pb-1.5 flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#5865F2]" /> Discord Embed Preview
                </h4>
                
                <div className="bg-[#2f3136] text-[#dcddde] p-4 rounded border-l-4 font-sans space-y-1 max-w-lg" style={{ borderLeftColor: accentColor }}>
                  <p className="text-[11px] text-[#b9bbbe] uppercase font-bold tracking-wider">{seoSiteName}</p>
                  <a href="#" className="text-[14px] text-[#00b0f4] hover:underline font-bold block leading-snug">
                    {seoTitle}
                  </a>
                  <p className="text-[13px] text-[#dcddde] leading-snug pt-1">
                    {seoDescription}
                  </p>
                  <div className="flex items-center gap-2 pt-2 text-[11px] text-[#b9bbbe]">
                    <span className="w-3.5 h-3.5 bg-input border border-border/60 rounded-full flex items-center justify-center font-bold text-[8px] text-primary flex-shrink-0" style={{ color: accentColor }}>
                      DEP
                    </span>
                    <span>DEP Workbench</span>
                  </div>
                </div>
              </div>

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

      {/* Avatar Selector / CDN Gallery Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 z-[100000] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-sm p-6 max-w-xl w-full space-y-5 shadow-2xl relative animate-scale-in">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Avatar Gallery & CDN Selector
                </h3>
              </div>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 hover:bg-input rounded text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Category Switcher Tabs */}
            <div className="flex gap-1 bg-input border border-border p-1 rounded-sm overflow-x-auto">
              <button
                type="button"
                onClick={() => setAvatarCategory('bottts')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                  avatarCategory === 'bottts' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Robots (Bottts)
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('avataaars')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                  avatarCategory === 'avataaars' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                People (Avataaars)
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('lorelei')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                  avatarCategory === 'lorelei' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Illustrated (Lorelei)
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('portraits')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                  avatarCategory === 'portraits' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Real Portraits (Pravatar)
              </button>
              <button
                type="button"
                onClick={() => setAvatarCategory('custom')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all whitespace-nowrap cursor-pointer ${
                  avatarCategory === 'custom' ? 'bg-primary text-white font-bold' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Custom CDN URL
              </button>
            </div>

            {/* Category Presets Grid */}
            {avatarCategory !== 'custom' ? (
              <div className="grid grid-cols-4 gap-3 max-h-64 overflow-y-auto p-1">
                {cdnPresets[avatarCategory].map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setProfilePic(url)
                      setShowAvatarModal(false)
                      showToast({
                        type: 'success',
                        title: 'Avatar Selected',
                        message: 'Click "Save Profile Changes" to update your profile picture.'
                      })
                    }}
                    className={`aspect-square rounded-md border-2 p-1.5 bg-input hover:border-primary transition-all flex items-center justify-center cursor-pointer group ${
                      profilePic === url ? 'border-primary ring-2 ring-primary/40' : 'border-border/60'
                    }`}
                  >
                    <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                  </button>
                ))}
              </div>
            ) : (
              /* Custom CDN URL Input Form */
              <div className="space-y-4 py-2">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-2 uppercase">
                    Direct Image CDN / Web URL
                  </label>
                  <input
                    type="text"
                    value={customCdnUrl}
                    onChange={(e) => setCustomCdnUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-... or https://api.dicebear.com/..."
                    className="w-full bg-input border border-border rounded-sm px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary transition-colors font-mono"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Paste any public image link from Unsplash, Imgur, Cloudinary, Gravatar, or DiceBear.
                  </p>
                </div>

                {customCdnUrl && (
                  <div className="flex items-center gap-3 p-3 bg-input border border-border rounded-sm">
                    <div className="w-12 h-12 rounded border border-border overflow-hidden flex-shrink-0 bg-card">
                      <img
                        src={customCdnUrl}
                        alt="CDN Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => (e.currentTarget.src = '/placeholder-user.jpg')}
                      />
                    </div>
                    <div className="text-xs">
                      <p className="font-semibold text-text-primary">Image URL Preview</p>
                      <p className="text-[10px] text-text-muted truncate max-w-xs">{customCdnUrl}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!customCdnUrl.trim()) return
                      setProfilePic(customCdnUrl.trim())
                      setShowAvatarModal(false)
                      showToast({
                        type: 'success',
                        title: 'CDN Avatar Applied',
                        message: 'Click "Save Profile Changes" to update your profile picture.'
                      })
                    }}
                    disabled={!customCdnUrl.trim()}
                    className="px-4 py-2 bg-primary text-white rounded-sm text-xs font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Use This Image URL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
