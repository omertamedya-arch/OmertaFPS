import { useState } from 'react'
import { api, isMock } from '../lib/api'
import { useToast } from '../components/Toast'
import { Icon, Logo } from '../components/Icons'
import { Chip, Spinner } from '../components/ui'

const needs = [
  { icon: 'server', text: 'Windows hizmetlerini güvenli biçimde yönetmek' },
  { icon: 'database', text: 'GPU ve sistem kayıt defteri ayarlarını uygulamak' },
  { icon: 'trash', text: 'Temp, Prefetch ve bekleyen belleği temizlemek' }
]

export default function AdminGate({ boot, onRefresh }) {
  const toast = useToast()
  const [waiting, setWaiting] = useState(false)
  const [error, setError] = useState(null)

  const relaunch = async () => {
    if (waiting) return
    setWaiting(true)
    setError(null)
    try {
      const result = await api.relaunchAdmin()
      if (!result.ok) throw new Error(result.error || 'Yönetici izni alınamadı.')
      if (isMock) {
        toast.info('Önizleme modu', 'Yönetici izni simüle edildi.')
        window.setTimeout(onRefresh, 600)
      }
    } catch (err) {
      const message = String(err.message || '')
      setError(
        /canceled|iptal/i.test(message)
          ? 'UAC penceresi iptal edildi. Yeniden başlatmayı onaylamanız gerekiyor.'
          : message || 'Yönetici izni alınamadı.'
      )
      setWaiting(false)
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-8 py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-ion/10" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ion/[0.07] blur-[80px]" />

      <div className="relative z-10 w-full max-w-[520px] animate-fade-up text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[26px] border border-ion/20 bg-ink-900/80 shadow-glow">
          <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.03] text-ion">
            <Icon name="shield" className="h-7 w-7" />
            <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-ink-900 bg-amber-400 text-ink-950">
              <Icon name="alert" className="h-3 w-3" strokeWidth={2.6} />
            </span>
          </div>
        </div>

        <p className="label mt-7">Yönetici izni</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.025em] text-white">
          Tam erişim için yeniden başlat
        </h1>
        <p className="mx-auto mt-3 max-w-[440px] text-[13px] leading-relaxed text-slate-400">
          Omerta FPS, sistem ayarlarını değiştirebilmek için yönetici haklarıyla çalışmalıdır. Uygulama
          yeniden başlatılacak ve Windows size bir onay penceresi gösterecek.
        </p>

        <div className="panel mx-auto mt-7 max-w-[460px] space-y-3 p-5 text-left">
          {needs.map((item) => (
            <div key={item.text} className="flex items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/[0.06] bg-white/[0.03] text-ion">
                <Icon name={item.icon} className="h-4 w-4" />
              </span>
              <span className="text-[12px] text-slate-300">{item.text}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="mx-auto mt-4 flex max-w-[460px] items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3.5 py-2.5 text-left text-[12px] text-rose-200">
            <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6 flex flex-col items-center gap-3">
          <button type="button" onClick={relaunch} disabled={waiting} className="btn-primary w-full max-w-[460px]">
            {waiting ? <Spinner className="h-4 w-4" /> : <Icon name="shield" className="h-4 w-4" />}
            {waiting ? 'UAC onayı bekleniyor…' : 'Yönetici olarak yeniden başlat'}
          </button>
          <button
            type="button"
            onClick={() => api.quit()}
            className="text-[11.5px] font-medium text-slate-500 transition hover:text-slate-300"
          >
            Uygulamayı kapat
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-slate-600">
          <Logo className="h-3.5 w-3.5 opacity-60" />
          <span>Omerta FPS v{boot.version}</span>
          <span className="text-slate-700">•</span>
          <span>HWID: {boot.hwid}</span>
          {isMock && <Chip tone="amber">Önizleme</Chip>}
        </div>
      </div>
    </div>
  )
}
