import { useId } from 'react'
import { cn, formatBytes } from '../lib/format'
import { Icon } from './Icons'

export function Spinner({ className = 'h-4 w-4' }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

const chipTones = {
  neutral: 'border-white/[0.06] bg-white/[0.04] text-slate-300',
  volt: 'border-volt/20 bg-volt/[0.08] text-volt-soft',
  ion: 'border-ion/20 bg-ion/[0.08] text-ion-soft',
  amber: 'border-amber-400/20 bg-amber-400/[0.08] text-amber-300',
  orange: 'border-orange-400/25 bg-orange-400/[0.08] text-orange-300',
  rose: 'border-rose-400/20 bg-rose-400/[0.08] text-rose-300',
  muted: 'border-white/[0.05] bg-white/[0.02] text-muted'
}

export function Chip({ children, tone = 'neutral', className }) {
  return <span className={cn('chip', chipTones[tone], className)}>{children}</span>
}

export function Toggle({ checked, onChange, disabled = false, busy = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled || busy}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-ion/50',
        checked ? 'border-volt/40 bg-volt/80 shadow-[0_0_18px_-6px_rgba(61,245,165,0.7)]' : 'border-white/10 bg-ink-700',
        (disabled || busy) && 'cursor-not-allowed opacity-50'
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] h-[18px] w-[18px] rounded-full bg-[rgb(var(--c-knob))] shadow-sm transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-[3px]'
        )}
      />
      {busy && (
        <span className="absolute inset-0 grid place-items-center bg-ink-950/40">
          <Spinner className="h-3.5 w-3.5 text-white" />
        </span>
      )}
    </button>
  )
}

export function Gauge({ percent = 0, size = 150, stroke = 11, children, tone = 'ion' }) {
  const rawId = useId().replace(/:/g, '')
  const gradientId = `gauge-${rawId}`
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const value = Math.max(0, Math.min(100, Number(percent) || 0))
  const offset = circumference - (value / 100) * circumference
  const stops = tone === 'volt' ? ['#3DF5A5', '#8CFFCB'] : ['#3BA7FF', '#3DF5A5']

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={stops[0]} />
            <stop offset="100%" stopColor={stops[1]} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(var(--c-white) / 0.075)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 800ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 pb-6">
      <div>
        {eyebrow && <p className="label">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-[27px] font-semibold leading-tight tracking-[-0.02em] text-white">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-slate-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export function StatCard({ icon, label, value, sub, tone = 'ion' }) {
  const toneClass = tone === 'volt' ? 'text-volt' : 'text-ion'
  return (
    <div className="panel p-4 transition-colors hover:border-white/10">
      <div className="flex items-start justify-between gap-3">
        <span className="label">{label}</span>
        <span className={toneClass}>
          <Icon name={icon} className="h-[17px] w-[17px]" />
        </span>
      </div>
      <p className="mt-3 truncate font-display text-[18px] font-semibold tracking-tight text-white">{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-muted">{sub}</p>}
    </div>
  )
}

export function EmptyState({ icon = 'info', title, message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-full border border-white/[0.06] bg-white/[0.03] text-muted">
        <Icon name={icon} className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-medium text-slate-300">{title}</p>
      {message && <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-muted">{message}</p>}
    </div>
  )
}

export function SkeletonRows({ rows = 4, className = 'h-20' }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className={cn('skeleton w-full', className)} />
      ))}
    </div>
  )
}

export function BoostSteps({ steps, running, result }) {
  const items = [
    {
      id: 'cleanup',
      label: 'Geçici dosyalar ve Prefetch',
      detail: 'Kullanıcı Temp, Windows Temp ve Prefetch taranıp temizlenir.',
      icon: 'trash'
    },
    {
      id: 'standby',
      label: 'Bekleyen bellek (Standby)',
      detail: 'Önbelleklenmiş bellek sayfaları serbest bırakılır.',
      icon: 'memory'
    }
  ]

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const status = steps?.[item.id] || 'idle'
        const isRunning = status === 'running'
        const isDone = status === 'done'
        return (
          <div
            key={item.id}
            className={cn(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
              isRunning
                ? 'border-ion/30 bg-ion/[0.06]'
                : isDone
                  ? 'border-volt/20 bg-volt/[0.04]'
                  : 'border-white/[0.05] bg-white/[0.02]'
            )}
          >
            <div
              className={cn(
                'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                isDone
                  ? 'border-volt/30 bg-volt/10 text-volt'
                  : isRunning
                    ? 'border-ion/30 bg-ion/10 text-ion'
                    : 'border-white/[0.06] bg-white/[0.02] text-muted'
              )}
            >
              {isDone ? <Icon name="check" className="h-4 w-4" /> : <Icon name={item.icon} className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-medium text-slate-200">{item.label}</p>
              <p className="truncate text-[11px] text-muted">{item.detail}</p>
            </div>
            <span
              className={cn(
                'text-[10px] font-semibold uppercase tracking-wider',
                isDone ? 'text-volt' : isRunning ? 'text-ion' : 'text-slate-600'
              )}
            >
              {isDone ? 'Tamam' : isRunning ? 'Çalışıyor' : 'Bekliyor'}
            </span>
          </div>
        )
      })}

      {result && !running && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Chip tone="volt">
            <Icon name="harddrive" className="h-3 w-3" />
            {formatBytes(result.cleanup?.freedBytes ?? result.freedBytes)} disk
          </Chip>
          <Chip tone="ion">
            <Icon name="memory" className="h-3 w-3" />~
            {formatBytes(result.purge?.releasedBytes ?? result.releasedBytes)} RAM
          </Chip>
        </div>
      )}
    </div>
  )
}
