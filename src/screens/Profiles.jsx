import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn, formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner, Toggle } from '../components/ui'

const ACCENTS = {
  volt: {
    iconBox: 'border-volt/25 bg-volt/[0.07] text-volt',
    badge: 'border-volt/25 bg-volt/[0.08] text-volt-soft',
    button: 'btn-volt'
  },
  ion: {
    iconBox: 'border-ion/25 bg-ion/[0.07] text-ion',
    badge: 'border-ion/25 bg-ion/[0.08] text-ion-soft',
    button: 'btn-primary'
  },
  violet: {
    iconBox: 'border-violet-400/25 bg-violet-400/[0.07] text-violet-300',
    badge: 'border-violet-400/25 bg-violet-400/[0.08] text-violet-200',
    button: 'btn-ghost'
  },
  rose: {
    iconBox: 'border-rose-400/25 bg-rose-400/[0.07] text-rose-300',
    badge: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-200',
    button: 'btn-ghost'
  },
  amber: {
    iconBox: 'border-amber-400/25 bg-amber-400/[0.07] text-amber-300',
    badge: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-200',
    button: 'btn-ghost'
  }
}

function VendorBadge({ vendor }) {
  if (vendor.id === 'amd') return <Chip tone="rose">AMD Radeon</Chip>
  if (vendor.id === 'nvidia') return <Chip tone="volt">NVIDIA GeForce</Chip>
  if (vendor.id === 'intel') return <Chip tone="ion">Intel Graphics</Chip>
  return <Chip tone="muted">GPU algılanamadı</Chip>
}

export default function Profiles({ onNavigate }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(null)
  const [reverting, setReverting] = useState(false)
  const [opening, setOpening] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [error, setError] = useState(null)
  const [defenderExclusion, setDefenderExclusion] = useState(false)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true)
      try {
        const response = await api.profiles.status()
        if (!response.ok) throw new Error(response.error || 'Oyun profilleri yüklenemedi.')
        setData(response)
        setError(null)
      } catch (errorObject) {
        setError(errorObject.message)
        toast.error('Oyun profilleri yüklenemedi', errorObject.message)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const off = api.onEsportsEvent?.((event) => {
      if (!event || event.type !== 'profile-auto') return
      if (event.action === 'applied') {
        toast.info('Otomatik profil uygulandı', `${event.name || event.presetId} · oyun algılandı`)
      } else if (event.action === 'reverted') {
        toast.info('Otomatik profil geri alındı', 'Özgün sistem ayarlarına dönüldü.')
      }
      load({ quiet: true })
    })
    return () => off?.()
  }, [load, toast])

  const apply = async (preset) => {
    if (applying || reverting) return
    setApplying(preset.id)
    try {
      const response = await api.profiles.apply(preset.id, {
        defenderExclusion: preset.id === 'fivem' ? defenderExclusion : false
      })
      if (!response.ok) throw new Error(response.error || 'Profil uygulanamadı.')
      setData(response)
      const added = []
      if (response.checkpoint?.created) added.push('Sistem geri yükleme noktası oluşturuldu.')
      if (response.fivemExclusion) added.push('FiveM Defender istisnası eklendi.')
      const extra = added.length ? ` ${added.join(' ')}` : ''

      if (response.alreadyActive) {
        toast.info('Profil zaten aktif', `${preset.name} ayarları hâlihazırda uygulanmış.`)
      } else if (response.requiresRestart || response.warning) {
        toast.warning(
          `${preset.name} profili uygulandı`,
          `${response.warning || 'NVIDIA sürücü ayarları için yeniden başlatma önerilir.'} Tüm değişiklikler geri alınabilir.${extra}`
        )
      } else {
        toast.success(
          `${preset.name} profili uygulandı`,
          `${response.applies?.length || preset.effects.length} sistem ayarı omerta profiline göre düzenlendi.${extra}`
        )
      }
    } catch (errorObject) {
      toast.error('Profil uygulanamadı', errorObject.message)
    } finally {
      setApplying(null)
    }
  }

  const revert = async () => {
    if (reverting || applying) return
    setReverting(true)
    try {
      const response = await api.profiles.revert()
      if (!response.ok) throw new Error(response.error || 'Profil geri alınamadı.')
      setData(response)
      toast.success('Varsayılan ayarlara dönüldü', 'Profilin değiştirdiği tüm değerler özgün hâline getirildi.')
    } catch (errorObject) {
      toast.error('Profil geri alınamadı', errorObject.message)
    } finally {
      setReverting(false)
    }
  }

  const openPanel = async () => {
    if (opening) return
    setOpening(true)
    try {
      const target = data?.vendor?.hasNvidia ? api.nvidia : api.amd
      if (!target?.openPanel) throw new Error('Bu GPU için sürücü paneli desteklenmiyor.')
      const response = await target.openPanel()
      if (!response.ok) throw new Error(response.error || 'Sürücü paneli açılamadı.')
      toast.success('Sürücü paneli açıldı', response.target || 'Önerilen ayarları panelden uygula.')
    } catch (errorObject) {
      toast.error('Sürücü paneli açılamadı', errorObject.message)
    } finally {
      setOpening(false)
    }
  }

  const busy = Boolean(applying) || reverting
  const vendor = data?.vendor
  const activeProfile = data?.activeProfile
  const canOpenPanel = Boolean(vendor?.hasNvidia || vendor?.hasAmd)
  const presetCount = data?.presets?.length || 0

  return (
    <>
      <PageHeader
        eyebrow="Oyun Profilleri"
        title="Oyununa göre hazır ayarlar."
        subtitle="FPS, MOBA, FiveM/Roleplay, hikayeli ve strateji oyunları için Windows, sürücü ve güç ayarlarını tek tıkla uyarla. Omerta FPS önce ekran kartını tanır, sonra doğru profili önerir."
        actions={
          <>
            {canOpenPanel && (
              <button type="button" onClick={openPanel} disabled={opening} className="btn-ghost">
                {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
                {vendor?.hasNvidia ? 'NVIDIA paneli' : 'AMD Software'}
              </button>
            )}
            <button
              type="button"
              onClick={() => load({ quiet: Boolean(data) })}
              className="btn-quiet"
              aria-label="Profilleri yenile"
            >
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      {loading && !data ? (
        <SkeletonRows rows={3} className="h-[150px]" />
      ) : error && !data ? (
        <EmptyState icon="alert" title="Profiller yüklenemedi" message={error} />
      ) : (
        <>
          <section className="panel hero-ring relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-ion/[0.08] blur-[95px]" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-ion/20 bg-ion/[0.07] text-ion">
                  <Icon name="gpu" className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[19px] font-semibold tracking-tight text-white">
                      {vendor?.name || 'Ekran kartı algılanamadı'}
                    </h2>
                    <VendorBadge vendor={vendor || { id: 'generic' }} />
                    {vendor?.integrated && <Chip tone="amber">Entegre grafik</Chip>}
                    {data?.autoProfile?.enabled && <Chip tone="ion">Otomatik profil açık</Chip>}
                  </div>
                  <p className="mt-1 font-mono text-[10.5px] text-slate-500">
                    Sürücü {vendor?.driverVersion || '—'}
                    {vendor?.driverDate ? ` · ${vendor.driverDate}` : ''}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Chip tone={data?.hardware?.tier?.tone || 'muted'}>{data?.hardware?.tier?.label}</Chip>
                    <Chip tone="muted">{data?.hardware?.cpuThreads} iş parçacığı</Chip>
                    <Chip tone="muted">{data?.hardware?.memoryGb} GB RAM</Chip>
                    {data?.hardware?.storage && <Chip tone="muted">{data.hardware.storage}</Chip>}
                  </div>

                  <p className="mt-3 max-w-[540px] text-[11.5px] leading-relaxed text-slate-400">
                    {vendor?.hasNvidia
                      ? 'NVIDIA güç profili otomatik uygulanır; düşük gecikme ve doku süzme adımları NVIDIA panelinden doğrulanır.'
                      : vendor?.id === 'amd'
                        ? 'AMD sürücü ayarları kayıt defterinden güvenli yazılamaz. Windows tarafı otomatik uygulanır; Adrenalin adımları panelden tek tıkla yapılır.'
                        : 'Windows tarafı ayarlar otomatik uygulanır. Sürücü paneli adımları donanımına göre listelenir.'}
                  </p>
                </div>
              </div>

              <div className="grid w-full shrink-0 grid-cols-3 gap-2 lg:w-auto">
                {[
                  ['Profiller', presetCount],
                  ['Güç planı', activeProfile ? 'Aktif' : 'Seçilmedi'],
                  ['Geri alma', data?.hasBackup ? 'Hazır' : 'Beklemede']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-white/[0.05] bg-ink-950/40 px-3 py-2.5">
                    <p className="text-[8.5px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                    <p className="mt-1 truncate text-[11.5px] font-semibold text-slate-200">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {activeProfile && (
              <div className="relative mt-5 flex flex-col gap-3 rounded-xl border border-volt/20 bg-volt/[0.04] p-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-volt/25 bg-volt/10 text-volt">
                    <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
                  </span>
                  <div>
                    <p className="text-[12px] font-semibold text-slate-100">{activeProfile.name} profili aktif</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {formatDate(data.appliedAt)}
                      {data.nvidiaApplied ? ' · NVIDIA değişiklikleri için yeniden başlatma önerilir' : ''}
                    </p>
                  </div>
                </div>
                <button type="button" onClick={revert} disabled={busy} className="btn-ghost h-8 px-3 text-[10.5px]">
                  {reverting ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="refresh" className="h-3.5 w-3.5" />}
                  {reverting ? 'Geri alınıyor…' : 'Varsayılana dön'}
                </button>
              </div>
            )}
          </section>

          <div className="mt-4 grid gap-3 xl:grid-cols-2">
            {data?.presets?.map((preset) => {
              const accent = ACCENTS[preset.accent] || ACCENTS.ion
              const active = activeProfile?.id === preset.id
              const open = expanded === preset.id
              const isApplying = applying === preset.id

              return (
                <article
                  key={preset.id}
                  className={cn(
                    'panel relative overflow-hidden p-5 transition-colors',
                    active ? 'border-volt/25' : 'hover:border-white/10'
                  )}
                >
                  {active && <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-volt/70 to-transparent" />}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl border', accent.iconBox)}>
                        <Icon name={preset.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <h3 className="font-display text-[16px] font-semibold tracking-tight text-white">
                          {preset.name}
                        </h3>
                        <p className="mt-0.5 text-[10px] text-slate-500">{preset.tag}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={cn('chip border', accent.badge)}>{preset.gain} etki</span>
                      {active && <Chip tone="volt">Aktif</Chip>}
                    </div>
                  </div>

                  <p className="mt-3 text-[11.5px] leading-relaxed text-slate-400">{preset.description}</p>

                  <div className="mt-3 space-y-1.5">
                    {preset.effects.map((effect) => (
                      <p key={effect} className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-400">
                        <Icon name="check" className="mt-0.5 h-3 w-3 shrink-0 text-volt" strokeWidth={2.4} />
                        {effect}
                      </p>
                    ))}
                  </div>

                  {preset.note && (
                    <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2 text-[10px] leading-relaxed text-slate-400">
                      <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0 text-ion" />
                      {preset.note}
                    </p>
                  )}

                  <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-300">
                        <Icon name="gpu" className="h-3 w-3 text-slate-500" />
                        {preset.vendorStepsTitle}
                      </p>
                      <button
                        type="button"
                        onClick={() => setExpanded(open ? null : preset.id)}
                        className="flex items-center gap-1 text-[9.5px] font-medium text-ion transition hover:text-ion-soft"
                      >
                        {open ? 'Gizle' : `${preset.vendorSteps.length} adım`}
                        <Icon
                          name="chevronDown"
                          className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
                        />
                      </button>
                    </div>

                    {open && (
                      <div className="mt-2 space-y-1.5 animate-fade-in">
                        {preset.vendorSteps.map((step) => (
                          <p key={step} className="flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-400">
                            <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-slate-600" />
                            {step}
                          </p>
                        ))}
                        <p className="pt-1 text-[9px] leading-relaxed text-slate-600">{preset.driverProfileNote}</p>
                      </div>
                    )}
                  </div>

                  {preset.id === 'fivem' && (
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/[0.14] bg-amber-400/[0.04] px-3 py-2.5">
                      <div>
                        <p className="text-[10.5px] font-medium text-slate-200">Defender istisnası ekle</p>
                        <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">
                          FiveM klasörü taranmaz. Yalnızca güvendiğin sunucularda aç; geri alınca kaldırılır.
                        </p>
                      </div>
                      <Toggle
                        checked={defenderExclusion}
                        onChange={setDefenderExclusion}
                        label="FiveM Defender istisnası"
                      />
                    </div>
                  )}

                  <div className="mt-3.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => apply(preset)}
                      disabled={busy || active}
                      className={cn(
                        'flex-1',
                        active ? 'btn-ghost opacity-60' : accent.button
                      )}
                    >
                      {isApplying ? <Spinner className="h-4 w-4" /> : <Icon name={active ? 'check' : 'zap'} className="h-4 w-4" />}
                      {active ? 'Bu profil aktif' : isApplying ? 'Uygulanıyor…' : 'Profili uygula'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
            <section className="panel p-4">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-volt">
                <Icon name="shield" className="h-3 w-3" />
                Geri alınabilir
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                Profil uygulanmadan önce GameDVR, güç planı, görsel efektler ve fare ayarlarının özgün değerleri
                yedeklenir. "Varsayılana dön" bu değerleri birebir geri yükler. Geri yükleme noktası açıksa Windows
                Sistem Koruması ek bir dönüş noktası oluşturur. NVIDIA güç profili ve FiveM istisnası yalnızca bu
                uygulama tarafından değiştirildiyse geri alınır.
              </p>
            </section>

            <section className="panel p-4">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ion">
                <Icon name="info" className="h-3 w-3" />
                Sürücü ayarları
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                {vendor?.hasNvidia
                  ? 'NVIDIA düşük gecikme ve doku süzme ayarları sürücü profil veritabanında tutulduğu için otomatik yazılmaz; panelden uygulanır.'
                  : vendor?.id === 'amd'
                    ? 'AMD Software ayarları sürücü tarafından yönetilir. Omerta FPS güvenli olmayan kayıt defteri yazımı yapmaz; Adrenalin adımlarını gösterir.'
                    : 'Sürücü paneli ayarları donanım üreticisinin uygulamasından uygulanır.'}
              </p>
              {canOpenPanel && (
                <button type="button" onClick={openPanel} disabled={opening} className="btn-ghost mt-2.5 w-full">
                  {opening ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
                  {vendor?.hasNvidia ? 'NVIDIA panelini aç' : 'AMD Software’ı aç'}
                </button>
              )}
            </section>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-slate-600">
            <Icon name="info" className="h-3 w-3" />
            Kazanç aralıkları donanım, sürücü ve oyuna göre değişir; garanti edilen FPS artışı değildir.
            <button type="button" onClick={() => onNavigate('scan')} className="text-ion hover:text-ion-soft">
              Donanım taramasına git
            </button>
          </p>
        </>
      )}
    </>
  )
}
