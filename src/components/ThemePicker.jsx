import { useEffect, useRef, useState } from 'react'
import { THEMES } from '../lib/themes'
import { cn } from '../lib/format'
import { Icon } from './Icons'

function swatchStyle(theme) {
  const [a, b, c] = theme.swatch
  return {
    background: `linear-gradient(135deg, ${a} 0 46%, ${b} 46% 76%, ${c} 76% 100%)`
  }
}

export default function ThemePicker({ theme, onChange }) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const current = THEMES.find((item) => item.id === theme) || THEMES[0]

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Tema seç: ${current.label}`}
        title={`Tema: ${current.label}`}
        className={cn(
          'flex h-7 items-center gap-1.5 rounded-lg border px-2 text-slate-300 transition',
          open
            ? 'border-ion/40 bg-ion/[0.08] text-white'
            : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] hover:text-white'
        )}
      >
        <span
          className="h-3.5 w-3.5 rounded-[5px] border border-white/25"
          style={swatchStyle(current)}
          aria-hidden="true"
        />
        <Icon name="palette" className="h-3.5 w-3.5" />
        <Icon name="chevronDown" className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Tema seçici"
          className="absolute right-0 top-9 z-[60] w-[300px] origin-top-right animate-fade-up rounded-2xl border border-white/10 bg-ink-900/95 p-2.5 shadow-panel backdrop-blur-xl"
        >
          <div className="flex items-center justify-between px-1.5 pb-2">
            <span className="label">Görünüm</span>
            <span className="text-[9.5px] text-slate-500">{THEMES.length} tema</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {THEMES.map((item) => {
              const active = item.id === current.id
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    onChange(item.id)
                    setOpen(false)
                  }}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition',
                    active
                      ? 'border-ion/40 bg-ion/[0.09]'
                      : 'border-white/[0.05] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.05]'
                  )}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-lg border border-white/20 shadow-inner"
                    style={swatchStyle(item)}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-[11.5px] font-semibold text-white">{item.label}</span>
                      {active && <Icon name="check" className="h-3 w-3 shrink-0 text-ion" />}
                    </span>
                    <span className="block truncate text-[9.5px] text-slate-500">{item.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-2 rounded-lg border border-rose-400/15 bg-rose-400/[0.06] px-2 py-1.5 text-[9.5px] leading-relaxed text-slate-400">
            <span className="font-semibold text-rose-300">Rosa</span> modunda kiraz çiçekleri dökülür, samuray
            menülerin arasında düşmanlarla savaşır.
          </p>
        </div>
      )}
    </div>
  )
}
