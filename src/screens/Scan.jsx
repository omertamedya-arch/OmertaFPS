import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { cn, timeAgo } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, Gauge, PageHeader, Spinner } from '../components/ui'

const SCAN_STEPS = [
  { id: 'hardware', label: 'Donanım profili', detail: 'CPU, GPU, RAM ve disk okunuyor', icon: 'cpu' },
  { id: 'storage', label: 'Geçici dosyalar', detail: 'Temp ve Prefetch boyutları ölçülüyor', icon: 'trash' },
  { id: 'memory', label: 'Bellek durumu', detail: 'RAM ve standby önbelleği denetleniyor', icon: 'memory' },
  { id: 'services', label: 'Windows bileşenleri', detail: 'Telemetri, Xbox ve arama servisleri', icon: 'server' },
  { id: 'registry', label: 'Oyun ve güç ayarları', detail: 'GameDVR, güç planı ve fare ayarları', icon: 'gamepad' },
  { id: 'startup', label: 'Başlangıç öğeleri', detail: 'Açılışta çalışan uygulamalar', icon: 'rocket' },
  { id: 'gpu', label: 'GPU sürücüsü', detail: 'Sürücü profili ve güncellik', icon: 'gpu' },
  { id: 'score', label: 'Puan hesaplama', detail: 'Bulgular önceliklendiriliyor', icon: 'gauge' }
]

const SEVERITY = {
  critical: {
    label: 'Kritik',
    tone: 'rose',
    icon: 'alert',
    card: 'border-rose-400/20 bg-rose-400/[0.035]',
    iconBox: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    chip: 'text-rose-300'
  },
  warning: {
    label: 'Uyarı',
    tone: 'amber',
    icon: 'alert',
    card: 'border-amber-400/20 bg-amber-400/[0.035]',
    iconBox: 'border-amber-400/25 bg-amber-400/10 text-amber-300',
    chip: 'text-amber-300'
  },
  info: {
    label: 'Öneri',
    tone: 'ion',
    icon: 'info',
    card: 'border-ion/15 bg-ion/[0.03]',
    iconBox: 'border-ion/25 bg-ion/10 text-ion',
    chip: 'text-ion-soft'
  },
  good: {
    label: 'İyi',
    tone: 'volt',
    icon: 'check',
    card: 'border-volt/15 bg-volt/[0.025]',
    iconBox: 'border-volt/25 bg-volt/10 text-volt',
    chip: 'text-volt'
  }
}

const TONE = {
  warning: { card: 'border-amber-400/20 bg-amber-400/[0.04]', icon: 'text-amber-300' },
  info: { card: 'border-ion/15 bg-ion/[0.035]', icon: 'text-ion' },
  good: { card: 'border-volt/15 bg-volt/[0.03]', icon: 'text-volt' }
}

function scoreText(score) {
  if (score >= 85) return { title: 'Sistem hazır', text: 'Belirgin bir sorun bulunmadı. Küçük dokunuşlar yeterli.' }
  if (score >= 65) return { title: 'Küçük iyileştirmeler var', text: 'Birkaç ayarla daha tutarlı kare süreleri elde edebilirsin.' }
  if (score >= 40) return { title: 'Sorunlar bulundu', text: 'Tarama birkaç sorun buldu. Önerileri sırayla uygulayarak daha tutarlı kare süreleri elde edebilirsin.' }
  return { title: 'Ciddi sorunlar bulundu', text: 'Önerilen düzeltmeleri sırayla uygulaman önerilir.' }
}

function StepRow({ step, state }) {
  const status = state?.status || 'idle'
  const running = status === 'running'
  const done = status === 'done'

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
        running
          ? 'border-ion/30 bg-ion/[0.06]'
          : done
            ? 'border-volt/15 bg-volt/[0.025]'
            : 'border-white/[0.05] bg-white/[0.02]'
      )}
    >
      <span
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
          done
            ? 'border-volt/25 bg-volt/10 text-volt'
            : running
              ? 'border-ion/30 bg-ion/10 text-ion'
              : 'border-white/[0.06] bg-white/[0.02] text-slate-600'
        )}
      >
        {done ? (
          <Icon name="check" className="h-4 w-4" strokeWidth={2.2} />
        ) : running ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <Icon name={step.icon} className="h-4 w-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium text-slate-200">{step.label}</p>
        <p className="truncate text-[10px] text-slate-500">
          {done && state?.detail ? state.detail : step.detail}
        </p>
      </div>
      <span
        className={cn(
          'text-[9px] font-semibold uppercase tracking-wider',
          done ? 'text-volt' : running ? 'text-ion' : 'text-slate-600'
        )}
      >
        {done ? 'Tamam' : running ? 'Taranıyor' : 'Bekliyor'}
      </span>
    </div>
  )
}

function HardwareTile({ icon, label, value, sub, tone = 'neutral' }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <span
          className={cn(
            tone === 'volt' ? 'text-volt' : tone === 'ion' ? 'text-ion' : 'text-slate-500'
          )}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 truncate text-[12px] font-semibold text-slate-100" title={value}>
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-[10px] text-slate-500" title={sub}>{sub}</p>}
    </div>
  )
}

function FindingCard({ finding, onFix, fixing, onNavigate }) {
  const meta = SEVERITY[finding.severity] || SEVERITY.info
  const action = finding.action
  const busy = fixing === action?.id

  return (
    <article className={cn('rounded-xl border p-4', meta.card)}>
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border', meta.iconBox)}>
          <Icon name={meta.icon} className="h-4 w-4" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              {finding.category}
            </span>
            <span className={cn('text-[9px] font-semibold uppercase tracking-wider', meta.chip)}>
              {meta.label}
            </span>
          </div>
          <h3 className="mt-1 text-[13px] font-semibold text-slate-100">{finding.title}</h3>
          <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">{finding.detail}</p>

          {finding.recommendation && (
            <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-slate-500">
              <Icon name="sparkles" className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
              {finding.recommendation}
            </p>
          )}

          {action && (
            <div className="mt-3">
              {action.type === 'fix' ? (
                <button
                  type="button"
                  onClick={() => onFix(finding)}
                  disabled={Boolean(fixing)}
                  className="btn-ghost h-8 px-3 text-[10.5px]"
                >
                  {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="zap" className="h-3.5 w-3.5" />}
                  {busy ? 'Uygulanıyor…' : action.label}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(action.target)}
                  className="btn-ghost h-8 px-3 text-[10.5px]"
                >
                  <Icon name="arrowRight" className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

export default function Scan({ onNavigate }) {
  const toast = useToast()
  const [result, setResult] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [steps, setSteps] = useState({})
  const [fixing, setFixing] = useState(null)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const busyRef = useRef(false)

  useEffect(() => {
    if (typeof api.onScanProgress !== 'function') return undefined
    return api.onScanProgress((progress) => {
      setSteps((current) => ({ ...current, [progress.step]: progress }))
    })
  }, [])

  const runScan = useCallback(async () => {
    if (busyRef.current) return
    busyRef.current = true
    setScanning(true)
    setSteps({})
    setError(null)
    try {
      const response = await api.scan.run()
      if (!response.ok) throw new Error(response.error || 'Tarama tamamlanamadı.')
      setResult(response)
    } catch (errorObject) {
      setError(errorObject.message)
      toast.error('Tarama tamamlanamadı', errorObject.message)
    } finally {
      busyRef.current = false
      setScanning(false)
    }
  }, [toast])

  useEffect(() => {
    runScan()
  }, [runScan])

  const applyFix = async (finding) => {
    if (fixing) return
    setFixing(finding.action.id)
    try {
      const response = await api.scan.fix(finding.action.id)
      if (!response.ok) throw new Error(response.error || 'Düzeltme uygulanamadı.')
      toast.success(response.title, response.detail)
      await runScan()
    } catch (errorObject) {
      toast.error('Düzeltme uygulanamadı', errorObject.message)
    } finally {
      setFixing(null)
    }
  }

  const findings = result?.findings || []
  const visible = useMemo(() => {
    if (filter === 'issues') return findings.filter((item) => item.severity !== 'good')
    if (filter === 'good') return findings.filter((item) => item.severity === 'good')
    return findings
  }, [filter, findings])

  const score = result?.score ?? 0
  const summary = scoreText(score)
  const hardware = result?.hardware

  return (
    <>
      <PageHeader
        eyebrow="Sistem Taraması"
        title="Bu bilgisayarda ne var, ne eksik?"
        subtitle="Omerta FPS donanımını tanır; CPU, ekran kartı, RAM ve disk durumuna göre sorunları bulur ve uygulanabilir öneriler sunar. Tarama hiçbir ayarı değiştirmez."
        actions={
          <button type="button" onClick={runScan} disabled={scanning} className="btn-ghost">
            {scanning ? <Spinner className="h-4 w-4" /> : <Icon name="scan" className="h-4 w-4" />}
            {scanning ? 'Taranıyor…' : result ? 'Yeniden tara' : 'Taramayı başlat'}
          </button>
        }
      />

      {scanning ? (
        <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
          <section className="panel relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-ion/[0.08] blur-[90px]" />
            <div className="relative flex items-start gap-4">
              <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-ion/25 bg-ion/[0.07] text-ion">
                <span className="absolute inset-0 animate-ping rounded-2xl border border-ion/20" />
                <Icon name="scan" className="h-7 w-7" />
              </span>
              <div>
                <h2 className="font-display text-[20px] font-semibold text-white">Sistem taranıyor</h2>
                <p className="mt-1 max-w-[460px] text-[12px] leading-relaxed text-slate-400">
                  Donanım, bellek, Windows bileşenleri ve oyun ayarları denetleniyor. Bu işlem genellikle
                  10-30 saniye sürer.
                </p>
              </div>
            </div>

            <div className="relative mt-5 space-y-2">
              {SCAN_STEPS.map((step) => (
                <StepRow key={step.id} step={step} state={steps[step.id]} />
              ))}
            </div>
          </section>

          <aside className="space-y-4">
            <section className="panel p-5">
              <p className="label">Neler kontrol ediliyor?</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  ['cpu', 'İşlemci, çekirdek ve bellek hızı'],
                  ['gpu', 'GPU markası, sürücü ve tazeleme hızı'],
                  ['trash', 'Temp, Prefetch ve disk doluluğu'],
                  ['server', 'Gereksiz Windows servisleri'],
                  ['gamepad', 'GameDVR, güç planı ve fare ayarı'],
                  ['memory', 'RAM kullanımı ve bekleyen bellek']
                ].map(([icon, text]) => (
                  <li key={text} className="flex items-center gap-2.5 text-[11px] text-slate-400">
                    <span className="grid h-6 w-6 place-items-center rounded-md border border-white/[0.06] bg-white/[0.02] text-slate-500">
                      <Icon name={icon} className="h-3 w-3" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </section>

            <section className="panel p-4">
              <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-volt">
                <Icon name="shield" className="h-3 w-3" />
                Salt okunur tarama
              </p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                Tarama sırasında hiçbir hizmet, kayıt defteri değeri veya dosya değiştirilmez. Düzeltmeler
                yalnızca sen onayladığında çalışır.
              </p>
            </section>
          </aside>
        </div>
      ) : error && !result ? (
        <EmptyState icon="alert" title="Tarama tamamlanamadı" message={error} />
      ) : result ? (
        <>
          <section className="panel hero-ring relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-volt/[0.06] blur-[95px]" />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <Gauge percent={score} size={142} stroke={10} tone={score >= 70 ? 'volt' : 'ion'}>
                  <p className="font-display text-[34px] font-semibold leading-none tracking-tight text-white">
                    {score}
                  </p>
                  <p className="mt-1 text-[8.5px] uppercase tracking-[0.18em] text-muted">Sistem puanı</p>
                </Gauge>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={score >= 85 ? 'volt' : score >= 65 ? 'ion' : 'amber'}>
                      {summary.title}
                    </Chip>
                    <Chip tone={result.hardware?.tier?.tone || 'muted'}>{result.hardware?.tier?.label}</Chip>
                  </div>
                  <h2 className="mt-3 font-display text-[22px] font-semibold tracking-tight text-white">
                    {summary.text}
                  </h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <span>{timeAgo(result.scannedAt)}</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                    <span>{Math.max(1, Math.round(result.durationMs / 1000))} saniyede tamamlandı</span>
                    <span className="h-0.5 w-0.5 rounded-full bg-slate-600" />
                    <span>{result.counts.critical + result.counts.warning} sorun</span>
                  </p>
                </div>
              </div>

              <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                {[
                  ['critical', result.counts.critical],
                  ['warning', result.counts.warning],
                  ['info', result.counts.info],
                  ['good', result.counts.good]
                ].map(([severity, count]) => {
                  const meta = SEVERITY[severity]
                  return (
                    <div
                      key={severity}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-2.5 py-2"
                    >
                      <span className={cn('grid h-6 w-6 place-items-center rounded-md border', meta.iconBox)}>
                        <Icon name={meta.icon} className="h-3 w-3" />
                      </span>
                      <div>
                        <p className="text-[13px] font-semibold leading-none text-white">{count}</p>
                        <p className="mt-0.5 text-[8.5px] uppercase tracking-wider text-slate-500">{meta.label}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {result.quickActions?.length > 0 && (
              <div className="relative mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.05] pt-4">
                <span className="mr-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500">
                  Hızlı düzelt
                </span>
                {result.quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => applyFix({ action })}
                    disabled={Boolean(fixing)}
                    className="btn-ghost h-8 px-3 text-[10.5px]"
                  >
                    {fixing === action.id ? (
                      <Spinner className="h-3.5 w-3.5" />
                    ) : (
                      <Icon name={action.id === 'purgeStandby' ? 'memory' : 'trash'} className="h-3.5 w-3.5" />
                    )}
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </section>

          {hardware && (
            <section className="mt-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="label">Bu bilgisayarın donanımı</p>
                <span className="text-[9.5px] text-slate-600">
                  {hardware.os?.name} · {hardware.os?.build} · {hardware.os?.hostname}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-5">
                <HardwareTile
                  icon="cpu"
                  label="İşlemci"
                  value={hardware.cpu?.name}
                  sub={`${hardware.cpu?.cores} çekirdek · ${hardware.cpu?.threads} iş parçacığı`}
                  tone="ion"
                />
                <HardwareTile
                  icon="gpu"
                  label="Ekran kartı"
                  value={hardware.gpu?.name || 'Algılanamadı'}
                  sub={
                    hardware.gpu
                      ? `${hardware.gpu.vendorLabel} · ${hardware.gpu.integrated ? 'Entegre' : 'Harici'} · Sürücü ${
                          hardware.gpu.driverVersion || '—'
                        }`
                      : 'Sürücü bulunamadı'
                  }
                  tone="volt"
                />
                <HardwareTile
                  icon="memory"
                  label="Bellek"
                  value={`${hardware.memory?.totalGb} GB ${hardware.memory?.typeLabel}`}
                  sub={`${hardware.memory?.speedMhz || '—'} MHz · ${hardware.memory?.moduleCount} modül`}
                />
                <HardwareTile
                  icon="harddrive"
                  label="Sistem diski"
                  value={hardware.storage?.name || 'Algılanamadı'}
                  sub={
                    hardware.storage
                      ? `${hardware.storage.media} · ${hardware.storage.bus || '—'} · %${hardware.storage.freePercent} boş`
                      : 'Disk bilgisi yok'
                  }
                />
                <HardwareTile
                  icon="monitor"
                  label="Ekran"
                  value={hardware.display?.resolution || '—'}
                  sub={`${hardware.display?.refreshRate || '—'} Hz tazeleme`}
                />
              </div>
            </section>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
            <section className="panel p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="label">Tarama sonuçları</p>
                  <h2 className="mt-1 text-[15px] font-semibold text-white">Bulunanlar ve öneriler</h2>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                  {[
                    ['all', 'Tümü'],
                    ['issues', 'Sorunlar'],
                    ['good', 'İyi']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[10px] font-medium transition',
                        filter === id ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2.5">
                {visible.length === 0 && (
                  <p className="py-10 text-center text-[11px] text-slate-500">Bu filtrede bulgu yok.</p>
                )}
                {visible.map((finding) => (
                  <FindingCard
                    key={finding.id}
                    finding={finding}
                    onFix={applyFix}
                    fixing={fixing}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>

              <p className="mt-4 flex items-start gap-1.5 border-t border-white/[0.05] pt-3 text-[9.5px] leading-relaxed text-slate-600">
                <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
                Puan yalnızca bu taramanın bulgularına göre hesaplanır. FPS etkisi donanım, sürücü ve oyuna
                göre değişir; tüm kalıcı değişiklikler oyun profilleri üzerinden geri alınabilir.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="panel p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-volt/15 bg-volt/[0.06] text-volt">
                    <Icon name="sparkles" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold text-white">Donanımına özel öneriler</h2>
                    <p className="text-[9.5px] text-slate-500">Bu bilgisayarın parçalarına göre</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2">
                  {result.hardwareAdvice?.length === 0 && (
                    <p className="rounded-xl border border-volt/15 bg-volt/[0.03] px-3 py-3 text-[10.5px] leading-relaxed text-slate-400">
                      Donanımında belirgin bir darboğaz algılanmadı. Oyun profilleriyle ince ayar yapabilirsin.
                    </p>
                  )}
                  {result.hardwareAdvice?.map((advice) => {
                    const tone = TONE[advice.tone] || TONE.info
                    return (
                      <div key={advice.id} className={cn('rounded-xl border px-3.5 py-3', tone.card)}>
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-200">
                          <Icon name="zap" className={cn('h-3 w-3 shrink-0', tone.icon)} />
                          {advice.title}
                        </p>
                        <p className="mt-1 text-[10.5px] leading-relaxed text-slate-500">{advice.text}</p>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('profiles')}
                  className="btn-ghost mt-3 w-full"
                >
                  <Icon name="crosshair" className="h-4 w-4" />
                  Oyun profillerine git
                </button>
              </section>

              <section className="panel p-4">
                <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ion">
                  <Icon name="gauge" className="h-3 w-3" />
                  Puan nasıl hesaplanır?
                </p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
                  Kritik bulgular 16, uyarılar 8, öneriler 2 puan düşürür. 85 ve üzeri puan sistemin oyun
                  için hazır olduğunu gösterir.
                </p>
              </section>
            </aside>
          </div>
        </>
      ) : null}
    </>
  )
}
