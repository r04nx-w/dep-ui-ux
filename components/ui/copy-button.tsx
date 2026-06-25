'use client'

import React, { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyButtonProps {
  content: string
  label?: string
  className?: string
  size?: 'sm' | 'md'
  onCopy?: () => void
}

export function CopyButton({
  content,
  label = 'Copy',
  className = '',
  size = 'sm',
  onCopy,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      onCopy?.()
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-1.5 rounded transition-all ${
        copied
          ? 'bg-[#6a9955]/20 text-[#7cb342] border border-[#6a9955]/30'
          : 'bg-[#2b2b2b] text-[#a0a0a0] hover:text-[#e8e8e8] hover:bg-[#37373d] border border-[#2b2b2b]'
      } ${sizeClasses[size]} font-medium ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          {label === 'Copy' ? 'Copied!' : label}
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          {label}
        </>
      )}
    </button>
  )
}
