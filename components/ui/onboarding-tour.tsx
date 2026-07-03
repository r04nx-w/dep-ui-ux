'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, ArrowRight } from 'lucide-react'

interface TourStep {
  targetId: string | null
  title: string
  description: string
  actionHint?: string
  checkComplete?: (params: { currentPage: string; isModalOpen: boolean }) => boolean
}

interface OnboardingTourProps {
  isOpen: boolean
  onClose: () => void
  currentPage: string
  username: string
  tourName?: string
  userRole?: 'admin' | 'onboarder' | 'analyst'
}


const tourRegistry: Record<string, TourStep[]> = {
  overview: [
    {
      targetId: null,
      title: 'Welcome to DEP Workbench!',
      description: 'The Data Exploration Platform (DEP) is a secure and collaborative playground designed for dataset ingestion, visual data catalogs, masking policy governance, and model training in JupyterLab. Let\'s get you familiarized with the core systems.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-dashboard',
      title: '1. Platform Dashboard',
      description: 'This is your main dashboard showing high-level operational statistics. You can monitor active database connections, team sizes, policy violations, access request lists, and overall audit outcomes at a single glance.',
      actionHint: 'Click "Next" to continue.',
    },
    {
      targetId: 'tour-sidebar-tutorials',
      title: '2. Interactive Tutorials Hub',
      description: 'Find standard copyable code snippets for our SDK, policy guidelines, and database connection forms. Try running SDK functions like dep.whoami() directly inside the integrated CLI dry-run terminal.',
      actionHint: 'Click "Next" to check workspaces.',
    },
    {
      targetId: 'tour-sidebar-workspaces',
      title: '3. Isolated Jupyter Workspaces',
      description: 'Create and open isolated JupyterLite sandbox workspaces. Run live Python scripts and explore datasets dynamically without leaving the platform.',
      actionHint: 'Click "Next" to see ACL Policies.',
    },
    {
      targetId: 'tour-sidebar-acl',
      title: '4. Governance & ACL Policies',
      description: 'Define secure access controls, column masking, and row-level security filters on sensitive data resources. Changes apply instantly.',
      actionHint: 'Click "Next" to check audit trail.',
    },
    {
      targetId: 'tour-sidebar-audit',
      title: '5. Platform Audit Trails',
      description: 'Comprehensive, verbose logging is active. Every query, profile change, and dataset download is audited for compliance and accountability.',
      actionHint: 'Click "Finish" to complete the guide.',
    }
  ],
  'onboard-db': [
    {
      targetId: null,
      title: 'MySQL & PostgreSQL Integration',
      description: 'Fernet encryption securely guards database credentials when connecting data sources to the registry.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-connections',
      title: 'Connections Manager',
      description: '👉 Click the "Connections" option in the sidebar to open the database connector registry.',
      actionHint: '👉 Click "Connections" in the sidebar.',
      checkComplete: ({ currentPage }) => currentPage === 'connections',
    },
    {
      targetId: 'tour-add-connection-btn',
      title: 'Connecting Data Sources',
      description: 'This page shows configured database connections and uploaded CSV catalogs. To connect a new data source, click the "Add Connection" button in the top right.',
      actionHint: '👉 Click the "Add Connection" button.',
      checkComplete: ({ isModalOpen }) => isModalOpen,
    },
    {
      targetId: 'tour-source-name-input',
      title: 'Name Your Data Source',
      description: 'Assign a clean, unique name for the registry. Analysts will use this exact name inside Jupyter Notebooks (e.g. using `dep_sdk.access("your_name")` calls) to explore the data with automated policies applied.',
      actionHint: 'Click "Next" to check types.',
    },
    {
      targetId: 'tour-source-type-select',
      title: 'Select Connector Type',
      description: 'Choose your dataset format. PostgreSQL/MySQL connections require database coordinates and target credentials. Selecting "CSV File" switches to a clean upload form which uploads files directly into the MinIO storage bucket.',
      actionHint: 'Click "Next" to see how to cancel.',
    },
    {
      targetId: 'tour-modal-cancel-btn',
      title: 'Finish the Walkthrough',
      description: 'Excellent work! You now understand the basic registration flow. Click "Cancel" to close the connection modal, exit the guide, and start exploring the workbench.',
      actionHint: '👉 Click "Cancel" to finish the tour.',
      checkComplete: ({ isModalOpen }) => !isModalOpen,
    }
  ],
  'create-acl': [
    {
      targetId: null,
      title: 'Creating Access Security Rules',
      description: 'Apply column-level masking (e.g., hashing user IDs) and row filters corresponding to analyst roles.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-acl',
      title: 'Governance & ACL Builder',
      description: '👉 Click the "Governance & ACL" option in the sidebar to manage columns and secure active catalogs.',
      actionHint: '👉 Click "Governance & ACL" in the sidebar.',
      checkComplete: ({ currentPage }) => currentPage === 'acl',
    }
  ],
  'manage-projects': [
    {
      targetId: null,
      title: 'Creating Project Workspaces',
      description: 'Collaborate with teams by setting up Git sync proxies, notebook paths, and user permission matrices.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-workspaces',
      title: 'Workspace Registry',
      description: '👉 Click "Project Workspaces" in the sidebar to open the workspace registry.',
      actionHint: '👉 Click "Project Workspaces" in the sidebar.',
      checkComplete: ({ currentPage }) => currentPage === 'workspaces',
    }
  ],
  'access-workspace': [
    {
      targetId: null,
      title: 'Jupyter Sandbox Access',
      description: 'Launch isolated Pyodide browser kernels or fully managed JupyterHub notebooks for analysis.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-workspaces',
      title: 'Sidebar Workspaces Link',
      description: '👉 Click "Project Workspaces" in the sidebar to open the Jupyter Lite Sandbox workspace.',
      actionHint: '👉 Click "Project Workspaces" in the sidebar.',
      checkComplete: ({ currentPage }) => currentPage === 'workspaces',
    }
  ],
  'share-outputs': [
    {
      targetId: null,
      title: 'Saving & Sharing Notebook Artifacts',
      description: 'Store dataset summaries or model files inside S3/MinIO containers and secure share access policies.',
      actionHint: 'Click "Start Guide" to begin.',
    },
    {
      targetId: 'tour-sidebar-artifacts',
      title: 'Saved Artifacts Catalog',
      description: '👉 Click the "Saved Artifacts" option in the sidebar to review files saved via SDK functions.',
      actionHint: '👉 Click "Saved Artifacts" in the sidebar.',
      checkComplete: ({ currentPage }) => currentPage === 'artifacts',
    }
  ]
}

export function OnboardingTour({ isOpen, onClose, currentPage, username, tourName = 'overview', userRole }: OnboardingTourProps) {
  const [activeStep, setActiveStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [animate, setAnimate] = useState(false)
  const lastRectRef = React.useRef<DOMRect | null>(null)

  let steps = tourRegistry[tourName] || tourRegistry.overview

  // Filter steps based on role
  if (tourName === 'overview' && userRole) {
    steps = steps.filter(step => {
      if (step.targetId === 'tour-sidebar-acl') {
        return userRole === 'admin' || userRole === 'onboarder'
      }
      if (step.targetId === 'tour-sidebar-audit') {
        return userRole === 'admin'
      }
      return true
    })

    // Dynamically adjust actionHint of the last step to "Click 'Finish' to complete the guide."
    // and intermediate steps to "Click 'Next' to continue." or similar
    steps = steps.map((step, idx) => {
      if (idx === steps.length - 1) {
        return {
          ...step,
          actionHint: 'Click "Finish" to complete the guide.'
        }
      }
      return step
    })
  }

  // Stable handlers - defined before any useEffect that references them
  const handleComplete = React.useCallback(() => {
    localStorage.setItem(`dep_onboarding_completed_${username}`, 'true')
    onClose()
  }, [username, onClose])

  const handleNext = React.useCallback(() => {
    if (activeStep < steps.length - 1) {
      setActiveStep(prev => prev + 1)
    } else {
      handleComplete()
    }
  }, [activeStep, steps.length, handleComplete])

  // Reset steps when tour starts or changes
  useEffect(() => {
    if (isOpen) {
      setActiveStep(0)
      setRect(null)
      lastRectRef.current = null
    }
  }, [isOpen, tourName])

  useEffect(() => {
    if (rect) {
      lastRectRef.current = rect
    }
  }, [rect])

  useEffect(() => {
    if (!isOpen) return
    setAnimate(true)
    const timer = setTimeout(() => setAnimate(false), 500)
    return () => clearTimeout(timer)
  }, [activeStep, isOpen])

  useEffect(() => {
    if (!isOpen) return

    let rafId: number
    let active = true

    // Track last seen rect values to avoid unnecessary setState calls
    let lastX = 0, lastY = 0, lastW = 0, lastH = 0

    const updatePosition = () => {
      if (!active) return

      const currentStep = steps[activeStep]
      if (currentStep && currentStep.targetId) {
        const el = document.getElementById(currentStep.targetId)
        if (el) {
          const bounding = el.getBoundingClientRect()
          // Only call setRect when the position/size actually changed
          if (
            bounding.x !== lastX ||
            bounding.y !== lastY ||
            bounding.width !== lastW ||
            bounding.height !== lastH
          ) {
            lastX = bounding.x
            lastY = bounding.y
            lastW = bounding.width
            lastH = bounding.height
            setRect(bounding)
          }
        } else {
          setRect(null)
        }
      } else {
        setRect(null)
      }

      rafId = requestAnimationFrame(updatePosition)
    }

    rafId = requestAnimationFrame(updatePosition)

    // Check interactive completion on a slower interval (250ms) to avoid re-render storms
    const checkInterval = setInterval(() => {
      if (!active) return
      const currentStep = steps[activeStep]
      if (currentStep?.checkComplete) {
        const isModalOpen = document.getElementById('tour-source-name-input') !== null
        if (currentStep.checkComplete({ currentPage, isModalOpen })) {
          handleNext()
        }
      }
    }, 250)

    return () => {
      active = false
      cancelAnimationFrame(rafId)
      clearInterval(checkInterval)
    }
  }, [activeStep, isOpen, currentPage, steps, handleNext])

  const handleSkip = () => {
    handleComplete()
  }

  if (!isOpen) return null

  const step = steps[activeStep]
  if (!step) return null
  const isInteractive = !!step.checkComplete

  const popoverWidth = 380
  const popoverHeight = 240

  const getCoords = () => {
    const currentStep = steps[activeStep]
    const activeRect = rect || (currentStep.targetId ? lastRectRef.current : null)

    if (!activeRect) {
      return {
        popover: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(1)',
          width: `${popoverWidth}px`,
        },
        line: null,
      }
    }

    const spaceRight = window.innerWidth - activeRect.right
    const spaceBelow = window.innerHeight - activeRect.bottom
    const spaceLeft = activeRect.left

    let placement: 'right' | 'left' | 'below' | 'above' = 'right'

    if (spaceRight > popoverWidth + 30) {
      placement = 'right'
    } else if (spaceLeft > popoverWidth + 30) {
      placement = 'left'
    } else if (spaceBelow > popoverHeight + 30) {
      placement = 'below'
    } else {
      placement = 'above'
    }

    let left = 0
    let top = 0
    let lineStyle: React.CSSProperties | null = null

    // Helper to get visible sidebar width for clamping
    let sidebarWidthClamp = activeRect.width
    if (currentStep.targetId?.startsWith('tour-sidebar-')) {
      const sidebarParent = document.querySelector('nav')?.parentElement
      if (sidebarParent) {
        const sidebarRect = sidebarParent.getBoundingClientRect()
        if (activeRect.left + activeRect.width > sidebarRect.right) {
          sidebarWidthClamp = sidebarRect.right - activeRect.left - 8
        }
      }
    }

    if (placement === 'right') {
      left = activeRect.left + sidebarWidthClamp + 16
      top = activeRect.top + activeRect.height / 2 - popoverHeight / 2
      lineStyle = {
        left: `${activeRect.left + sidebarWidthClamp + 8}px`,
        top: `${activeRect.top + activeRect.height / 2 - 1}px`,
        width: '8px',
        height: '2px',
      }
    } else if (placement === 'left') {
      left = activeRect.left - popoverWidth - 16
      top = activeRect.top + activeRect.height / 2 - popoverHeight / 2
      lineStyle = {
        left: `${activeRect.left - 16}px`,
        top: `${activeRect.top + activeRect.height / 2 - 1}px`,
        width: '8px',
        height: '2px',
      }
    } else if (placement === 'below') {
      left = activeRect.left + sidebarWidthClamp / 2 - popoverWidth / 2
      top = activeRect.bottom + 16
      lineStyle = {
        left: `${activeRect.left + sidebarWidthClamp / 2 - 1}px`,
        top: `${activeRect.bottom + 8}px`,
        width: '2px',
        height: '8px',
      }
    } else {
      left = activeRect.left + sidebarWidthClamp / 2 - popoverWidth / 2
      top = activeRect.top - popoverHeight - 16
      lineStyle = {
        left: `${activeRect.left + sidebarWidthClamp / 2 - 1}px`,
        top: `${activeRect.top - 16}px`,
        width: '2px',
        height: '8px',
      }
    }

    // Boundary clamp to prevent clipping
    left = Math.max(16, Math.min(window.innerWidth - popoverWidth - 16, left))
    top = Math.max(16, Math.min(window.innerHeight - popoverHeight - 16, top))

    return {
      popover: {
        left: `${left}px`,
        top: `${top}px`,
        width: `${popoverWidth}px`,
      },
      line: lineStyle,
    }
  }

  const { popover: popoverStyle, line: lineStyle } = getCoords()

  // Clamp the spotlight overlay box width to respect sidebar container boundary
  let clampedWidth = rect ? rect.width : 0
  if (rect && step.targetId?.startsWith('tour-sidebar-')) {
    const sidebarParent = document.querySelector('nav')?.parentElement
    if (sidebarParent) {
      const sidebarRect = sidebarParent.getBoundingClientRect()
      if (rect.left + rect.width > sidebarRect.right) {
        clampedWidth = sidebarRect.right - rect.left - 8
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden select-none pointer-events-none">
      {/* Spotlight overlay */}
      {rect ? (
        <div
          className="fixed border-2 border-primary bg-transparent pointer-events-none transition-all duration-300 ease-out z-[9998]"
          style={{
            left: `${rect.left - 6}px`,
            top: `${rect.top - 6}px`,
            width: `${clampedWidth + 12}px`,
            height: `${rect.height + 12}px`,
            borderRadius: '6px',
            boxShadow: '0 0 0 9999px rgba(10, 10, 12, 0.75), 0 0 15px var(--primary)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-[#0a0a0c]/85 pointer-events-auto z-[9998]" />
      )}

      {/* Pointer Line */}
      {lineStyle && (
        <div
          className="fixed bg-primary pointer-events-none transition-all duration-300 z-[9999] opacity-80"
          style={lineStyle}
        />
      )}

      {/* Popover Bubble */}
      <div
        className="fixed bg-card/95 border border-border/60 rounded-xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] pointer-events-auto transition-all duration-300 z-[9999] scale-100 opacity-100"
        style={popoverStyle}
      >
        {/* Step Indicator */}
        <div className="flex justify-end mb-3">
          <button
            onClick={handleSkip}
            className="text-[10px] font-semibold text-text-muted hover:text-[#f44747] cursor-pointer"
          >
            Skip Guide
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold leading-none">
            {activeStep + 1}
          </span>
          {step.title}
        </h3>

        {/* Content Description */}
        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          {step.description}
        </p>

        {/* Interactive Action Guide */}
        {step.actionHint && (
          <div className="p-2.5 bg-input/50 border border-border/30 rounded-lg mb-4 text-xs font-semibold text-text-primary flex items-center gap-2">
            <span>{step.actionHint}</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex justify-end pt-2 border-t border-border/30">
          <div className="flex gap-2">
            {!isInteractive && (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md shadow-md cursor-pointer"
              >
                <span>{activeStep === 0 ? 'Start Guide' : activeStep === steps.length - 1 ? 'Finish' : 'Next'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
