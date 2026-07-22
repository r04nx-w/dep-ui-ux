'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { apiFetch } from '@/lib/api'

// Simple helper to capitalize first letter
export function capitalize(str: string): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

interface UserBadgeProps {
  username: string
  avatarSize?: 'xs' | 'sm' | 'md' | 'lg'
  showRoleSubtext?: boolean
  roleSubtext?: string
  fullName?: string
  email?: string
  role?: string
  joinedDate?: string
  className?: string
  withBackground?: boolean
  hideName?: boolean
  isClickable?: boolean
  showFirstNameOnly?: boolean
}

export function UserBadge({ 
  username, 
  avatarSize = 'sm', 
  showRoleSubtext = false,
  roleSubtext,
  fullName: initialFullName,
  email: initialEmail,
  role: initialRole,
  joinedDate: initialJoinedDate,
  className = '',
  withBackground = false,
  hideName = false,
  isClickable = true,
  showFirstNameOnly = false
}: UserBadgeProps) {
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [userDetails, setUserDetails] = useState<{
    fullName?: string
    email?: string
    role?: string
    joinedDate?: string
    status?: string
  } | null>(null)

  const handleOpenModal = async (e: React.MouseEvent) => {
    if (!isClickable) return
    e.stopPropagation()
    setShowModal(true)
    
    // If we already have the complete details, don't fetch again
    if (userDetails || (initialFullName && initialEmail && initialRole)) {
      return
    }

    setLoading(true)
    try {
      const usersList = await apiFetch('/users')
      if (Array.isArray(usersList)) {
        const found = usersList.find((u: any) => u.username.toLowerCase() === username.replace(/^@/, '').toLowerCase())
        if (found) {
          setUserDetails({
            fullName: found.full_name || 'Not Provided',
            email: found.email || 'Not Provided',
            role: found.role,
            joinedDate: found.created_at,
            status: found.status
          })
        }
      }
    } catch (err) {
      console.error("Failed to load user details", err)
    } finally {
      setLoading(false)
    }
  }

  // Capitalize name and strip '@'
  const cleanName = username.replace(/^@/, '')
  const capitalizedName = capitalize(cleanName)

  // Avatar sizes classes
  const sizeMap = {
    xs: 'w-4 h-4 text-[9px]',
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  }
  
  // Render square placeholder picture: "placeholder image must always be square no round"
  const avatarClass = `${sizeMap[avatarSize]} rounded-sm object-cover border border-border/40 flex-shrink-0 bg-input`

  // Determine primary name label: prioritize full name, fallback to username
  const resolvedFullName = (initialFullName && initialFullName !== 'Not Provided') 
    ? capitalize(initialFullName) 
    : (userDetails?.fullName && userDetails.fullName !== 'Not Provided') 
      ? capitalize(userDetails.fullName) 
      : capitalizedName

  const primaryName = showFirstNameOnly ? resolvedFullName.split(' ')[0] : resolvedFullName

  const badgeContent = (
    <div 
      onClick={handleOpenModal}
      className={`inline-flex items-center gap-2 ${isClickable ? 'cursor-pointer hover:opacity-80' : ''} ${withBackground ? 'px-2 py-1 bg-bg-hover border border-border rounded-sm' : ''} ${className}`}
    >
      <img 
        src="/placeholder-user.jpg" 
        alt={username} 
        className={avatarClass}
      />
      {!hideName && (
        <div className="flex flex-col text-left">
          <span className="text-text-primary font-semibold leading-tight text-xs">
            {primaryName}
          </span>
          {showRoleSubtext ? (
            <span className="text-[10px] text-text-muted leading-none mt-0.5">
              {roleSubtext || 'Collaborator'}
            </span>
          ) : (
            primaryName !== capitalizedName && (
              <span className="text-[10px] text-text-muted leading-none mt-0.5 font-mono">
                {capitalizedName}
              </span>
            )
          )}
        </div>
      )}
    </div>
  )

  // Get display values
  const displayFullName = userDetails?.fullName || initialFullName || 'Not Provided'
  const displayEmail = userDetails?.email || initialEmail || 'Not Provided'
  const displayRole = userDetails?.role || initialRole || 'ANALYST'
  const displayJoined = userDetails?.joinedDate || initialJoinedDate || ''
  const displayStatus = userDetails?.status || 'active'

  return (
    <>
      {badgeContent}

      {/* User Information Modal */}
      {showModal && (
        <Modal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
          title="User Profile Details"
          size="md"
        >
          <div className="space-y-6 animate-fade-in text-text-primary">
            {/* Header / Identity with SQUARE avatar */}
            <div className="bg-bg-hover p-4 rounded border border-border flex items-center gap-4">
              <img 
                src="/placeholder-user.jpg" 
                alt={username} 
                className="w-16 h-16 rounded-none border border-border object-cover bg-input flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-text-primary truncate">
                  {capitalize(displayFullName)}
                </h3>
                <p className="text-sm text-text-secondary font-medium">Username: {capitalizedName}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary font-bold uppercase tracking-wider rounded-sm">
                    {displayRole.toUpperCase()}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 border rounded-sm font-bold uppercase ${
                    displayStatus === 'active' 
                      ? 'border-[#4caf50]/20 bg-[#4caf50]/10 text-[#4caf50]' 
                      : 'border-text-muted/20 bg-text-muted/10 text-text-muted'
                  }`}>
                    {displayStatus}
                  </span>
                </div>
              </div>
            </div>

            {/* Profile Info Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-input p-4 rounded border border-border">
              <div>
                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Email Address</p>
                <p className="text-xs font-medium text-text-primary mt-1 break-all">{displayEmail}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider">Member Since</p>
                <p className="text-xs font-medium text-text-primary mt-1">
                  {displayJoined ? new Date(displayJoined).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : 'Not Provided'}
                </p>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end border-t border-border/40 pt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-input border border-border hover:bg-bg-hover text-text-primary text-xs font-semibold rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
