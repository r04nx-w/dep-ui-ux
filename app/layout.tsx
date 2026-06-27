import { cookies } from 'next/headers'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DEP Workbench',
  description: 'Data Exploration & Governance Platform',
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#007acc',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Read style customization from cookies to avoid flash of unstyled content
  const cookieStore = await cookies()
  const accent = cookieStore.get('dep-accent-color')?.value || '#007acc'
  const font = cookieStore.get('dep-font-family')?.value || 'Inter'
  const theme = cookieStore.get('dep-theme-mode')?.value || 'dark'
  const radius = cookieStore.get('dep-border-radius')?.value || '2'

  // Pre-calculate variables based on theme selected
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

  // Get matching hover color
  const hovers: Record<string, string> = {
    '#007acc': '#0e639c',
    '#6a9955': '#5a8248',
    '#ce9178': '#b78069',
    '#8a2be2': '#7324bd',
    '#f44747': '#d83a3a',
  }
  const accentHover = hovers[accent] || accent

  const r = parseInt(radius, 10)
  const inlineStyles = {
    '--background': bg,
    '--bg-primary': bg,
    '--bg-sidebar': bgSidebar,
    '--bg-card': bgCard,
    '--foreground': fg,
    '--card': bgCard,
    '--card-foreground': fg,
    '--sidebar': bgSidebar,
    '--sidebar-foreground': fg,
    '--border': border,
    '--border-color': border,
    '--input': input,
    '--bg-input': input,
    '--text-primary': textPrimary,
    '--text-secondary': textSecondary,
    '--text-muted': textMuted,
    '--bg-hover': bgHover,
    '--primary': accent,
    '--color-primary': accent,
    '--primary-hover': accentHover,
    '--font-sans-custom': font,
    '--font-mono-custom': 'Fira Code',
    '--radius-sm-custom': `${r}px`,
    '--radius-md-custom': `${r}px`,
    '--radius-lg-custom': `${r + 1}px`,
    '--radius-xl-custom': `${r + 2}px`,
    '--radius-2xl-custom': `${r + 4}px`,
    '--radius-3xl-custom': `${r + 6}px`,
    '--radius-4xl-custom': `${r + 10}px`,
    colorScheme: colorScheme,
  } as React.CSSProperties

  return (
    <html lang="en" className={`${inter.variable} h-screen w-screen overflow-hidden`} style={inlineStyles}>
      <body className="font-sans antialiased bg-background text-foreground h-screen w-screen overflow-hidden flex flex-col" suppressHydrationWarning={true}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

