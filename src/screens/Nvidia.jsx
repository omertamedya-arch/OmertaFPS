import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn, formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner } from '../components/ui'

const profileRows = [
  {
    key: 'powerManagement',
    title: 'Güç yönetimi modu',
    text: 'Sürücünün GPU frekansını güç tasarrufu için düşürmesini engeller; sürekli maksimum performans ister.',
    values: 'PowerMizerEnable · PowerMizerLevel · PowerMizerLevelAC'
  },
  {
    key: 'dynamicPstateOff',
    title: 'Dinamik P-State kapatma',
    text: 'Oyun sırasında GPU\'nun düşük güç durumuna geçip yeniden yükselmesini önler, kare sürelerini dengeler.',
    values: 'DisableDynamicPstate'
  },
  {
    key: 'perfLevelPinned',
    title: 'Performans seviyesi sabitleme',
    text: 'Sürücünün performans seviyesini sabitler; ani frekans dalgalanmalarını azaltır.',
    values: 'PerfLevelSrc = 8738'
  }
]

const panelRows = [
  {
    title: 'Doku süzme',
    target: 'Yüksek Performans',
    text: 'Anizotropik süzme yerine performans odaklı süzme kullanılır. Görüntüde hafif keskinleşme olabilir.'
  },
  {
    title: 'Düşük gecikme modu',
    target: 'Ultra',
    text: 'Kare kuyruğunu azaltarak giriş gecikmesini düşürür. Rekabetçi oyunlarda tercih edilir.'
  }
]

const valueNames = [
  'PowerMizerEnable',
  'PowerMizerLevel',
  'PowerMizerLevelAC',
  'PerfLevelSrc',
  'DisableDynamicPstate'
]

export default function Nvidia({ onNavigate }) {
  const toast = useToast()
  const [info, setInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [opening, setOpening] = useState(false)
  const [showValues, setShowValues] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true)
      try {
        const response = await api.nvidia.status()
        if (!response.ok) throw new Error(response.error || 'NVIDIA bilgisi okunamadı.')
        setInfo(response)
        setError(null)
      } catch (errorObject) {
        setError(errorObject.message)
        toast.error('NVIDIA bilgisi alınamadı', errorObject.message)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    load()
  }, [load])

  const apply = async () => {
    if (applying) return
    setApplying(true)
    try {
      const response = await api.nvidia.apply()
      if (!response.ok) throw new Error(response.error || 'Profil uygulanamadı.')
      setInfo(response.info)
      toast.warning(
        'Maksimum performans profili uygulandı',
        'Değişikliklerin etkinleşmesi için bilgisayarı yeniden başlat. "Varsayılana Dön" ile geri alabilirsin.'
      )
    } catch (errorObject) {
      toast.error('Profil uygulanamadı', errorObject.message)
    } finally {
      setApplying(false)
    }
  }

  const revert = async () => {
    if (reverting) return
    setReverting(true)
    try {
      const response = await api.nvidia.revert()
      if (!response.ok) throw new Error(response.error || 'Ayarlar geri alınamadı.')
      setInfo(response.info)
      toast.success(
        'Ayarlar varsayılana döndürüldü',
        'Özgün sürücü değerleri geri yüklendi. Değişikliğin geçerliliği için yeniden başlatma önerilir.'
      )
    } catch (errorObject) {
      toast.error('Ayarlar geri alınamadı', errorObject.message)
    } finally {
      setReverting(false)
    }
  }

  const openPanel = async () => {
    if (opening) return
    setOpening(true)
    try {
      const response = await api.nvidia.openPanel()
      if (!response.ok) throw new Error(response.error || 'NVIDIA paneli açılamadı.')
      toast.success('NVIDIA paneli açıldı', `${response.target} penceresinden sürücü ayarlarını düzenleyebilirsin.`)
    } catch (errorObject) {
      toast.error('NVIDIA paneli açılamadı', errorObject.message)
    } finally {
      setOpening(false)
    }
  }

  const busy = applying || reverting
  const hasGpu = Boolean(info?.gpuName)
  const hasKey = Boolean(info?.keyPath)

  return (
    <>
      <PageHeader
        eyebrow="GPU Optimizasyonu"
        title="NVIDIA'yı performansa kilitle."
        subtitle="Sürücü güç yönetimini maksimum performansa sabitle. Tüm kayıt defteri değişiklikleri yedeklenir ve tek tıkla geri alınabilir."
        actions={
          <>
            <button type="button" onClick={openPanel} disabled={opening} className="btn-ghost">
              {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
              NVIDIA paneli
            </button>
            <button type="button" onClick={() => load({ quiet: Boolean(info) })} className="btn-quiet" aria-label="Yenile">
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      {loading && !info ? (
        <SkeletonRows rows={3} className="h-[132px]" />
      ) : error && !info ? (
        <EmptyState icon="alert" title="NVIDIA bilgisi okunamadı" message={error} />
      ) : !hasGpu ? (
        <EmptyState
          icon="gpu"
          title="NVIDIA ekran kartı algılanamadı"
          message="Bu modül yalnızca NVIDIA GPU bulunan sistemlerde çalışır. Ekran kartı sürücüsü kuruluysa uygulamayı yeniden başlatıp tekrar dene."
        />
      ) : (
        <>
          <section className="panel hero-ring relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-volt/[0.07] blur-[95px]" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-volt/20 bg-volt/[0.07] text-volt">
                  <Icon name="gpu" className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[19px] font-semibold tracking-tight text-white">{info.gpuName}</h2>
                    <Chip tone={info.active ? 'volt' : 'muted'}>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          info.active ? 'bg-volt shadow-[0_0_8px_rgba(61,245,165,0.9)]' : 'bg-slate-500'
                        )}
                      />
                      {info.active ? 'Maksimum performans' : 'Sürücü varsayılanı'}
                    </Chip>
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] text-slate-500">
                    Sürücü {info.driverVersion || '—'} · Sınıf anahtarı {info.gpuKeyName || '—'}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={apply} disabled={busy || !hasKey || info.active} className="btn-volt">
                      {applying ? <Spinner className="h-4 w-4" /> : <Icon name="zap" className="h-4 w-4" />}
                      {applying ? 'Uygulanıyor…' : 'Maksimum Performans Modunu Uygula'}
                    </button>
                    <button
                      type="button"
                      onClick={revert}
                      disabled={busy || !hasKey || (!info.hasBackup && !info.active)}
                      className="btn-ghost"
                    >
                      {reverting ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
                      {reverting ? 'Geri alınıyor…' : 'Varsayılana Dön'}
                    </button>
                    <button type="button" onClick={() => onNavigate?.('profiles')} className="btn-ghost">
                      <Icon name="crosshair" className="h-4 w-4" />
                      Oyun profilleri
                    </button>
                  </div>

                  {!hasKey && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-amber-300/90">
                      <Icon name="alert" className="h-3.5 w-3.5" />
                      Sürücü kayıt anahtarı bulunamadı; sürücüyü güncellemen gerekebilir.
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full max-w-[260px] shrink-0 rounded-xl border border-white/[0.05] bg-ink-950/40 p-3.5">
                <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  <Icon name="shield" className="h-3 w-3" />
                  Geri alma yedeği
                </p>
                {info.hasBackup ? (
                  <>
                    <p className="mt-1.5 text-[11.5px] font-medium text-slate-200">Özgün değerler kaydedildi</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">{formatDate(info.backupAt)}</p>
                  </>
                ) : (
                  <>
                    <p className="mt-1.5 text-[11.5px] font-medium text-slate-300">Henüz yedek yok</p>
                    <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">
                      Profil uygulandığında mevcut sürücü değerleri otomatik yedeklenir.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowValues((value) => !value)}
                  className="mt-2.5 flex items-center gap-1 text-[10px] font-medium text-ion transition hover:text-ion-soft"
                >
                  Teknik ayrıntılar
                  <Icon
                    name="chevronDown"
                    className={cn('h-3 w-3 transition-transform', showValues && 'rotate-180')}
                  />
                </button>
              </div>
            </div>

            {showValues && (
              <div className="relative mt-4 animate-fade-in rounded-xl border border-white/[0.05] bg-ink-950/45 p-3">
                <p className="truncate font-mono text-[9px] text-slate-600">{info.keyPath}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                  {valueNames.map((name) => (
                    <div key={name} className="flex items-center justify-between gap-2 border-b border-white/[0.03] pb-1">
                      <span className="font-mono text-[9.5px] text-slate-500">{name}</span>
                      <span
                        className={cn(
                          'font-mono text-[10px] font-semibold',
                          info.values?.[name] == null ? 'text-slate-600' : 'text-slate-200'
                        )}
                      >
                        {info.values?.[name] == null ? 'yok' : info.values[name]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Kayıt defteri profili</p>
                  <h2 className="mt-1 text-[15px] font-semibold text-white">Uygulanan ayarlar</h2>
                </div>
                <Chip tone={info.active ? 'volt' : 'muted'}>{info.active ? '3/3 aktif' : 'Uygulanmadı'}</Chip>
              </div>

              <div className="mt-4 space-y-2.5">
                {profileRows.map((row) => {
                  const active = Boolean(info.settings?.[row.key])
                  return (
                    <div
                      key={row.key}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border px-3.5 py-3',
                        active ? 'border-volt/15 bg-volt/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border',
                          active
                            ? 'border-volt/30 bg-volt/10 text-volt'
                            : 'border-white/10 bg-white/[0.03] text-slate-600'
                        )}
                      >
                        <Icon name={active ? 'check' : 'power'} className="h-3 w-3" strokeWidth={2.2} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[12px] font-medium text-slate-200">{row.title}</p>
                          <span
                            className={cn(
                              'text-[9px] font-semibold uppercase tracking-wider',
                              active ? 'text-volt' : 'text-slate-600'
                            )}
                          >
                            {active ? 'Aktif' : 'Pasif'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{row.text}</p>
                        <p className="mt-1.5 font-mono text-[9px] text-slate-600">{row.values}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-600">
                <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
                Değerler sürücü kayıt anahtarına yazılır ve sürücü yeniden yüklendiğinde etkinleşir.
                Değişiklikler "Varsayılana Dön" ile özgün hâline getirilir.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="panel p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-ion/15 bg-ion/[0.06] text-ion">
                    <Icon name="gauge" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold text-white">Sürücü paneli ayarları</h2>
                    <p className="text-[9.5px] text-slate-500">Güvenli kayıt defteri eşleniği yok</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2">
                  {panelRows.map((row) => (
                    <div
                      key={row.title}
                      className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11.5px] font-medium text-slate-200">{row.title}</p>
                        <Chip tone="ion">{row.target}</Chip>
                      </div>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{row.text}</p>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-[9.5px] leading-relaxed text-slate-600">
                  Bu iki ayar NVIDIA profil veritabanında tutulur. Güvenli olmayan ikili dosya düzenlemesi
                  yapmamak için uygulama bunları otomatik yazmaz; panelden tek tıkla ayarlayabilirsin.
                </p>

                <button type="button" onClick={openPanel} disabled={opening} className="btn-ghost mt-3 w-full">
                  {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
                  NVIDIA panelini aç
                </button>
              </section>

              <section className="panel p-4">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
                  <Icon name="alert" className="h-3 w-3" />
                  Yeniden başlatma
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                  Sürücü kayıt ayarları çoğu sistemde oyun yeniden başlatıldığında etkinleşir. Tam etki
                  için bilgisayarı yeniden başlatman önerilir.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
