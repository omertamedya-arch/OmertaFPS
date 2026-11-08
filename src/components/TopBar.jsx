import { Chip } from './ui'
import { Logo } from './Icons'
import ThemePicker from './ThemePicker'
import { isMock } from '../lib/api'

export default function TopBar({ contextLabel, admin, version, licensed, theme, onThemeChange }) {
  return (
    <header className="drag-region relative z-40 flex h-11 shrink-0 items-center border-b border-white/[0.05] bg-ink-950/70 pl-4 pr-[150px] backdrop-blur-md">
      <div className="flex items-center gap-2.5">
        <Logo className="h-5 w-5" />
        <span className="font-display text-[11px] font-bold tracking-[0.2em] text-white">
          OMERTA <span className="text-volt">FPS</span>
        </span>
        <span className="rounded border border-ion/25 bg-ion/10 px-1.5 py-0.5 text-[8px] font-bold tracking-[0.16em] text-ion-soft">
          PRO
        </span>
      </div>

      {contextLabel && (
        <>
          <span className="mx-3 h-3 w-px bg-white/10" />
          <span className="text-[9.5px] font-medium uppercase tracking-[0.18em] text-muted">{contextLabel}</span>
        </>
      )}

      <div className="no-drag ml-auto flex items-center gap-2">
        {isMock && <Chip tone="amber">Tarayıcı önizlemesi</Chip>}

        {licensed === true && (
          <Chip tone="volt">
            <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_8px_rgba(61,245,165,0.9)]" />
            Pro
          </Chip>
        )}
        {licensed === false && <Chip tone="muted">Ücretsiz</Chip>}

        {admin === true && (
          <Chip tone="volt">
            <span className="h-1.5 w-1.5 rounded-full bg-volt shadow-[0_0_8px_rgba(61,245,165,0.9)]" />
            Yönetici
          </Chip>
        )}
        {admin === false && <Chip tone="rose">Yönetici izni yok</Chip>}

        <ThemePicker theme={theme} onChange={onThemeChange} />

        {version && <span className="ml-1 font-mono text-[9.5px] text-slate-600">v{version}</span>}
      </div>
    </header>
  )
}
