import { cookies } from 'next/headers'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/toast'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DEP Workbench | Enterprise Data Exploration & Governance',
  description: 'Governed Data Exploration Platform (DEP) for secure SQL querying, JupyterLite notebooks, schema catalogs, and role-based access control compliance.',
  keywords: 'data exploration, data governance, JupyterLite, SQL editor, access control, database dictionary, compliance, PII masking',
  openGraph: {
    title: 'DEP Workbench - Enterprise Data Exploration & Governance',
    description: 'Secure, governed environment for running JupyterLite notebooks and SQL queries with dynamic column masking and row-level access control.',
    url: 'https://dep.rohanpawar.app/',
    siteName: 'DEP Platform',
    images: [
      {
        url: 'https://dep.rohanpawar.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DEP Workbench Banner',
      }
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DEP Workbench - Enterprise Data Exploration & Governance',
    description: 'Secure data exploration platform with built-in JupyterLite, SQL editor, and metadata access policy enforcement.',
    images: ['https://dep.rohanpawar.app/og-image.png'],
  },
  icons: {
    icon: [
      { url: 'https://dep.rohanpawar.app/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: 'https://dep.rohanpawar.app/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
    apple: [
      { url: 'https://dep.rohanpawar.app/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  },
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
  } else if (theme === 'slate') {
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
  }

  // Get matching hover color
  const hovers: Record<string, string> = {
    '#007acc': '#0e639c',
    '#6a9955': '#5a8248',
    '#ce9178': '#b78069',
    '#8a2be2': '#7324bd',
    '#f44747': '#d83a3a',
    '#0f59a4': '#0a4682',
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
    <html lang="en" data-theme={theme} className={`${inter.variable} h-screen w-screen overflow-hidden`} style={inlineStyles} suppressHydrationWarning={true}>
      <body className="font-sans antialiased bg-background text-foreground h-screen w-screen overflow-hidden flex flex-col" suppressHydrationWarning={true}>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

