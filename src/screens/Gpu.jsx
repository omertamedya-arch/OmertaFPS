import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner } from '../components/ui'
import Nvidia from './Nvidia'
import Amd from './Amd'

function HardwareRow({ icon, label, value, sub, tone = 'neutral' }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
      <span
        className={cn(
          'mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
          tone === 'volt'
            ? 'border-volt/20 bg-volt/[0.06] text-volt'
            : tone === 'ion'
              ? 'border-ion/20 bg-ion/[0.06] text-ion'
              : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
        )}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="label">{label}</p>
        <p className="mt-1 truncate text-[12px] font-semibold text-slate-100" title={value}>
          {value || '—'}
        </p>
        {sub && <p className="mt-0.5 truncate text-[10px] text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

function GenericGpu({ hardware, onNavigate }) {
  const gpu = hardware.gpu
  const intel = gpu?.vendor === 'intel'

  return (
    <>
      <PageHeader
        eyebrow="GPU Merkezi"
        title={intel ? 'Intel grafik için gerçekçi ayarlar.' : 'Ekran kartın için doğru adımlar.'}
        subtitle="Omerta FPS ekran kartı üreticisini tanır ve yalnızca güvenli yolu uygular. Windows tarafı ayarlar otomatik, sürücü ayarları kendi panelinden yapılır."
        actions={
          <button type="button" onClick={() => onNavigate('profiles')} className="btn-ghost">
            <Icon name="crosshair" className="h-4 w-4" />
            Oyun profilleri
          </button>
        }
      />

      <section className="panel hero-ring relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-ion/[0.07] blur-[95px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-ion/20 bg-ion/[0.07] text-ion">
              <Icon name="gpu" className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-display text-[19px] font-semibold tracking-tight text-white">
                  {gpu?.name || 'Ekran kartı algılanamadı'}
                </h2>
                <Chip tone={intel ? 'ion' : 'muted'}>{gpu?.vendorLabel || 'Bilinmiyor'}</Chip>
                {gpu?.integrated && <Chip tone="amber">Entegre grafik</Chip>}
              </div>
              <p className="mt-1 font-mono text-[10.5px] text-slate-500">
                Sürücü {gpu?.driverVersion || '—'}
                {gpu?.driverDate ? ` · ${gpu.driverDate}` : ''}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Chip tone={hardware.tier?.tone || 'muted'}>{hardware.tier?.label}</Chip>
                {hardware.display?.resolution && <Chip tone="muted">{hardware.display.resolution}</Chip>}
                {hardware.display?.refreshRate && <Chip tone="muted">{hardware.display.refreshRate} Hz</Chip>}
                {gpu?.vramBytes ? (
                  <Chip tone="muted">{Math.round(gpu.vramBytes / 1024 ** 3)} GB VRAM</Chip>
                ) : null}
              </div>

              <p className="mt-3 max-w-[560px] text-[11.5px] leading-relaxed text-slate-400">
                {intel
                  ? 'Intel Arc ve Iris grafiklerde sürücü ayarları Intel Grafik Komut Merkezi üzerinden yönetilir. Windows tarafı ayarlar oyun profilleriyle uygulanır; XeSS ve ölçekleme en gerçekçi kazanç alanıdır.'
                  : 'Sürücü paneli ayarları üretici tarafından yönetildiği için otomatik yazılmaz. Windows tarafı güç, kayıt ve gecikme ayarları oyun profilleriyle güvenle uygulanır.'}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => onNavigate('profiles')} className="btn-primary">
                  <Icon name="crosshair" className="h-4 w-4" />
                  Profil seç
                </button>
                <button type="button" onClick={() => onNavigate('scan')} className="btn-ghost">
                  <Icon name="scan" className="h-4 w-4" />
                  Donanımı tara
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="panel p-5">
          <p className="label">Bu bilgisayarın donanımı</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <HardwareRow
              icon="cpu"
              label="İşlemci"
              value={hardware.cpu?.name}
              sub={`${hardware.cpu?.cores} çekirdek · ${hardware.cpu?.threads} iş parçacığı`}
              tone="ion"
            />
            <HardwareRow
              icon="gpu"
              label="Ekran kartı"
              value={gpu?.name}
              sub={`${gpu?.vendorLabel || '—'} · ${gpu?.integrated ? 'Entegre' : 'Harici'}`}
              tone="volt"
            />
            <HardwareRow
              icon="memory"
              label="Bellek"
              value={`${hardware.memory?.totalGb} GB ${hardware.memory?.typeLabel}`}
              sub={`${hardware.memory?.speedMhz || '—'} MHz · ${hardware.memory?.moduleCount} modül`}
            />
            <HardwareRow
              icon="harddrive"
              label="Sistem diski"
              value={hardware.storage?.name}
              sub={
                hardware.storage
                  ? `${hardware.storage.media} · ${hardware.storage.bus || '—'} · %${hardware.storage.freePercent} boş`
                  : 'Disk bilgisi yok'
              }
            />
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-600">
            <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
            Daha fazla ayrıntı ve puan için sistem taramasını çalıştır.
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
                <p className="text-[9.5px] text-slate-500">Bu ekran kartına göre</p>
              </div>
            </div>

            <div className="mt-3.5 space-y-2">
              {hardware.recommendations?.length ? (
                hardware.recommendations.map((advice) => (
                  <div
                    key={advice.id}
                    className={cn(
                      'rounded-xl border px-3.5 py-2.5',
                      advice.tone === 'warning'
                        ? 'border-amber-400/20 bg-amber-400/[0.04]'
                        : 'border-ion/15 bg-ion/[0.03]'
                    )}
                  >
                    <p className="text-[11px] font-semibold text-slate-200">{advice.title}</p>
                    <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{advice.text}</p>
                  </div>
                ))
              ) : (
                <p className="text-[10.5px] leading-relaxed text-slate-500">
                  Bu donanımda belirgin bir darboğaz algılanmadı.
                </p>
              )}
            </div>
          </section>

          <section className="panel p-4">
            <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-amber-300/90">
              <Icon name="alert" className="h-3 w-3" />
              Sürücü ayarları
            </p>
            <p className="mt-1.5 text-[10.5px] leading-relaxed text-slate-400">
              {intel
                ? 'Intel Grafik Komut Merkezi’ndeki oyun modu ve XeSS ayarları donanım üreticisi tarafından yönetilir. Omerta FPS bu değerleri kayıt defterine zorla yazmaz.'
                : 'Bu ekran kartı için güvenli kayıt defteri eşleniği bulunamadı. Sürücü ayarlarını üreticinin panelinden uygula; Windows tarafı otomatik ayarlar hazır.'}
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}

export default function Gpu({ onNavigate }) {
  const toast = useToast()
  const [hardware, setHardware] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await api.hardware.detect()
      setHardware(response)
      setError(null)
    } catch (errorObject) {
      setError(errorObject.message)
      toast.error('Donanım okunamadı', errorObject.message)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  if (loading && !hardware) {
    return (
      <>
        <PageHeader eyebrow="GPU Merkezi" title="Ekran kartın tanınıyor." subtitle="Üretici ve sürücü bilgisi okunuyor…" />
        <SkeletonRows rows={3} className="h-[132px]" />
      </>
    )
  }

  if (error && !hardware) {
    return (
      <>
        <PageHeader eyebrow="GPU Merkezi" title="Ekran kartı okunamadı" />
        <EmptyState icon="alert" title="Donanım bilgisi alınamadı" message={error} />
        <button type="button" onClick={load} className="btn-ghost mt-4">
          <Spinner className="h-4 w-4" />
          Tekrar dene
        </button>
      </>
    )
  }

  if (hardware?.gpu?.vendor === 'nvidia') return <Nvidia onNavigate={onNavigate} hardware={hardware} />
  if (hardware?.gpu?.vendor === 'amd') return <Amd onNavigate={onNavigate} hardware={hardware} />

  if (!hardware?.gpu) {
    return (
      <>
        <PageHeader eyebrow="GPU Merkezi" title="Ekran kartı algılanamadı" />
        <EmptyState
          icon="gpu"
          title="GPU bulunamadı"
          message="Sürücü kurulu değilse veya ekran kartı devre dışıysa Omerta FPS donanımı okuyamaz. Sürücüyü kurup uygulamayı yeniden başlat."
        />
      </>
    )
  }

  return <GenericGpu hardware={hardware} onNavigate={onNavigate} />
}
