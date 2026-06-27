'use client'

import React from 'react'

type StatusType =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'masked'
  | 'blocked'
  | 'granted'
  | 'expired'

interface StatusBadgeProps {
  status: StatusType
  label?: string
  size?: 'sm' | 'md'
}

export function StatusBadge({
  status,
  label,
  size = 'sm',
}: StatusBadgeProps) {
  const statusConfig: Record<StatusType, { bg: string; text: string; label: string }> = {
    active: {
      bg: 'bg-[#6a9955]/10',
      text: '#7cb342',
      label: 'Active',
    },
    inactive: {
      bg: 'bg-[#606060]/10',
      text: '#a0a0a0',
      label: 'Inactive',
    },
    pending: {
      bg: 'bg-[#ce9178]/10',
      text: '#ffb84d',
      label: 'Pending',
    },
    approved: {
      bg: 'bg-[#6a9955]/10',
      text: '#7cb342',
      label: 'Approved',
    },
    rejected: {
      bg: 'bg-[#f44747]/10',
      text: '#ff6b6b',
      label: 'Rejected',
    },
    masked: {
      bg: 'bg-[#569cd6]/10',
      text: '#64b5f6',
      label: 'Masked',
    },
    blocked: {
      bg: 'bg-[#f44747]/10',
      text: '#ff6b6b',
      label: 'Blocked',
    },
    granted: {
      bg: 'bg-[#6a9955]/10',
      text: '#7cb342',
      label: 'Granted',
    },
    expired: {
      bg: 'bg-[#606060]/10',
      text: '#ff6b6b',
      label: 'Expired',
    },
  }

  const config = statusConfig[status]
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
  }

  return (
    <span
      className={`${config.bg} border border-[${config.text}]/30 rounded inline-block font-medium ${sizeClasses[size]}`}
      style={{
        color: config.text,
        borderColor: `${config.text}33`,
      }}
    >
      {label || config.label}
    </span>
  )
}
