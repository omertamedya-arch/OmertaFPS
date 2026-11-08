import { cn, maskLicenseKey } from '../lib/format'
import { api } from '../lib/api'
import { Icon } from './Icons'
import { Chip } from './ui'
import { useToast } from './Toast'

export const NAV_ITEMS = [
  { id: 'scan', label: 'Sistem Taraması', icon: 'scan' },
  { id: 'profiles', label: 'Oyun Profilleri', icon: 'crosshair' },
  { id: 'network', label: 'Ağ Optimizasyonu', icon: 'wifi' },
  { id: 'maintenance', label: 'RAM / Çöp Temizliği', icon: 'trash' },
  { id: 'advanced', label: 'Gelişmiş Ayarlar', icon: 'sliders' },
  { id: 'settings', label: 'Ayarlar', icon: 'settings' }
]

export default function Sidebar({ current, onNavigate, boot, licensed, onUpgrade, onLogout }) {
  const toast = useToast()

  const copyHwid = async () => {
    const result = await api.copy(boot.hwid)
    if (result.ok) toast.success('HWID kopyalandı', boot.hwid)
    else toast.error('Kopyalanamadı')
  }

  const logout = async () => {
    const result = await api.logout()
    if (result.ok) {
      toast.info('Lisans oturumu kilitlendi', 'Anahtar donanımınıza bağlı kalmaya devam eder.')
      onLogout()
    } else {
      toast.error('Oturum kilitlenemedi', result.error)
    }
  }

  return (
    <aside className="flex w-[248px] shrink-0 flex-col border-r border-white/[0.05] bg-ink-950/35 px-3 py-5">
      <p className="px-3 label">Modüller</p>

      <nav className="mt-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = current === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={cn(
                'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12.5px] font-medium transition-all duration-200',
                active
                  ? 'bg-ion/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(59,167,255,0.16)]'
                  : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100'
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-colors',
                  active
                    ? 'border-ion/25 bg-ion/10 text-ion'
                    : 'border-white/[0.05] bg-white/[0.02] text-slate-500 group-hover:text-slate-300'
                )}
              >
                <Icon name={item.icon} className="h-[16px] w-[16px]" />
              </span>
              <span className="flex-1">{item.label}</span>
              {active && (
                <span className="h-1.5 w-1.5 rounded-full bg-ion shadow-[0_0_10px_rgba(59,167,255,0.9)]" />
              )}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-6">
        <div className="panel-flat p-3.5">
          <div className="flex items-center justify-between">
            <span className="label">Lisans</span>
            {licensed ? (
              <Chip tone="volt">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                Pro aktif
              </Chip>
            ) : (
              <Chip tone="muted">Ücretsiz</Chip>
            )}
          </div>

          {licensed ? (
            <p className="mt-2.5 font-mono text-[11px] tracking-wide text-slate-200">
              {maskLicenseKey(boot.license?.key)}
            </p>
          ) : (
            <p className="mt-2 text-[10.5px] leading-relaxed text-slate-500">
              Tarama ve analiz ücretsiz. Onarım, ağ ve e-spor modülleri Pro lisans ister.
            </p>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[9.5px] text-muted" title={boot.hwid}>
              {boot.hwid}
            </span>
            <button
              type="button"
              onClick={copyHwid}
              className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
              title="HWID'yi kopyala"
              aria-label="HWID'yi kopyala"
            >
              <Icon name="copy" className="h-3 w-3" />
            </button>
          </div>

          {licensed ? (
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] px-2 py-1.5 text-[10px] font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white"
            >
              <Icon name="lock" className="h-3 w-3" />
              Lisansı kilitle
            </button>
          ) : (
            <button type="button" onClick={onUpgrade} className="btn-volt mt-3 w-full py-2 text-[11px]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              Pro&apos;ya yükselt
            </button>
          )}
        </div>

        <div className="flex items-center justify-between px-1 text-[9px] text-slate-600">
          <span className="font-mono">v{boot.version}</span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-volt/80" />
            Çevrimdışı doğrulama
          </span>
        </div>
      </div>
    </aside>
  )
}
