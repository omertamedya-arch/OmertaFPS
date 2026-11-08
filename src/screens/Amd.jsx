import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner } from '../components/ui'

const recommendations = [
  {
    title: 'Radeon Anti-Lag',
    target: 'Rekabetçi oyunlarda Açık',
    text: 'CPU-GPU kuyruğunu kısaltarak giriş gecikmesini düşürür. Hikayeli oyunlarda kapalı bırakılabilir.'
  },
  {
    title: 'Radeon Chill',
    target: 'Kapalı',
    text: 'Kare hızını güç tasarrufu için sınırlar. Sabit ve yüksek FPS hedefinde kapalı tutulmalı.'
  },
  {
    title: 'Radeon Boost',
    target: 'Kapalı (tutarlılık)',
    text: 'Hareket sırasında çözünürlüğü düşürür. Rekabetçi oyunlarda görüntü netliğini bozabilir.'
  },
  {
    title: 'FreeSync',
    target: 'Açık',
    text: 'Monitör destekliyorsa yırtılmayı oyun içi V-Sync olmadan engeller, gecikmeyi artırmaz.'
  },
  {
    title: 'Görüntü keskinleştirme',
    target: '%40 - %80',
    text: 'Yükseltme veya FSR kullanılıyorsa netliği geri kazandırır; rekabetçi oyunlarda %80 önerilir.'
  },
  {
    title: 'Doku süzme kalitesi',
    target: 'FPS: Performans · AAA: Kalite',
    text: 'Bant genişliği ve VRAM kullanımını dengeler. Oyun türüne göre profil kartlarından seç.'
  }
]

export default function Amd({ onNavigate }) {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [profiles, setProfiles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [statusResponse, profileResponse] = await Promise.all([
        api.amd.status(),
        api.profiles.status().catch(() => null)
      ])
      if (!statusResponse.ok) throw new Error(statusResponse.error || 'AMD bilgisi okunamadı.')
      setInfo(statusResponse)
      if (profileResponse?.ok) setProfiles(profileResponse)
      setError(null)
    } catch (errorObject) {
      setError(errorObject.message)
      toast.error('AMD bilgisi alınamadı', errorObject.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openPanel = async () => {
    if (opening) return
    setOpening(true)
    try {
      const response = await api.amd.openPanel()
      if (!response.ok) throw new Error(response.error || 'AMD Software açılamadı.')
      toast.success('AMD Software açıldı', `${response.target} penceresinden önerilen ayarları uygula.`)
    } catch (errorObject) {
      toast.error('AMD Software açılamadı', errorObject.message)
    } finally {
      setOpening(false)
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="AMD Optimizasyonu"
        title="Radeon'unu oyun için hazırla."
        subtitle="AMD Software ayarları sürücü tarafından yönetilir. Omerta FPS güvenli kayıt defteri eşleniği olmayan ayarları zorla yazmaz; donanımına ve oyun türüne göre hazır Adrenalin rehberi sunar."
        actions={
          <>
            <button type="button" onClick={openPanel} disabled={opening || !info?.available} className="btn-ghost">
              {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
              AMD Software
            </button>
            <button type="button" onClick={load} className="btn-quiet" aria-label="Yenile">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      {loading && !info ? (
        <SkeletonRows rows={3} className="h-[132px]" />
      ) : error && !info ? (
        <EmptyState icon="alert" title="AMD bilgisi okunamadı" message={error} />
      ) : !info?.available ? (
        <EmptyState
          icon="gpu"
          title="AMD ekran kartı algılanamadı"
          message="Bu modül yalnızca AMD Radeon GPU bulunan sistemlerde çalışır. Sürücü kuruluysa uygulamayı yeniden başlatıp tekrar dene."
        />
      ) : (
        <>
          <section className="panel hero-ring relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-rose-400/[0.06] blur-[95px]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/[0.07] text-rose-300">
                  <Icon name="gpu" className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[19px] font-semibold tracking-tight text-white">{info.gpu.name}</h2>
                    <Chip tone="rose">AMD Radeon</Chip>
                    <Chip tone={info.integrated ? 'amber' : 'volt'}>
                      {info.integrated ? 'Entegre grafik' : 'Harici grafik'}
                    </Chip>
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] text-slate-500">
                    Sürücü {info.driverVersion || '—'}
                    {info.driverDate ? ` · ${info.driverDate}` : ''}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Chip tone={info.panelAvailable ? 'volt' : 'amber'}>
                      {info.panelAvailable ? 'AMD Software bulundu' : 'Adrenalin bulunamadı'}
                    </Chip>
                    {profiles?.hardware?.tier && (
                      <Chip tone={profiles.hardware.tier.tone || 'muted'}>{profiles.hardware.tier.label}</Chip>
                    )}
                    {profiles?.hardware?.memoryGb && <Chip tone="muted">{profiles.hardware.memoryGb} GB RAM</Chip>}
                  </div>

                  {info.integrated && (
                    <p className="mt-3 flex max-w-[540px] items-start gap-1.5 text-[10.5px] leading-relaxed text-amber-300/90">
                      <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Entegre Radeon grafiğinde sürücü ayarları yine işe yarar ancak FPS artışı harici kartlara göre
                      sınırlıdır. 720p/900p, FSR ve düşük gölge ayarları daha gerçekçi bir beklentidir.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={openPanel} disabled={opening} className="btn-primary">
                      {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
                      AMD Software'ı aç
                    </button>
                    <button type="button" onClick={() => onNavigate('profiles')} className="btn-ghost">
                      <Icon name="crosshair" className="h-4 w-4" />
                      Oyun profilleri
                    </button>
                  </div>
                </div>
              </div>

              <div className="w-full max-w-[260px] shrink-0 rounded-xl border border-white/[0.05] bg-ink-950/40 p-3.5">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Icon name="shield" className="h-3 w-3" />
                  Neden otomatik değil?
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-500">
                  AMD, Anti-Lag ve doku süzme gibi ayarları sürücü profil veritabanında tutar. Kayıt defterine
                  zorla yazmak sürücüyü bozabilir; bu yüzden Omerta FPS güvenli yolu seçer.
                </p>
              </div>
            </div>
          </section>

          {profiles?.presets?.length > 0 && (
            <section className="mt-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="label">Oyun türüne göre AMD ayarları</p>
                <span className="text-[9.5px] text-slate-600">Adrenalin panelinde uygula</span>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                {profiles.presets.map((preset) => (
                  <div key={preset.id} className="panel p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-rose-400/20 bg-rose-400/[0.06] text-rose-300">
                        <Icon name={preset.icon} className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[11.5px] font-semibold text-slate-100">{preset.name}</p>
                        <p className="truncate text-[9px] text-slate-500">{preset.tag}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {preset.vendorSteps.map((step) => (
                        <p key={step} className="flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-400">
                          <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-rose-400/60" />
                          {step}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="panel p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-ion/15 bg-ion/[0.06] text-ion">
                  <Icon name="gauge" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-[13px] font-semibold text-white">Adrenalin ayar rehberi</h2>
                  <p className="text-[9.5px] text-slate-500">Windows ayarları profillerden otomatik uygulanır</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {recommendations.map((row) => (
                  <div key={row.title} className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] font-medium text-slate-200">{row.title}</p>
                      <span className="shrink-0 rounded border border-rose-400/20 bg-rose-400/[0.06] px-1.5 py-0.5 text-[8.5px] font-semibold text-rose-200">
                        {row.target}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{row.text}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-600">
                <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
                Sürücü sürümüne göre menü adları değişebilir. Ayarlar AMD Software &gt; Oyun &gt; Global Grafik
                bölümünden uygulanır.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="panel p-4">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-volt">
                  <Icon name="zap" className="h-3 w-3" />
                  Windows tarafı otomatik
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                  GameDVR kapatma, yüksek performans güç planı, görsel efektler ve fare ivmesi oyun profilleriyle
                  güvenle uygulanır. AMD sürücü ayarları panelde kalır.
                </p>
                <button type="button" onClick={() => onNavigate('profiles')} className="btn-ghost mt-2.5 w-full">
                  <Icon name="crosshair" className="h-4 w-4" />
                  Profil seç
                </button>
              </section>

              <section className="panel p-4">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                  <Icon name="alert" className="h-3 w-3" />
                  Yeniden başlatma
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                  Adrenalin'de yaptığın değişikliklerden sonra sürücünün yeniden yüklenmesi için oyunu veya
                  bilgisayarı yeniden başlatman gerekebilir.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
