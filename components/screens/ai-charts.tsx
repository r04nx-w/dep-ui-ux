'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  Treemap,
} from 'recharts'

// ─── Platform Theme Colors (matches globals.css :root) ────────────────────────
// Primary VS-Code dark palette
const T = {
  bg:        '#181818',
  card:      '#1e1e1e',
  input:     '#2d2d2d',
  hover:     '#37373d',
  border:    '#2b2b2b',
  text:      '#cccccc',
  textSec:   '#a3a3a3',
  textMuted: '#606060',
  primary:   '#007acc',   // chart-1 — VS Code blue
  green:     '#6a9955',   // chart-2 — success
  blue:      '#569cd6',   // chart-3 — info
  orange:    '#ce9178',   // chart-4 — warning
  red:       '#f44747',   // chart-5 — danger
  purple:    '#c586c0',
  yellow:    '#dcdcaa',
  teal:      '#4ec9b0',
  peach:     '#f48771',
  lavender:  '#9cdcfe',
}

// Harmonious chart palette derived from platform syntax colors
const PALETTE = [
  T.primary,   // #007acc  blue
  T.teal,      // #4ec9b0  teal
  T.orange,    // #ce9178  peach
  T.green,     // #6a9955  green
  T.purple,    // #c586c0  purple
  T.blue,      // #569cd6  light blue
  T.yellow,    // #dcdcaa  yellow
  T.lavender,  // #9cdcfe  lavender
  T.peach,     // #f48771  salmon
  T.red,       // #f44747  red
]

const GRID_COLOR   = 'rgba(255,255,255,0.06)'
const TICK_COLOR   = '#606060'
const AXIS_COLOR   = '#2b2b2b'

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e1e1e',
      border: '1px solid #2b2b2b',
      borderRadius: 4,
      padding: '8px 12px',
      fontSize: 11,
      fontFamily: 'Inter, sans-serif',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
    }}>
      {label !== undefined && (
        <p style={{ color: '#a3a3a3', marginBottom: 4, fontSize: 10 }}>{label}</p>
      )}
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill || T.text, fontWeight: 600, margin: 0 }}>
          {p.name ? `${p.name}: ` : ''}
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
          {p.payload?.unit ? ` ${p.payload.unit}` : ''}
        </p>
      ))}
    </div>
  )
}

// ─── Custom Legend ─────────────────────────────────────────────────────────────
function renderLegend(value: string) {
  return <span style={{ color: T.textSec, fontSize: 11, fontFamily: 'Inter, sans-serif' }}>{value}</span>
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────
export function AIPieChart({ data, title, valueKey = 'value', nameKey = 'label' }: {
  data: any[]; title?: string; valueKey?: string; nameKey?: string
}) {
  const total = data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0)
  const RADIAN = Math.PI / 180
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.04) return null
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
        fontSize={10} fontWeight={600} fontFamily="Inter, sans-serif">
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data} dataKey={valueKey} nameKey={nameKey}
            cx="50%" cy="50%" outerRadius={110} innerRadius={52}
            paddingAngle={2} labelLine={false} label={renderLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]}
                stroke={T.card} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip content={<DarkTooltip />} />
          <Legend formatter={renderLegend} iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
      {total > 0 && (
        <p style={{ color: T.textMuted, fontSize: 10, marginTop: 4, fontFamily: 'Inter, sans-serif' }}>
          Total: {total.toLocaleString()}
        </p>
      )}
    </div>
  )
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────
export function AIBarChart({ data, title, xKey = 'label', bars, horizontal = false }: {
  data: any[]; title?: string; xKey?: string
  bars?: { key: string; label?: string; color?: string }[]
  horizontal?: boolean
}) {
  const resolvedBars = bars || Object.keys(data[0] || {})
    .filter(k => k !== xKey && typeof data[0][k] === 'number')
    .map((k, i) => ({ key: k, label: k, color: PALETTE[i % PALETTE.length] }))

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart
          data={data}
          layout={horizontal ? 'vertical' : 'horizontal'}
          margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={!horizontal} />
          {horizontal ? (
            <>
              <YAxis dataKey={xKey} type="category" tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} width={100} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
              <XAxis type="number" tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
              <YAxis tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} width={56} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
            </>
          )}
          <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Legend formatter={renderLegend} />
          {resolvedBars.map((b, i) => (
            <Bar key={b.key} dataKey={b.key} name={b.label || b.key}
              fill={b.color || PALETTE[i % PALETTE.length]}
              radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
              maxBarSize={40}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Line Chart ───────────────────────────────────────────────────────────────
export function AILineChart({ data, title, xKey = 'label', lines }: {
  data: any[]; title?: string; xKey?: string
  lines?: { key: string; label?: string; color?: string }[]
}) {
  const resolvedLines = lines || Object.keys(data[0] || {})
    .filter(k => k !== xKey && typeof data[0][k] === 'number')
    .map((k, i) => ({ key: k, label: k, color: PALETTE[i % PALETTE.length] }))

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={270}>
        <LineChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey={xKey} tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
          <YAxis tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} width={56} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Legend formatter={renderLegend} />
          {resolvedLines.map((l, i) => (
            <Line key={l.key} type="monotone" dataKey={l.key} name={l.label || l.key}
              stroke={l.color || PALETTE[i % PALETTE.length]} strokeWidth={2}
              dot={{ r: 3, fill: l.color || PALETTE[i % PALETTE.length], strokeWidth: 0 }}
              activeDot={{ r: 5, stroke: T.card, strokeWidth: 2 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Area Chart ───────────────────────────────────────────────────────────────
export function AIAreaChart({ data, title, xKey = 'label', areas }: {
  data: any[]; title?: string; xKey?: string
  areas?: { key: string; label?: string; color?: string }[]
}) {
  const resolvedAreas = areas || Object.keys(data[0] || {})
    .filter(k => k !== xKey && typeof data[0][k] === 'number')
    .map((k, i) => ({ key: k, label: k, color: PALETTE[i % PALETTE.length] }))

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
          <defs>
            {resolvedAreas.map((a, i) => {
              const color = a.color || PALETTE[i % PALETTE.length]
              return (
                <linearGradient key={a.key} id={`area-grad-${a.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              )
            })}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
          <XAxis dataKey={xKey} tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
          <YAxis tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} width={56} axisLine={{ stroke: AXIS_COLOR }} tickLine={false} />
          <Tooltip content={<DarkTooltip />} />
          <Legend formatter={renderLegend} />
          {resolvedAreas.map((a, i) => {
            const color = a.color || PALETTE[i % PALETTE.length]
            return (
              <Area key={a.key} type="monotone" dataKey={a.key} name={a.label || a.key}
                stroke={color} strokeWidth={2}
                fill={`url(#area-grad-${a.key})`}
              />
            )
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
export function AIRadarChart({ data, title, angleKey = 'label', radars }: {
  data: any[]; title?: string; angleKey?: string
  radars?: { key: string; label?: string; color?: string }[]
}) {
  const resolvedRadars = radars || Object.keys(data[0] || {})
    .filter(k => k !== angleKey)
    .map((k, i) => ({ key: k, label: k, color: PALETTE[i % PALETTE.length] }))

  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={290}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius={105}>
          <PolarGrid stroke={GRID_COLOR} />
          <PolarAngleAxis dataKey={angleKey} tick={{ fill: TICK_COLOR, fontSize: 11, fontFamily: 'Inter' }} />
          <Tooltip content={<DarkTooltip />} />
          <Legend formatter={renderLegend} />
          {resolvedRadars.map((r, i) => {
            const color = r.color || PALETTE[i % PALETTE.length]
            return (
              <Radar key={r.key} name={r.label || r.key} dataKey={r.key}
                stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2}
              />
            )
          })}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Treemap ──────────────────────────────────────────────────────────────────
function TreemapTile({ x, y, width, height, name, value, index }: any) {
  if (!width || !height || width < 10 || height < 10) return null
  const color = PALETTE[index % PALETTE.length]
  const showLabel  = width > 45 && height > 26
  const showValue  = width > 60 && height > 46
  return (
    <g>
      <rect x={x} y={y} width={width} height={height}
        fill={color} fillOpacity={0.8}
        rx={3} stroke={T.card} strokeWidth={2}
      />
      {showLabel && (
        <text x={x + width / 2} y={y + (showValue ? height / 2 - 8 : height / 2)}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.95)" fontSize={Math.min(13, width / 7)}
          fontWeight={600} fontFamily="Inter, sans-serif">
          {name}
        </text>
      )}
      {showValue && value !== undefined && (
        <text x={x + width / 2} y={y + height / 2 + 10}
          textAnchor="middle" dominantBaseline="middle"
          fill="rgba(255,255,255,0.55)" fontSize={Math.min(11, width / 8)}
          fontFamily="Inter, sans-serif">
          {Number(value).toLocaleString()}
        </text>
      )}
    </g>
  )
}

export function AITreemap({ data, title }: { data: any[]; title?: string }) {
  return (
    <div style={{ width: '100%' }}>
      <ResponsiveContainer width="100%" height={290}>
        <Treemap data={data} dataKey="value" content={<TreemapTile />} />
      </ResponsiveContainer>
    </div>
  )
}

// ─── Stat Bars (compliance limit visualizer) ──────────────────────────────────
export function AIStatBars({ data, title, maxValue, unit = '%' }: {
  data: { label: string; value: number; limit?: number; color?: string }[]
  title?: string; maxValue?: number; unit?: string
}) {
  const max = maxValue || Math.max(...data.map(d => Math.max(d.value, d.limit || 0))) * 1.2 || 100

  return (
    <div style={{ width: '100%' }}>
      {data.map((d, i) => {
        const pct     = Math.min(100, (d.value / max) * 100)
        const limitPct = d.limit !== undefined ? Math.min(100, (d.limit / max) * 100) : null
        const breached = d.limit !== undefined && d.value > d.limit
        const barColor = d.color || (breached ? T.red : T.primary)
        return (
          <div key={i} style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: T.textSec, fontSize: 11, fontFamily: 'Inter, sans-serif', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.label}
              </span>
              <span style={{ color: breached ? T.red : T.text, fontSize: 11, fontFamily: 'Fira Code, monospace', fontWeight: 700 }}>
                {d.value.toFixed(1)}{unit}
                {breached && d.limit !== undefined && (
                  <span style={{ color: '#ce9178', fontWeight: 400, fontSize: 10, marginLeft: 4 }}>
                    (+{(d.value - d.limit).toFixed(1)} over)
                  </span>
                )}
              </span>
            </div>
            <div style={{ position: 'relative', height: 20, background: T.input, borderRadius: 3, overflow: 'hidden', border: `1px solid ${T.border}` }}>
              {/* Fill bar */}
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: breached
                  ? `linear-gradient(90deg, ${T.red}99, ${T.red})`
                  : `linear-gradient(90deg, ${barColor}99, ${barColor})`,
                borderRadius: 3,
                transition: 'width 0.5s ease',
              }} />
              {/* Limit marker */}
              {limitPct !== null && (
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, left: `${limitPct}%`,
                  width: 2, background: '#dcdcaa', opacity: 0.9,
                }}
                  title={`Limit: ${d.limit}${unit}`}
                />
              )}
            </div>
            {d.limit !== undefined && (
              <div style={{ textAlign: 'right', marginTop: 2 }}>
                <span style={{ color: T.textMuted, fontSize: 9, fontFamily: 'Fira Code, monospace' }}>
                  limit: {d.limit}{unit}
                </span>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Compliance Matrix ────────────────────────────────────────────────────────
export function AIComplianceMatrix({ data, title }: {
  title?: string
  data: {
    portfolio: string
    severity: 'CRITICAL' | 'WARNING' | 'COMPLIANT'
    breaches?: { rule: string; message: string; severity: string }[]
    nav?: number
  }[]
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  const severityConfig = {
    CRITICAL:  { border: T.red,     badgeBg: 'rgba(244,71,71,0.15)',   badgeText: '#f48771', icon: '🔴' },
    WARNING:   { border: '#dcdcaa', badgeBg: 'rgba(220,220,170,0.12)', badgeText: '#dcdcaa', icon: '🟡' },
    COMPLIANT: { border: T.green,   badgeBg: 'rgba(106,153,85,0.12)',  badgeText: '#6a9955', icon: '🟢' },
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((row, i) => {
        const cfg = severityConfig[row.severity] || severityConfig.COMPLIANT
        const isOpen = expanded === row.portfolio
        const breaches = row.breaches || []

        return (
          <div key={i} style={{
            border: `1px solid ${cfg.border}33`,
            borderRadius: 6,
            overflow: 'hidden',
            background: `${cfg.border}08`,
          }}>
            <button
              onClick={() => setExpanded(isOpen ? null : row.portfolio)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', padding: '10px 14px',
                background: 'transparent', border: 'none', cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: 13 }}>{cfg.icon}</span>
                <span style={{ color: T.text, fontSize: 13, fontWeight: 600, fontFamily: 'Inter, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.portfolio}
                </span>
                {row.nav && (
                  <span style={{ color: T.textMuted, fontSize: 10, fontFamily: 'Fira Code, monospace', flexShrink: 0 }}>
                    ₹{(row.nav / 100000).toFixed(1)}L
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                {breaches.length > 0 && (
                  <span style={{
                    background: cfg.badgeBg, color: cfg.badgeText,
                    fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                    padding: '2px 7px', borderRadius: 3,
                  }}>
                    {breaches.length} breach{breaches.length > 1 ? 'es' : ''}
                  </span>
                )}
                <span style={{
                  background: cfg.badgeBg, color: cfg.badgeText,
                  fontSize: 10, fontWeight: 700, fontFamily: 'Inter, sans-serif',
                  padding: '2px 7px', borderRadius: 3,
                }}>
                  {row.severity}
                </span>
                <span style={{ color: T.textMuted, fontSize: 10 }}>{isOpen ? '▲' : '▼'}</span>
              </div>
            </button>

            {isOpen && (
              <div style={{ borderTop: `1px solid ${T.border}` }}>
                {breaches.length === 0 ? (
                  <div style={{ padding: '10px 14px', color: T.green, fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                    ✓ All policy rules satisfied
                  </div>
                ) : (
                  breaches.map((b, j) => (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '8px 14px',
                      borderTop: j > 0 ? `1px solid ${T.border}` : 'none',
                    }}>
                      <span style={{ fontSize: 11, marginTop: 2 }}>
                        {b.severity === 'CRITICAL' ? '🔴' : b.severity === 'WARNING' ? '🟡' : 'ℹ️'}
                      </span>
                      <div>
                        <p style={{ color: T.textSec, fontSize: 10, fontWeight: 600, margin: '0 0 2px', fontFamily: 'Inter, sans-serif', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {b.rule}
                        </p>
                        <p style={{ color: T.text, fontSize: 12, margin: 0, fontFamily: 'Inter, sans-serif' }}>
                          {b.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Mermaid Diagram ──────────────────────────────────────────────────────────
export function MermaidChart({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [rendered, setRendered] = useState(false)
  const id = useMemo(() => `mmd-${Math.random().toString(36).slice(2, 9)}`, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables: {
            // VS Code dark theme variables
            darkMode: true,
            background:          '#181818',
            mainBkg:             '#1e1e1e',
            nodeBorder:          '#2b2b2b',
            clusterBkg:          '#252526',
            titleColor:          '#cccccc',
            edgeLabelBackground: '#1e1e1e',
            lineColor:           '#007acc',
            primaryColor:        '#1e1e1e',
            primaryTextColor:    '#cccccc',
            primaryBorderColor:  '#007acc',
            secondaryColor:      '#252526',
            tertiaryColor:       '#2d2d2d',
            fontFamily:          'Inter, system-ui, sans-serif',
            fontSize:            '13px',
            // Pie chart colors
            pie1: '#007acc', pie2: '#4ec9b0', pie3: '#ce9178',
            pie4: '#6a9955', pie5: '#c586c0', pie6: '#569cd6',
            pie7: '#dcdcaa', pie8: '#9cdcfe',
          },
          flowchart:  { htmlLabels: true, curve: 'basis' },
          securityLevel: 'loose',
        })
        const { svg } = await mermaid.render(id, code.trim())
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg
          const svgEl = ref.current.querySelector('svg')
          if (svgEl) {
            svgEl.style.maxWidth = '100%'
            svgEl.style.height = 'auto'
            svgEl.style.borderRadius = '4px'
          }
          setRendered(true)
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Render error')
      }
    }
    run()
    return () => { cancelled = true }
  }, [code, id])

  if (error) {
    return (
      <div style={{ border: `1px solid ${T.red}44`, borderRadius: 6, padding: 12, background: `${T.red}08` }}>
        <p style={{ color: T.red, fontSize: 11, fontWeight: 600, marginBottom: 6 }}>⚠ Diagram error</p>
        <pre style={{ color: '#ce9178', fontSize: 10, fontFamily: 'Fira Code, monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
        <pre style={{ color: T.textMuted, fontSize: 10, marginTop: 8, fontFamily: 'Fira Code, monospace', whiteSpace: 'pre-wrap' }}>{code}</pre>
      </div>
    )
  }

  return (
    <div style={{
      width: '100%', minHeight: 120, display: 'flex', alignItems: 'center',
      justifyContent: 'center', position: 'relative',
    }}>
      {!rendered && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textMuted, fontSize: 11, fontFamily: 'Inter, sans-serif', position: 'absolute' }}>
          <div style={{
            width: 14, height: 14, border: `2px solid ${T.primary}`,
            borderTopColor: 'transparent', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          Rendering diagram…
        </div>
      )}
      <div ref={ref} style={{ width: '100%' }} />
    </div>
  )
}

// ─── Universal Dispatcher ─────────────────────────────────────────────────────
export type ChartSpec =
  | { type: 'pie';        title?: string; data: any[]; valueKey?: string; nameKey?: string }
  | { type: 'bar';        title?: string; data: any[]; xKey?: string; bars?: any[]; horizontal?: boolean }
  | { type: 'line';       title?: string; data: any[]; xKey?: string; lines?: any[] }
  | { type: 'area';       title?: string; data: any[]; xKey?: string; areas?: any[] }
  | { type: 'radar';      title?: string; data: any[]; angleKey?: string; radars?: any[] }
  | { type: 'treemap';    title?: string; data: any[] }
  | { type: 'statbars';   title?: string; data: any[]; maxValue?: number; unit?: string }
  | { type: 'compliance'; title?: string; data: any[] }
  | { type: 'mermaid';    code: string }

export function AIChart({ spec }: { spec: ChartSpec }) {
  switch (spec.type) {
    case 'pie':        return <AIPieChart        {...spec} />
    case 'bar':        return <AIBarChart        {...spec} />
    case 'line':       return <AILineChart       {...spec} />
    case 'area':       return <AIAreaChart       {...spec} />
    case 'radar':      return <AIRadarChart      {...spec} />
    case 'treemap':    return <AITreemap         {...spec} />
    case 'statbars':   return <AIStatBars        {...spec} />
    case 'compliance': return <AIComplianceMatrix {...spec} />
    case 'mermaid':    return <MermaidChart       code={spec.code} />
    default:           return null
  }
}
