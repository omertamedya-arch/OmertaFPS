import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner, Toggle } from '../components/ui'

const EMPTY_BUSY = { timer: false, fivem: false, suspend: false, resolution: false, nis: false }

function Card({ icon, title, badge, description, children, tone = 'ion' }) {
  return (
    <section className="panel flex flex-col p-5">
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
      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  )
}

function Metric({ label, value, tone = 'default' }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2">
      <p className="text-[8.5px] uppercase tracking-[0.14em] text-slate-600">{label}</p>
      <p
        className={cn(
          'mt-1 truncate font-mono text-[11px] font-semibold',
          tone === 'volt' ? 'text-volt' : tone === 'amber' ? 'text-amber-300' : 'text-slate-200'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function Note({ children, tone = 'muted' }) {
  return (
    <p
      className={cn(
        'mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed',
        tone === 'amber' ? 'text-amber-300/85' : 'text-slate-600'
      )}
    >
      <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export default function Esports() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(EMPTY_BUSY)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true)
      try {
        const [timer, fivem, suspend, resolution, nis] = await Promise.all([
          api.timer.status(),
          api.fivem.status(),
          api.suspend.status(),
          api.resolution.status(),
          api.nis.status()
        ])
        setData({ timer, fivem, suspend, resolution, nis })
        setError(null)
      } catch (cause) {
        setError(cause.message)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    load()
  }, [load])

  const patch = useCallback((key, value) => {
    setData((current) => (current ? { ...current, [key]: value } : current))
  }, [])

  const refreshSuspend = useCallback(async () => {
    const response = await api.suspend.status()
    if (response?.ok !== false) patch('suspend', response)
  }, [patch])

  useEffect(() => {
    const off = api.onEsportsEvent?.((event) => {
      if (!event) return
      if (event.type === 'profile-auto') {
        if (event.action === 'applied') {
          toast.info('Otomatik profil uygulandı', `${event.name || event.presetId} · oyun algılandı`)
        } else if (event.action === 'reverted') {
          toast.info('Otomatik profil geri alındı', 'Özgün sistem ayarlarına dönüldü.')
        }
        return
      }
      if (event.type === 'game-start') {
        toast.info(
          `${event.game || 'Oyun'} algılandı`,
          'Akıllı oyun modu, otomatik profil ve çözünürlük otomasyonu devreye giriyor.'
        )
      }
      if (event.type === 'game-stop') {
        toast.success('Oyun kapandı', 'Duraklatılan uygulamalar ve masaüstü çözünürlüğü geri yükleniyor.')
      }
      refreshSuspend()
      api.resolution.status().then((response) => {
        if (response?.ok !== false) patch('resolution', response)
      })
    })
    return () => off?.()
  }, [patch, refreshSuspend, toast])

  const run = useCallback(
    async (key, task, messages) => {
      if (busy[key]) return null
      setBusy((current) => ({ ...current, [key]: true }))
      try {
        const response = await task()
        if (response?.ok === false) {
          if (response.code !== 'license-required') {
            toast.error(messages.error || 'İşlem tamamlanamadı', response.error || 'Beklenmeyen bir hata oluştu.')
          }
          return response
        }
        if (messages.success) toast.success(messages.success, messages.detail || '')
        return response
      } catch (cause) {
        toast.error(messages.error || 'İşlem tamamlanamadı', cause.message)
        return null
      } finally {
        setBusy((current) => ({ ...current, [key]: false }))
      }
    },
    [busy, toast]
  )

  const startTimer = () =>
    run('timer', () => api.timer.start(), {
      success: 'Maksimum tepkime modu açıldı',
      detail: 'Uygulama açık kaldığı sürece sistem zamanlayıcısı 0.5 ms’de tutulur.',
      error: 'Tepkime modu açılamadı'
    }).then(async (response) => {
      if (response?.ok !== false) patch('timer', response)
    })

  const stopTimer = () =>
    run('timer', () => api.timer.stop(), {
      success: 'Varsayılan zamanlayıcıya dönüldü',
      error: 'Tepkime modu kapatılamadı'
    }).then(async (response) => {
      if (response?.ok !== false) patch('timer', response)
    })

  const applyFivem = () =>
    run('fivem', () => api.fivem.apply(), {
      success: 'FiveM profili uygulandı',
      detail: 'İşlem önceliği ve Defender istisnası denetlendi.',
      error: 'FiveM profili uygulanamadı'
    }).then((response) => {
      if (response?.ok !== false) patch('fivem', response)
    })

  const revertFivem = () =>
    run('fivem', () => api.fivem.revert(), {
      success: 'FiveM profili geri alındı',
      detail: 'Omerta FPS’in eklediği Defender istisnası kaldırıldı.',
      error: 'FiveM profili geri alınamadı'
    }).then((response) => {
      if (response?.ok !== false) patch('fivem', response)
    })

  const toggleSuspend = (next) =>
    run('suspend', () => (next ? api.suspend.enable() : api.suspend.disable()), {
      success: next ? 'Akıllı oyun modu açıldı' : 'Akıllı oyun modu kapatıldı',
      detail: next
        ? 'Oyun açıldığında güvenli listedeki arka plan uygulamaları duraklatılır.'
        : 'Duraklatılan tüm uygulamalar uyandırıldı.',
      error: 'Akıllı oyun modu değiştirilemedi'
    }).then(async (response) => {
      if (response?.ok !== false) await refreshSuspend()
    })

  const resumeSuspended = () =>
    run('suspend', () => api.suspend.resume(), {
      success: 'Uygulamalar uyandırıldı',
      detail: 'Duraklatılan tüm süreçler yeniden çalışıyor.',
      error: 'Uygulamalar uyandırılamadı'
    }).then(async (response) => {
      if (response?.ok !== false) await refreshSuspend()
    })

  const toggleResolution = (next) =>
    run(
      'resolution',
      () =>
        next
          ? api.resolution.enable(data?.resolution?.target?.width, data?.resolution?.target?.height)
          : api.resolution.disable(),
      {
        success: next ? '4:3 otomasyonu açıldı' : '4:3 otomasyonu kapatıldı',
        detail: next ? 'Oyun açıldığında seçilen moda geçilir.' : 'Masaüstü çözünürlüğü geri yüklendi.',
        error: 'Çözünürlük otomasyonu değiştirilemedi'
      }
    ).then((response) => {
      if (response?.ok !== false) patch('resolution', response)
    })

  const selectMode = (mode) => {
    setData((current) =>
      current?.resolution?.target
        ? {
            ...current,
            resolution: {
              ...current.resolution,
              target: { width: mode.width, height: mode.height }
            }
          }
        : current
    )
  }

  const applyResolution = () =>
    run('resolution', () => api.resolution.applyNow(), {
      success: 'Çözünürlük uygulandı',
      detail: 'Masaüstüne döndüğünde özgün mod geri yüklenir.',
      error: 'Çözünürlük değiştirilemedi'
    }).then((response) => {
      if (response?.ok !== false) patch('resolution', response)
    })

  const restoreResolution = () =>
    run('resolution', () => api.resolution.restoreNow(), {
      success: 'Masaüstü çözünürlüğü geri yüklendi',
      error: 'Çözünürlük geri yüklenemedi'
    }).then((response) => {
      if (response?.ok !== false) patch('resolution', response)
    })

  const openNisPanel = () =>
    run('nis', () => api.nis.openPanel(), {
      error: 'NVIDIA Denetim Masası açılamadı'
    })

  if (loading && !data) {
    return (
      <>
        <PageHeader
          eyebrow="E-spor Modülleri"
          title="Gecikmeyi ve dikkat dağıtıcıları kapat."
          subtitle="Premium modüller durumu okunuyor…"
        />
        <SkeletonRows rows={3} className="h-[150px]" />
      </>
    )
  }

  if (error && !data) {
    return (
      <>
        <PageHeader eyebrow="E-spor Modülleri" title="E-spor modülleri okunamadı" />
        <EmptyState icon="alert" title="Durum alınamadı" message={error} />
        <button type="button" onClick={() => load()} className="btn-ghost mt-4">
          <Icon name="refresh" className="h-4 w-4" />
          Tekrar dene
        </button>
      </>
    )
  }

  const timer = data?.timer || {}
  const fivem = data?.fivem || {}
  const suspend = data?.suspend || {}
  const resolution = data?.resolution || {}
  const nis = data?.nis || {}
  const modes = resolution.modes || []
  const target = resolution.target || { width: 1280, height: 960 }

  return (
    <>
      <PageHeader
        eyebrow="E-spor Modülleri"
        title="Gecikmeyi ve dikkat dağıtıcıları kapat."
        subtitle="Maksimum tepkime modu, FiveM profili, akıllı arka plan dondurma, otomatik 4:3 ve NVIDIA Image Scaling. Tüm modüller geri alınabilir; kapatma ve geri yükleme işlemleri lisans gerektirmez."
        actions={
          <button
            type="button"
            onClick={() => load({ quiet: true })}
            className="btn-quiet"
            aria-label="Yenile"
          >
            <Icon name="refresh" className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          icon="timer"
          title="Maksimum Tepkime Modu"
          description="Windows sistem zamanlayıcısını 15.6 ms’den 0.5 ms’ye sabitler. Fare ve klavye girişi daha sık işlenir."
          badge={
            <Chip tone={timer.active ? 'volt' : timer.supported ? 'muted' : 'amber'}>
              {timer.active ? 'Etkin' : timer.supported ? 'Hazır' : 'Desteklenmiyor'}
            </Chip>
          }
        >
          <div className="rounded-xl border border-white/[0.05] bg-ink-950/40 p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Geçerli çözünürlük</p>
                <p className="mt-1 font-display text-[30px] font-semibold leading-none tracking-tight text-white">
                  {timer.currentMs ? `${timer.currentMs}` : '—'}
                  <span className="ml-1 text-[12px] font-normal text-muted">ms</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Hedef</p>
                <p className="mt-1 font-mono text-[14px] font-semibold text-volt">{timer.targetMs ?? 0.5} ms</p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric label="En düşük" value={timer.minimumMs ? `${timer.minimumMs} ms` : '—'} />
              <Metric label="En yüksek" value={timer.maximumMs ? `${timer.maximumMs} ms` : '—'} />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startTimer}
                disabled={busy.timer || timer.active || !timer.supported}
                className="btn-primary flex-1"
              >
                {busy.timer ? <Spinner className="h-4 w-4" /> : <Icon name="zap" className="h-4 w-4" />}
                {busy.timer ? 'Uygulanıyor…' : timer.active ? 'Mod etkin' : 'Tepkime modunu aç'}
              </button>
              <button
                type="button"
                onClick={stopTimer}
                disabled={busy.timer || !timer.running}
                className="btn-ghost"
              >
                <Icon name="power" className="h-4 w-4" />
                Kapat
              </button>
            </div>

            {!timer.supported && (
              <p className="mt-2.5 flex items-center gap-1.5 text-[10px] text-amber-300/90">
                <Icon name="alert" className="h-3.5 w-3.5" />
                Bu donanım 0.5 ms zamanlayıcı aralığını desteklemiyor.
              </p>
            )}
          </div>

          <Note>
            Ayar yalnızca Omerta FPS açıkken geçerlidir; uygulama kapanınca veya “Kapat” ile sistem varsayılanına dönülür.
          </Note>
        </Card>

        <Card
          icon="swords"
          title="FiveM / Roleplay Profili"
          description="FiveM çalışırken süreç önceliğini Yüksek yapar ve Defender taramasından istisna tanımlar."
          badge={
            <Chip tone={fivem.exclusion ? 'volt' : fivem.running ? 'ion' : 'muted'}>
              {fivem.running ? 'Çalışıyor' : fivem.found ? 'Kurulu' : 'Bulunamadı'}
            </Chip>
          }
          tone="amber"
        >
          <div className="rounded-xl border border-white/[0.05] bg-ink-950/40 p-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">FiveM klasörü</p>
            <p className="mt-1 break-all font-mono text-[10.5px] text-slate-300">{fivem.folder || 'Algılanamadı'}</p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Metric
                label="İşlem önceliği"
                value={fivem.running ? fivem.priority || 'Bilinmiyor' : 'Kapalı'}
                tone={fivem.priorityHigh ? 'volt' : 'default'}
              />
              <Metric
                label="Defender istisnası"
                value={fivem.exclusion ? 'Tanımlı' : fivem.defenderAvailable ? 'Yok' : 'Kullanılamaz'}
                tone={fivem.exclusion ? 'volt' : 'default'}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyFivem}
                disabled={busy.fivem || !fivem.found}
                className="btn-primary flex-1"
              >
                {busy.fivem ? <Spinner className="h-4 w-4" /> : <Icon name="shieldOff" className="h-4 w-4" />}
                {busy.fivem ? 'Uygulanıyor…' : 'Profili uygula'}
              </button>
              <button
                type="button"
                onClick={revertFivem}
                disabled={busy.fivem || (!fivem.managedExclusion && !fivem.appliedAt)}
                className="btn-ghost"
              >
                <Icon name="refresh" className="h-4 w-4" />
                Geri al
              </button>
            </div>

            {!fivem.found && (
              <p className="mt-2.5 flex items-start gap-1.5 text-[10px] text-amber-300/90">
                <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                FiveM kurulumu bulunamadı. FiveM’i bir kez açıp yeniden dene.
              </p>
            )}
          </div>

          <Note tone="amber">
            Defender istisnası, FiveM klasöründeki dosyaların taranmaması demektir. İşlem önceliği kalıcı değildir;
            FiveM yeniden başlatılırsa profili tekrar uygula.
          </Note>
        </Card>

        <Card
          icon="gamepad"
          title="Akıllı Oyun Modu"
          description="cs2, FiveM veya GTA V açıldığında güvenli listedeki arka plan uygulamalarını geçici olarak dondurur."
          badge={<Chip tone={suspend.enabled ? (suspend.active ? 'volt' : 'ion') : 'muted'}>
            {suspend.active ? `${suspend.count} duraklatıldı` : suspend.enabled ? 'Bekliyor' : 'Kapalı'}
          </Chip>}
        >
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.05] bg-ink-950/40 px-4 py-3.5">
            <div>
              <p className="text-[12px] font-medium text-slate-200">Otomatik dondurma</p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                Oyun kapanınca tüm süreçler otomatik uyandırılır.
              </p>
            </div>
            <Toggle
              checked={Boolean(suspend.enabled)}
              busy={busy.suspend}
              onChange={toggleSuspend}
              label="Akıllı oyun modu"
            />
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Algılanan oyun</p>
              <p className="mt-1 text-[11px] font-medium text-slate-200">
                {suspend.running?.length ? suspend.running.join(' · ') : 'Yok'}
              </p>
            </div>
            <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Duraklatılan</p>
              <p className="mt-1 truncate text-[11px] font-medium text-slate-200">
                {suspend.items?.length ? suspend.items.join(', ') : 'Yok'}
              </p>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={resumeSuspended}
              disabled={busy.suspend || !suspend.active}
              className="btn-ghost"
            >
              {busy.suspend ? <Spinner className="h-4 w-4" /> : <Icon name="play" className="h-4 w-4" />}
              Şimdi uyandır
            </button>
            <span className="text-[9.5px] text-slate-600">Spotify ve Discord asla duraklatılmaz.</span>
          </div>

          <Note>
            Güvenli liste: tarayıcılar, bulut senkronizasyonu, not ve mesajlaşma uygulamaları. Sistem süreçleri ve
            güvenlik yazılımları kapsam dışıdır.
          </Note>
        </Card>

        <Card
          icon="expand"
          title="Otomatik 4:3 Stretched"
          description="Oyun açıldığında ekranı seçilen 4:3 moda geçirir, masaüstüne dönünce 1080p’ye geri alır."
          badge={<Chip tone={resolution.active ? 'volt' : resolution.enabled ? 'ion' : 'muted'}>
            {resolution.active ? `${resolution.current?.width}×${resolution.current?.height}` : resolution.enabled ? 'Bekliyor' : 'Kapalı'}
          </Chip>}
          tone="volt"
        >
          <div className="rounded-xl border border-white/[0.05] bg-ink-950/40 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Geçerli masaüstü</p>
                <p className="mt-1 font-display text-[20px] font-semibold leading-none text-white">
                  {resolution.current?.width || '—'}×{resolution.current?.height || '—'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.16em] text-slate-600">Hedef mod</p>
                <p className="mt-1 font-mono text-[14px] font-semibold text-volt">
                  {target.width}×{target.height}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[9px] uppercase tracking-[0.14em] text-slate-600">Desteklenen 4:3 modlar</p>
              <div className="mt-1.5 grid max-h-[132px] grid-cols-3 gap-1.5 overflow-y-auto pr-1">
                {modes.length ? (
                  modes.map((mode) => {
                    const active = mode.width === target.width && mode.height === target.height
                    return (
                      <button
                        key={`${mode.width}x${mode.height}`}
                        type="button"
                        onClick={() => selectMode(mode)}
                        className={cn(
                          'rounded-lg border px-2 py-1.5 font-mono text-[10px] transition',
                          active
                            ? 'border-volt/35 bg-volt/[0.08] text-volt'
                            : 'border-white/[0.05] bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200'
                        )}
                      >
                        {mode.width}×{mode.height}
                      </button>
                    )
                  })
                ) : (
                  <p className="col-span-3 text-[10px] text-slate-600">Bu ekranda 4:3 mod bulunamadı.</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/[0.04] pt-3">
              <p className="text-[11px] text-slate-300">Oyun açılınca otomatik geç</p>
              <Toggle
                checked={Boolean(resolution.enabled)}
                busy={busy.resolution}
                onChange={toggleResolution}
                disabled={!modes.length}
                label="Otomatik 4:3 çözünürlük"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={applyResolution}
                disabled={busy.resolution || !modes.length}
                className="btn-ghost flex-1"
              >
                {busy.resolution ? <Spinner className="h-4 w-4" /> : <Icon name="monitor" className="h-4 w-4" />}
                Şimdi uygula
              </button>
              <button
                type="button"
                onClick={restoreResolution}
                disabled={busy.resolution || !resolution.backup}
                className="btn-ghost"
              >
                <Icon name="refresh" className="h-4 w-4" />
                Masaüstüne dön
              </button>
            </div>
          </div>

          <Note tone="amber">
            Çözünürlük değişimi ekranda kısa süreli kararma yapabilir. Değişiklik kalıcı değildir; oyun kapanınca
            veya otomasyon kapatılınca özgün mod geri yüklenir.
          </Note>
        </Card>
      </div>

      <section className="panel mt-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ion/20 bg-ion/[0.06] text-ion">
              <Icon name="gpu" className="h-[18px] w-[18px]" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[14px] font-semibold text-white">NVIDIA Image Scaling (NIS)</h2>
                <Chip tone={nis.available ? 'ion' : 'muted'}>
                  {nis.available ? nis.gpuName || 'NVIDIA' : 'NVIDIA algılanmadı'}
                </Chip>
              </div>
              <p className="mt-1 max-w-[620px] text-[10.5px] leading-relaxed text-slate-500">
                Düşük çözünürlükte yüksek FPS ve netlik için ölçeklendirme ve keskinleştirmeyi global olarak aç. Sürücü
                profili riskli olduğu için Omerta FPS değerleri otomatik yazmaz; panelde adım adım yönlendirir.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={openNisPanel}
            disabled={busy.nis || !nis.available}
            className="btn-primary"
          >
            {busy.nis ? <Spinner className="h-4 w-4" /> : <Icon name="external" className="h-4 w-4" />}
            {busy.nis ? 'Açılıyor…' : 'NVIDIA panelini aç'}
          </button>
        </div>

        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {(nis.steps || []).map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-2.5 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
            >
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md border border-ion/20 bg-ion/[0.08] font-mono text-[9.5px] text-ion">
                {index + 1}
              </span>
              <span className="text-[10.5px] leading-relaxed text-slate-400">{step}</span>
            </li>
          ))}
        </ol>

        <Note>{nis.note}</Note>
      </section>
    </>
  )
}
