import { useEffect, useState } from 'react'
import { useAppState } from '../state/AppState'
import { useToast } from '../components/Toast'
import { Icon, Logo } from '../components/Icons'
import { Chip, Spinner } from '../components/ui'
import { api } from '../lib/api'
import { formatKeyInput } from '../lib/format'

const perks = [
  { icon: 'zap', title: 'Tek tık onarım', text: 'Tarama bulgularını uygula, hizmetleri ve GPU profilini optimize et.' },
  { icon: 'wifi', title: 'Ağ optimizasyonu', text: 'Nagle kapatma, DNS temizliği ve gecikme ölçümü.' },
  { icon: 'timer', title: 'Maksimum tepkime', text: 'Zamanlayıcı çözünürlüğünü 0.5 ms’ye sabitle.' },
  { icon: 'crosshair', title: 'FiveM & 4:3 profili', text: 'Öncelik, Defender istisnası ve otomatik çözünürlük.' }
]

export default function Paywall() {
  const { boot, paywall, closePaywall, activate } = useAppState()
  const toast = useToast()
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const raw = key.replace(/[^A-Z0-9]/g, '')

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') closePaywall()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closePaywall])

  const copyHwid = async () => {
    const result = await api.copy(boot?.hwid)
    if (result.ok) {
      setCopied(true)
      toast.success('HWID kopyalandı', boot.hwid)
      window.setTimeout(() => setCopied(false), 2200)
    } else {
      toast.error('HWID kopyalanamadı')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    if (busy) return
    if (raw.length !== 16) {
      setError('Lisans anahtarı 16 karakter olmalı. Örnek: ABCD-1234-EFGH-5678')
      return
    }

    setBusy(true)
    setError(null)
    try {
      const result = await activate(key)
      if (result?.ok === false) throw new Error(result.error || 'Lisans etkinleştirilemedi.')
      toast.success('Pro etkinleştirildi', 'Tüm modüller açıldı. İyi oyunlar!')
      closePaywall()
    } catch (cause) {
      setError(cause?.message || 'Lisans etkinleştirilemedi. Tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  if (!paywall) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <button
        type="button"
        aria-label="Kapat"
        onClick={closePaywall}
        className="absolute inset-0 cursor-default bg-ink-950/75 backdrop-blur-sm"
      />

      <div className="panel hero-ring relative z-10 max-h-full w-full max-w-[880px] animate-fade-up overflow-y-auto p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-volt/[0.08] blur-[90px]" />

        <button
          type="button"
          onClick={closePaywall}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg border border-white/[0.06] text-slate-500 transition hover:bg-white/[0.05] hover:text-white"
          aria-label="Paywall'ı kapat"
        >
          <Icon name="x" className="h-4 w-4" />
        </button>

        <div className="relative grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <Chip tone="volt" className="border-volt/25 bg-volt/[0.08]">
              <Icon name="sparkles" className="h-3.5 w-3.5" />
              OMERTA FPS PRO
            </Chip>

            <h2 className="mt-4 font-display text-[30px] font-semibold leading-tight tracking-[-0.03em] text-white">
              Optimizasyonu
              <br />
              <span className="text-gradient">kilidini aç.</span>
            </h2>

            <p className="mt-3 max-w-[420px] text-[12.5px] leading-relaxed text-slate-400">
              {paywall.message ||
                'Lisans anahtarını girerek tüm onarım, ağ ve e-spor modüllerini bu bilgisayarda aç.'}
            </p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {perks.map((perk) => (
                <div key={perk.title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                  <span className="flex items-center gap-2 text-[11.5px] font-semibold text-slate-200">
                    <Icon name={perk.icon} className="h-3.5 w-3.5 text-volt" />
                    {perk.title}
                  </span>
                  <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{perk.text}</p>
                </div>
              ))}
            </div>

            <p className="mt-4 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
              <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
              Anahtar donanım kimliğine kilitlenir. Geri alma ve varsayılana dönüş işlemleri her zaman ücretsizdir.
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-ink-900/70 p-5">
            <div className="flex items-center justify-between">
              <span className="label">Etkinleştirme</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-slate-500">HWID kilitli</span>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.06] bg-ink-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="label">Donanım kimliği</p>
                  <p className="mt-1 truncate font-mono text-[11.5px] tracking-[0.08em] text-slate-200">
                    {boot?.hwid || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copyHwid}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.07]"
                >
                  <Icon name={copied ? 'check' : 'copy'} className="h-3 w-3" />
                  {copied ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            </div>

            {boot?.licenseError === 'license-db-missing' && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
                <Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Lisans veritabanı bulunamadı.{' '}
                  <span className="font-mono">licenses.hashes.json</span> dosyasının uygulama klasöründe
                  olduğundan emin olun.
                </span>
              </div>
            )}

            <form className="mt-4" onSubmit={submit}>
              <div className="flex items-center justify-between">
                <label htmlFor="paywall-key" className="label">
                  Lisans anahtarı
                </label>
                <span className="font-mono text-[9.5px] text-slate-500">{raw.length}/16</span>
              </div>

              <input
                id="paywall-key"
                autoFocus
                value={key}
                onChange={(event) => {
                  setKey(formatKeyInput(event.target.value))
                  if (error) setError(null)
                }}
                placeholder="ABCD-1234-EFGH-5678"
                className="input mt-2 font-mono text-[15px] tracking-[0.16em] placeholder:tracking-[0.12em]"
                spellCheck={false}
                autoComplete="off"
                maxLength={19}
                disabled={busy}
              />

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2.5 text-[11px] leading-relaxed text-rose-200">
                  <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={busy || raw.length < 16} className="btn-volt mt-4 w-full py-3">
                {busy ? <Spinner className="h-4 w-4" /> : <Icon name="key" className="h-4 w-4" />}
                {busy ? 'Doğrulanıyor…' : 'Lisansı etkinleştir'}
              </button>
            </form>

            <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/[0.05] pt-3 text-[9.5px] text-slate-500">
              <Logo className="h-3.5 w-3.5 opacity-70" />
              <span>Çevrimdışı doğrulama · {boot?.version ? `v${boot.version}` : 'Pro'}</span>
            </div>

            <p className="mt-2 text-center text-[9.5px] leading-relaxed text-slate-600">
              Ücretsiz sürümde tarama ve analiz kullanılmaya devam eder. Yükseltme isteğe bağlıdır.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
