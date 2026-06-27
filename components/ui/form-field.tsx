'use client'

import React from 'react'

interface FormFieldProps {
  label: string
  description?: string
  error?: string
  required?: boolean
  children: React.ReactNode
}

export function FormField({
  label,
  description,
  error,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="w-full">
      <div className="flex items-baseline gap-1 mb-2">
        <label className="text-sm font-medium text-text-primary">{label}</label>
        {required && <span className="text-[#f44747] text-xs">*</span>}
      </div>

      {description && (
        <p className="text-xs text-text-muted mb-2">{description}</p>
      )}

      <div className="mb-2">{children}</div>

      {error && <p className="text-xs text-[#f44747] mt-1">{error}</p>}
    </div>
  )
}

interface TextInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export function TextInput({ icon, className = '', ...props }: TextInputProps) {
  return (
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</div>}
      <input
        {...props}
        className={`w-full px-3 py-2 ${
          icon ? 'pl-10' : ''
        } bg-input border border-border rounded text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors ${className}`}
      />
    </div>
  )
}

interface TextAreaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export function TextArea({ className = '', ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2 bg-input border border-border rounded text-text-primary placeholder-text-muted focus:border-primary focus:outline-none transition-colors resize-vertical ${className}`}
    />
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[]
}

export function Select({ options, className = '', ...props }: SelectProps) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2 bg-input border border-border rounded text-text-primary focus:border-primary focus:outline-none transition-colors cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-card">
          {opt.label}
        </option>
      ))}
    </select>
  )
}

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        {...props}
        className={`w-4 h-4 accent-primary cursor-pointer ${className}`}
      />
      {label && (
        <label className="text-sm text-text-primary cursor-pointer">{label}</label>
      )}
    </div>
  )
}
