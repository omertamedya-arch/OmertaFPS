import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { cn, formatDate } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner, Toggle } from '../components/ui'
import { CROSSHAIR_STYLES, OVERLAY_COLORS, OverlayStage } from '../components/OverlayPreview'

const PRESET_OPTIONS = [
  {
    id: 'auto',
    label: 'Otomatik algıla',
    detail: 'CS2 → Rekabetçi FPS · FiveM → FiveM/Roleplay · GTA V → Hikayeli'
  },
  { id: 'fps', label: 'Rekabetçi FPS', detail: 'Valorant · CS2 · Apex' },
  { id: 'fivem', label: 'FiveM / Roleplay', detail: 'GTA V · rol yapma sunucuları' },
  { id: 'moba', label: 'MOBA', detail: 'LoL · Dota 2' },
  { id: 'story', label: 'Hikayeli / AAA', detail: 'Cyberpunk · RDR2' },
  { id: 'sim', label: 'Simülasyon / Strateji', detail: 'Cities: Skylines · Total War' }
]

const OVERLAY_FALLBACK = {
  displayId: 'primary',
  fps: { enabled: false, color: '#9FE8C8', opacity: 0.75, fontSize: 13 },
  crosshair: {
    enabled: false,
    style: 'cross',
    color: '#EAF6FF',
    opacity: 0.9,
    size: 10,
    thickness: 2,
    gap: 5,
    outline: true
  }
}

function Section({ icon, title, description, badge, children, tone = 'ion', className }) {
  return (
    <section className={cn('panel p-5', className)}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            'grid h-9 w-9 shrink-0 place-items-center rounded-xl border',
            tone === 'volt'
              ? 'border-volt/20 bg-volt/[0.06] text-volt'
              : tone === 'amber'
                ? 'border-amber-400/20 bg-amber-400/[0.06] text-amber-300'
                : 'border-ion/20 bg-ion/[0.06] text-ion'
          )}
        >
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-semibold text-white">{title}</h2>
            {badge}
          </div>
          {description && <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{description}</p>}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ColorSwatches({ value, onChange }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      {OVERLAY_COLORS.map((color) => (
        <button
          key={color.value}
          type="button"
          onClick={() => onChange(color.value)}
          title={color.label}
          aria-label={color.label}
          className={cn(
            'h-5 w-5 rounded-full border transition',
            value === color.value ? 'border-white ring-2 ring-white/25' : 'border-white/15 hover:border-white/40'
          )}
          style={{ backgroundColor: color.value }}
        />
      ))}
      <label
        className="relative grid h-5 w-5 cursor-pointer place-items-center overflow-hidden rounded-full border border-white/15 hover:border-white/40"
        title="Özel renk"
      >
        <span
          className="h-full w-full"
          style={{ background: 'conic-gradient(#ff5a5a, #ffd166, #3df5a5, #3ba7ff, #ff4d7e, #ff5a5a)' }}
        />
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Özel renk seç"
        />
      </label>
    </div>
  )
}

function Slider({ label, value, min, max, step = 1, suffix = '', onChange }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[9.5px] text-slate-500">
        <span>{label}</span>
        <span className="font-mono text-slate-300">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1.5 h-1 w-full cursor-pointer appearance-none rounded-full bg-white/10"
        style={{ accentColor: '#3BA7FF' }}
      />
    </label>
  )
}

export default function Settings({ boot, licensed, onNavigate }) {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(null)
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [update, setUpdate] = useState(null)
  const [checkBusy, setCheckBusy] = useState(false)
  const [installing, setInstalling] = useState(false)
  const overlayTimer = useRef(null)
  const overlayPending = useRef(null)
  const overlayQueue = useRef(Promise.resolve())

  useEffect(() => () => clearTimeout(overlayTimer.current), [])

  useEffect(() => {
    let active = true
    api.updater
      .status()
      .then((result) => {
        if (active && result?.state) setUpdate(result)
      })
      .catch(() => {})

    const off = api.updater.onStatus((payload) => {
      if (active) setUpdate(payload)
    })

    return () => {
      active = false
      if (typeof off === 'function') off()
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [status, restorePoint] = await Promise.all([api.settings.status(), api.restorePoint.status()])
      if (status?.ok === false) throw new Error(status.error || 'Ayarlar okunamadı.')
      setData({ ...status, restorePoint: restorePoint?.ok === false ? null : restorePoint })
      setError(null)
    } catch (cause) {
      setError(cause.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const save = async (patch, message) => {
    if (saving) return null
    setSaving(message?.key || 'general')
    try {
      const response = await api.settings.update(patch)
      if (response?.ok === false) {
        if (response.code !== 'license-required') {
          toast.error('Ayar kaydedilemedi', response.error || 'Beklenmeyen bir hata oluştu.')
        }
        return null
      }
      setData((current) => ({ ...current, ...response, restorePoint: current?.restorePoint || null }))
      if (message?.success) toast.success(message.success, message.detail || '')
      return response
    } catch (cause) {
      toast.error('Ayar kaydedilemedi', cause.message)
      return null
    } finally {
      setSaving(null)
    }
  }

  const toggleStartWithWindows = (next) =>
    save(
      { startWithWindows: next },
      {
        key: 'startup',
        success: next ? 'Windows ile başlatma açıldı' : 'Windows ile başlatma kapatıldı',
        detail: next ? 'Oturum açıldığında Omerta FPS otomatik başlar.' : 'Uygulama yalnızca elle açılır.'
      }
    )

  const toggleRestorePoint = (next) =>
    save(
      { restorePointBeforeApply: next },
      {
        key: 'restore',
        success: next ? 'Geri yükleme noktası açıldı' : 'Geri yükleme noktası kapatıldı'
      }
    )

  const toggleAutoProfile = (next) =>
    save(
      { autoProfile: { enabled: next } },
      {
        key: 'auto',
        success: next ? 'Otomatik profil açıldı' : 'Otomatik profil kapatıldı',
        detail: next
          ? 'Oyun açıldığında seçilen profil uygulanır, oyun kapanınca geri alınır.'
          : 'Profiller yalnızca elle uygulanır.'
      }
    )

  const selectPreset = (presetId) =>
    save({ autoProfile: { presetId } }, { key: 'preset', success: 'Otomatik profil güncellendi' })

  const patchOverlay = (section, patch) => {
    setData((current) => {
      if (!current) return current
      const base = current.overlay || OVERLAY_FALLBACK
      const next =
        section === 'fps'
          ? { ...base, fps: { ...base.fps, ...patch } }
          : section === 'crosshair'
            ? { ...base, crosshair: { ...base.crosshair, ...patch } }
            : { ...base, ...patch }
      overlayPending.current = next
      return { ...current, overlay: next }
    })

    clearTimeout(overlayTimer.current)
    overlayTimer.current = setTimeout(() => {
      const overlay = overlayPending.current
      if (!overlay) return
      overlayQueue.current = overlayQueue.current
        .then(async () => {
          const response = await api.settings.update({ overlay })
          if (response?.ok === false) {
            if (response.code !== 'license-required') {
              toast.error('Gösterge ayarı kaydedilemedi', response.error || 'Beklenmeyen bir hata oluştu.')
            }
            load()
            return
          }
          setData((current) =>
            current ? { ...current, overlay: response.overlay || overlay } : current
          )
        })
        .catch((cause) => toast.error('Gösterge ayarı kaydedilemedi', cause.message))
    }, 350)
  }

  const createRestore = async () => {
    if (restoreBusy) return
    setRestoreBusy(true)
    try {
      const response = await api.restorePoint.create()
      if (response?.ok === false) {
        toast.error('Geri yükleme noktası oluşturulamadı', response.error || 'Windows sistem korumasını kontrol et.')
        return
      }
      setData((current) =>
        current
          ? {
              ...current,
              restorePoint: {
                supported: true,
                last: {
                  created: response.created,
                  reason: response.reason,
                  at: response.at,
                  description: response.description,
                  note: response.note,
                  message: response.message
                }
              }
            }
          : current
      )
      if (response.created) {
        toast.success('Geri yükleme noktası oluşturuldu', response.description || 'Sistem ayarları yedeklendi.')
      } else {
        toast.warning(
          'Geri yükleme noktası oluşturulamadı',
          response.note || response.message || 'Windows sistem koruması kapalı olabilir.'
        )
      }
    } catch (cause) {
      toast.error('Geri yükleme noktası oluşturulamadı', cause.message)
    } finally {
      setRestoreBusy(false)
    }
  }

  const clearActivity = async () => {
    if (clearing) return
    if (!window.confirm('Aktivite geçmişi silinsin mi? Bu işlem geri alınamaz.')) return
    setClearing(true)
    try {
      const response = await api.activityClear()
      if (response?.ok === false) throw new Error(response.error || 'Geçmiş silinemedi.')
      toast.success('Aktivite geçmişi silindi', 'Yeni işlemler listelenmeye devam eder.')
    } catch (cause) {
      toast.error('Aktivite geçmişi silinemedi', cause.message)
    } finally {
      setClearing(false)
    }
  }

  const updateBusy = checkBusy || ['checking', 'available', 'downloading'].includes(update?.state)

  const checkLabel =
    checkBusy || update?.state === 'checking'
      ? 'Denetleniyor…'
      : update?.state === 'available' || update?.state === 'downloading'
        ? 'İndiriliyor…'
        : 'Güncellemeyi denetle'

  const checkUpdates = async () => {
    if (updateBusy) return
    setCheckBusy(true)
    try {
      const result = await api.updater.check()
      const state = result?.state
      if (state === 'disabled') {
        toast.info('Güncelleme denetimi kapalı', 'Bu kontrol yalnızca kurulu sürümde çalışır.')
      } else if (state === 'error') {
        toast.error('Güncelleme denetlenemedi', result.message || 'İnternet bağlantısını kontrol et.')
      } else if (state === 'idle') {
        toast.success('Uygulama güncel', `v${result.currentVersion || boot?.version || '—'} en son sürüm.`)
      } else if (state === 'available' || state === 'downloading') {
        toast.info('Yeni sürüm bulundu', `v${result.version} arka planda indiriliyor.`)
      } else if (state === 'ready') {
        toast.success('Güncelleme hazır', `v${result.version} indirildi. Kurmak için yeniden başlat.`)
      }
    } catch (cause) {
      toast.error('Güncelleme denetlenemedi', cause.message)
    } finally {
      setCheckBusy(false)
    }
  }

  const installUpdate = async () => {
    if (installing) return
    setInstalling(true)
    try {
      const result = await api.updater.install()
      if (!result?.installing) setInstalling(false)
    } catch (cause) {
      setInstalling(false)
      toast.error('Kurulum başlatılamadı', cause.message)
    }
  }

  if (loading && !data) {
    return (
      <>
        <PageHeader eyebrow="Ayarlar" title="Uygulama ve sistem tercihleri." subtitle="Ayarlar okunuyor…" />
        <SkeletonRows rows={4} className="h-[110px]" />
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        <PageHeader eyebrow="Ayarlar" title="Ayarlar okunamadı" />
        <EmptyState icon="alert" title="Durum alınamadı" message={error} />
        <button type="button" onClick={load} className="btn-ghost mt-4">
          <Icon name="refresh" className="h-4 w-4" />
          Tekrar dene
        </button>
      </>
    )
  }

  const auto = data?.autoProfile || { enabled: false, presetId: 'auto' }
  const overlay = data?.overlay || OVERLAY_FALLBACK
  const lastRestore = data?.restorePoint?.last
  const presetLabel = PRESET_OPTIONS.find((item) => item.id === auto.presetId)?.label || 'Otomatik algıla'

  const currentVersion = boot?.version || update?.currentVersion || data?.version || '—'
  const updatePercent = Math.max(0, Math.min(100, Number(update?.percent) || 0))
  const updateReady = update?.state === 'ready'

  const updateBadge =
    update?.state === 'ready'
      ? { tone: 'volt', label: 'Kuruluma hazır' }
      : update?.state === 'available' || update?.state === 'downloading'
        ? { tone: 'ion', label: 'İndiriliyor' }
        : update?.state === 'checking'
          ? { tone: 'ion', label: 'Denetleniyor' }
          : update?.state === 'error'
            ? { tone: 'amber', label: 'Denetlenemedi' }
            : update?.state === 'disabled'
              ? { tone: 'muted', label: 'Önizleme' }
              : update?.checkedAt
                ? { tone: 'volt', label: 'Güncel' }
                : { tone: 'muted', label: 'Otomatik' }

  const updateStatus =
    update?.state === 'disabled'
      ? 'Güncelleme denetimi kurulu sürümde çalışır; bu önizlemede kapalı.'
      : update?.state === 'checking'
        ? 'Sunucu kontrol ediliyor…'
        : update?.state === 'available'
          ? `v${update.version} bulundu, indirme hazırlanıyor…`
          : update?.state === 'downloading'
            ? `v${update.version} indiriliyor · %${updatePercent.toFixed(0)}`
            : update?.state === 'ready'
              ? `v${update.version} indirildi. Kurmak için uygulamayı yeniden başlat.`
              : update?.state === 'error'
                ? update.message || 'Sunucuya ulaşılamadı.'
                : update?.checkedAt
                  ? 'En son sürümü kullanıyorsun.'
                  : 'Uygulama her açılışta sessizce kontrol eder; istersen hemen denetleyebilirsin.'

  return (
    <>
      <PageHeader
        eyebrow="Ayarlar"
        title="Uygulama ve sistem tercihleri."
        subtitle="Başlangıç davranışı, geri yükleme noktaları, otomatik profil ve yerel veriler. Tüm ayarlar bu cihazda saklanır."
        actions={
          <button type="button" onClick={load} className="btn-quiet" aria-label="Ayarları yenile">
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Section
          icon="refresh"
          title="Güncellemeler"
          description="Yeni sürüm gelmiş mi diye hemen denetle. İndirme arka planda yapılır, oyun açıkken de devam eder."
          tone="volt"
          className="xl:col-span-2"
          badge={<Chip tone={updateBadge.tone}>{updateBadge.label}</Chip>}
        >
          <div className="flex flex-col gap-3 rounded-xl border border-white/[0.05] bg-ink-950/40 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-[12px] font-medium text-slate-200">
                Kurulu sürüm <span className="font-mono text-slate-400">v{currentVersion}</span>
                {update?.checkedAt && (
                  <span className="font-mono text-[9px] text-slate-600">
                    son kontrol {new Date(update.checkedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{updateStatus}</p>

              {(update?.state === 'available' || update?.state === 'downloading') && (
                <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ion to-volt transition-[width] duration-300"
                    style={{ width: `${update.state === 'available' ? 8 : updatePercent}%` }}
                  />
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" onClick={checkUpdates} disabled={updateBusy} className="btn-ghost">
                {updateBusy ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
                {checkLabel}
              </button>
              {updateReady && (
                <button type="button" onClick={installUpdate} disabled={installing} className="btn-volt">
                  {installing ? <Spinner className="h-4 w-4" /> : <Icon name="power" className="h-4 w-4" />}
                  {installing ? 'Kuruluyor…' : 'Yeniden başlat ve kur'}
                </button>
              )}
            </div>
          </div>
        </Section>

        <Section
          icon="power"
          title="Başlangıç"
          description="Omerta FPS'in Windows oturumuyla birlikte başlamasını yönet."
          badge={<Chip tone={data?.loginItem ? 'volt' : 'muted'}>{data?.loginItem ? 'Açık' : 'Kapalı'}</Chip>}
        >
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-ink-950/40 px-4 py-3.5">
            <div>
              <p className="text-[12px] font-medium text-slate-200">Windows ile başlat</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Otomatik profil ve e-spor modülleri için önerilir. Yönetici izni her açılışta istenebilir.
              </p>
            </div>
            <Toggle
              checked={Boolean(data?.loginItem)}
              busy={saving === 'startup'}
              onChange={toggleStartWithWindows}
              label="Windows ile başlat"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Chip tone={boot?.admin ? 'volt' : 'amber'}>{boot?.admin ? 'Yönetici olarak çalışıyor' : 'Yönetici izni yok'}</Chip>
            <Chip tone="muted">v{boot?.version || data?.version || '—'}</Chip>
            <Chip tone="muted">{data?.platform || boot?.system?.platform}</Chip>
          </div>
        </Section>

        <Section
          icon="shield"
          title="Geri yükleme noktası"
          description="Profil uygulanmadan önce Windows Sistem Koruması ile geri dönüş noktası oluştur."
          tone="volt"
          badge={
            <Chip tone={lastRestore?.created ? 'volt' : 'muted'}>
              {lastRestore ? (lastRestore.created ? 'Son nokta hazır' : 'Oluşturulamadı') : 'Henüz yok'}
            </Chip>
          }
        >
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-ink-950/40 px-4 py-3.5">
            <div>
              <p className="text-[12px] font-medium text-slate-200">Profil öncesi otomatik nokta</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Windows 24 saatte bir nokta oluşturur; sıklık sınırına takılırsa profil yine uygulanır.
              </p>
            </div>
            <Toggle
              checked={data?.restorePointBeforeApply !== false}
              busy={saving === 'restore'}
              onChange={toggleRestorePoint}
              label="Profil öncesi geri yükleme noktası"
            />
          </div>

          <div className="mt-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Son sonuç</p>
            {lastRestore ? (
              <>
                <p className="mt-1 text-[11px] font-medium text-slate-200">
                  {lastRestore.created ? 'Oluşturuldu' : lastRestore.note || lastRestore.message || 'Oluşturulamadı'}
                </p>
                <p className="mt-0.5 text-[9.5px] text-slate-500">
                  {formatDate(lastRestore.at)}
                  {lastRestore.description ? ` · ${lastRestore.description}` : ''}
                </p>
              </>
            ) : (
              <p className="mt-1 text-[10.5px] text-slate-500">Bu cihazda henüz geri yükleme noktası oluşturulmadı.</p>
            )}
          </div>

          <button type="button" onClick={createRestore} disabled={restoreBusy} className="btn-ghost mt-3 w-full">
            {restoreBusy ? <Spinner className="h-4 w-4" /> : <Icon name="clock" className="h-4 w-4" />}
            {restoreBusy ? 'Geri yükleme noktası oluşturuluyor…' : 'Şimdi geri yükleme noktası oluştur'}
          </button>
        </Section>

        <Section
          icon="gamepad"
          title="Otomatik oyun profili"
          description="Desteklenen bir oyun açıldığında profili uygula, oyun kapanınca özgün ayarlara dön."
          badge={
            <Chip tone={auto.enabled ? 'volt' : 'muted'}>
              {auto.enabled ? `${presetLabel} · açık` : 'Kapalı'}
            </Chip>
          }
          tone="amber"
        >
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-ink-950/40 px-4 py-3.5">
            <div>
              <p className="flex items-center gap-2 text-[12px] font-medium text-slate-200">
                Oyun algılandığında uygula
                {!licensed && <Chip tone="ion">Pro</Chip>}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Elle uyguladığın bir profil varsa otomatik profil onu ezmez.
              </p>
            </div>
            <Toggle
              checked={Boolean(auto.enabled)}
              busy={saving === 'auto'}
              onChange={toggleAutoProfile}
              label="Otomatik oyun profili"
            />
          </div>

          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {PRESET_OPTIONS.map((option) => {
              const active = auto.presetId === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => selectPreset(option.id)}
                  disabled={saving === 'preset'}
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left transition',
                    active
                      ? 'border-ion/30 bg-ion/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(59,167,255,0.12)]'
                      : 'border-white/[0.05] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200'
                  )}
                >
                  <p className="text-[11px] font-medium">{option.label}</p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">{option.detail}</p>
                </button>
              )
            })}
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-600">
            <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
            Otomatik profil yalnızca uygulama açıkken çalışır. FiveM için Defender istisnası otomatik eklenmez; istersen
            profil kartından açabilirsin.
          </p>
        </Section>

        <Section
          icon="database"
          title="Veri ve gizlilik"
          description="Uygulama verileri bu cihazda kalır; hiçbir telemetri gönderilmez."
          badge={<Chip tone="muted">Yerel</Chip>}
        >
          <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Veri klasörü</p>
            <p className="mt-1 break-all font-mono text-[10px] text-slate-300">{data?.dataDir || '—'}</p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Donanım kimliği</p>
              <p className="mt-1 truncate font-mono text-[10px] text-slate-300" title={boot?.hwid}>
                {boot?.hwid || '—'}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Lisans</p>
              <p className="mt-1 text-[10px] text-slate-300">{licensed ? 'Pro etkin' : 'Ücretsiz sürüm'}</p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={clearActivity} disabled={clearing} className="btn-ghost flex-1">
              {clearing ? <Spinner className="h-4 w-4" /> : <Icon name="trash" className="h-4 w-4" />}
              {clearing ? 'Siliniyor…' : 'Aktivite geçmişini sil'}
            </button>
            <button type="button" onClick={() => onNavigate?.('advanced')} className="btn-ghost">
              <Icon name="sliders" className="h-4 w-4" />
              Gelişmiş
            </button>
          </div>
        </Section>

        <Section
          icon="crosshair"
          title="Ekran üstü göstergeler"
          description="FPS rozeti ve crosshair oyunun üstünde kalır; tıklamaları geçirir, odağı çalmaz."
          tone="volt"
          className="xl:col-span-2"
          badge={
            <Chip tone={overlay.fps.enabled || overlay.crosshair.enabled ? 'volt' : 'muted'}>
              {overlay.fps.enabled && overlay.crosshair.enabled
                ? 'FPS + crosshair'
                : overlay.fps.enabled
                  ? 'FPS açık'
                  : overlay.crosshair.enabled
                    ? 'Crosshair açık'
                    : 'Kapalı'}
            </Chip>
          }
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.05] bg-ink-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[11.5px] font-medium text-slate-200">
                      FPS göstergesi
                      {!licensed && <Chip tone="ion">Pro</Chip>}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-slate-500">
                      Sağ üst köşede küçük, yarı saydam bir rozet.
                    </p>
                  </div>
                  <Toggle
                    checked={overlay.fps.enabled}
                    onChange={(next) => patchOverlay('fps', { enabled: next })}
                    label="FPS göstergesi"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Slider
                    label="Saydamlık"
                    value={Math.round(overlay.fps.opacity * 100)}
                    min={20}
                    max={100}
                    suffix="%"
                    onChange={(value) => patchOverlay('fps', { opacity: value / 100 })}
                  />
                  <Slider
                    label="Yazı boyutu"
                    value={overlay.fps.fontSize}
                    min={10}
                    max={20}
                    suffix=" px"
                    onChange={(value) => patchOverlay('fps', { fontSize: value })}
                  />
                </div>

                <ColorSwatches value={overlay.fps.color} onChange={(color) => patchOverlay('fps', { color })} />
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-ink-950/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-2 text-[11.5px] font-medium text-slate-200">
                      Crosshair
                      {!licensed && <Chip tone="ion">Pro</Chip>}
                    </p>
                    <p className="mt-0.5 text-[9.5px] text-slate-500">
                      Ekranın tam ortasında; biçim, renk ve ölçüleri sen belirle.
                    </p>
                  </div>
                  <Toggle
                    checked={overlay.crosshair.enabled}
                    onChange={(next) => patchOverlay('crosshair', { enabled: next })}
                    label="Crosshair"
                  />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {CROSSHAIR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => patchOverlay('crosshair', { style: style.id })}
                      className={cn(
                        'rounded-lg border px-2 py-2 text-[10px] font-medium transition',
                        overlay.crosshair.style === style.id
                          ? 'border-volt/35 bg-volt/[0.08] text-volt'
                          : 'border-white/[0.06] bg-white/[0.02] text-slate-400 hover:text-slate-200'
                      )}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>

                <ColorSwatches
                  value={overlay.crosshair.color}
                  onChange={(color) => patchOverlay('crosshair', { color })}
                />

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Slider
                    label="Boyut"
                    value={overlay.crosshair.size}
                    min={6}
                    max={40}
                    suffix=" px"
                    onChange={(value) => patchOverlay('crosshair', { size: value })}
                  />
                  <Slider
                    label="Kalınlık"
                    value={overlay.crosshair.thickness}
                    min={1}
                    max={5}
                    suffix=" px"
                    onChange={(value) => patchOverlay('crosshair', { thickness: value })}
                  />
                  <Slider
                    label="Merkez boşluğu"
                    value={overlay.crosshair.gap}
                    min={0}
                    max={20}
                    suffix=" px"
                    onChange={(value) => patchOverlay('crosshair', { gap: value })}
                  />
                  <Slider
                    label="Saydamlık"
                    value={Math.round(overlay.crosshair.opacity * 100)}
                    min={20}
                    max={100}
                    suffix="%"
                    onChange={(value) => patchOverlay('crosshair', { opacity: value / 100 })}
                  />
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                  <span className="text-[10px] text-slate-400">Koyu kontur (aydınlık sahnelerde görünürlük)</span>
                  <Toggle
                    checked={overlay.crosshair.outline}
                    onChange={(next) => patchOverlay('crosshair', { outline: next })}
                    label="Crosshair konturu"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                <label className="block">
                  <span className="label">Gösterge ekranı</span>
                  <select
                    value={overlay.displayId}
                    onChange={(event) => patchOverlay('root', { displayId: event.target.value })}
                    className="mt-1.5 w-full rounded-lg border border-white/[0.07] bg-ink-950/60 px-3 py-2 text-[11px] text-slate-200 outline-none transition focus:border-ion/40"
                  >
                    {(data?.displays?.length ? data.displays : [{ id: 'primary', label: 'Ekran 1' }]).map(
                      (display) => (
                        <option key={display.id} value={display.id}>
                          {display.label}
                          {display.primary ? ' · birincil' : ''}
                        </option>
                      )
                    )}
                  </select>
                </label>
                <p className="mt-2 flex items-start gap-1.5 text-[9px] leading-relaxed text-slate-600">
                  <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
                  Tam ekran özel (exclusive) modda Windows üstte kalan pencereleri gizler; kenarlıksız tam ekran ve
                  pencere modunda görünür. FPS rozeti Windows kompozisyon kare hızını ölçer; oyunun kendi sayacından
                  farklı olabilir.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <OverlayStage overlay={overlay} />
              <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Canlı önizleme</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-slate-500">
                  Değişiklikler bu cihazda anında uygulanır; oyun açıkken de gösterge üstte kalır.
                </p>
              </div>
            </div>
          </div>
        </Section>
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-[9.5px] text-slate-600">
        <Icon name="info" className="h-3 w-3" />
        Kurulum dosyası kod imzalı değil; ilk kurulumda Windows SmartScreen uyarı gösterebilir. Güncellemeler arka
        planda indirilir ve uygulama yeniden başlatıldığında kurulur.
      </p>
    </>
  )
}
