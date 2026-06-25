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
        <label className="text-sm font-medium text-[#e8e8e8]">{label}</label>
        {required && <span className="text-[#f44747] text-xs">*</span>}
      </div>

      {description && (
        <p className="text-xs text-[#808080] mb-2">{description}</p>
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
        } bg-[#2d2d2d] border border-[#2b2b2b] rounded text-[#e8e8e8] placeholder-[#606060] focus:border-[#007acc] focus:outline-none transition-colors ${className}`}
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
      className={`w-full px-3 py-2 bg-[#2d2d2d] border border-[#2b2b2b] rounded text-[#e8e8e8] placeholder-[#606060] focus:border-[#007acc] focus:outline-none transition-colors resize-vertical ${className}`}
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
      className={`w-full px-3 py-2 bg-[#2d2d2d] border border-[#2b2b2b] rounded text-[#e8e8e8] focus:border-[#007acc] focus:outline-none transition-colors cursor-pointer ${className}`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-[#1e1e1e]">
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
        className={`w-4 h-4 accent-[#007acc] cursor-pointer ${className}`}
      />
      {label && (
        <label className="text-sm text-[#e8e8e8] cursor-pointer">{label}</label>
      )}
    </div>
  )
}
