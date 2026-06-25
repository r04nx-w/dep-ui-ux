'use client'

import { Database } from 'lucide-react'

interface DatabaseLogoProps {
  type: 'mysql' | 'postgresql' | 'snowflake' | 'bigquery' | 'csv' | 'parquet'
  size?: 'sm' | 'md' | 'lg'
}

const logoMap = {
  mysql: { bg: '#00758f', label: 'MySQL' },
  postgresql: { bg: '#336791', label: 'PostgreSQL' },
  snowflake: { bg: '#29b5e8', label: 'Snowflake' },
  bigquery: { bg: '#669df6', label: 'BigQuery' },
  csv: { bg: '#559d3d', label: 'CSV' },
  parquet: { bg: '#8b5cf6', label: 'Parquet' },
}

const sizeMap = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
}

export function DatabaseLogo({ type, size = 'md' }: DatabaseLogoProps) {
  const logo = logoMap[type]
  const sizeClass = sizeMap[size]

  return (
    <div className={`${sizeClass} flex items-center justify-center rounded text-white font-bold`}
      style={{ backgroundColor: logo.bg }}
    >
      {type.slice(0, 2).toUpperCase()}
    </div>
  )
}
