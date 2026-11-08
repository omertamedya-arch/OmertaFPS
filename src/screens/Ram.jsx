import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { formatBytes, formatUptime } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, Gauge, PageHeader, StatCard } from '../components/ui'

const steps = [
  {
    title: 'Önbellek sayfaları serbest bırakılır',
    text: 'Windows, dosya okumalarını hızlandırmak için bellekte "bekleyen" sayfalar tutar. Bu sayfalar ihtiyaç anında boşaltılabilir.'
  },
  {
    title: 'Süreçlerin çalışan belleği korunur',
    text: 'Yalnızca standby listesi temizlenir; açık uygulamaların aktif bellek kullanımına dokunulmaz.'
  },
  {
    title: 'Bellek yeniden kullanılabilir hâle gelir',
    text: 'Boşaltılan sayfalar oyun ve uygulamalara ayrılabilir. İşlem sonrası RAM doluluğu bir miktar düşer.'
  }
]

export default function Ram({ onNavigate }) {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [result, setResult] = useState(null)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true)
      try {
        const response = await api.maintenance.stats({ standby: true })
        if (!response.ok) throw new Error(response.error || 'Bellek bilgisi okunamadı.')
        setStats(response)
      } catch (error) {
        toast.error('Bellek bilgisi alınamadı', error.message)
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
    const timer = window.setInterval(() => load({ quiet: true }), 20000)
    return () => window.clearInterval(timer)
  }, [load])

  const purge = async () => {
    if (purging) return
    setPurging(true)
    setResult(null)
    try {
      const response = await api.maintenance.purge()
      if (!response.ok) throw new Error(response.error || 'Bellek boşaltılamadı.')
      setResult(response)

      if (!response.purged) {
        toast.warning(
          'Bellek boşaltma kısmen tamamlandı',
          'Sistem çağrısı reddedildi. Uygulamanın yönetici olarak çalıştığından emin ol.'
        )
      } else {
        toast.success(
          'Bekleyen bellek boşaltıldı',
          response.releasedBytes > 0
            ? `Yaklaşık ${formatBytes(response.releasedBytes)} bellek serbest bırakıldı.`
            : 'Bekleyen bellek miktarı zaten düşüktü.'
        )
      }

      const fresh = await api.maintenance.stats({ standby: true })
      if (fresh.ok) setStats(fresh)
    } catch (error) {
      toast.error('Bellek boşaltılamadı', error.message)
    } finally {
      setPurging(false)
    }
  }

  const percent = stats?.memory?.percent ?? 0
  const standby = stats?.standbyBytes
  const standbyPercent =
    standby != null && stats?.memory?.total ? Math.min(100, Math.round((standby / stats.memory.total) * 100)) : null

  return (
    <>
      <PageHeader
        eyebrow="RAM Bakımı"
        title="Belleği tazele."
        subtitle="Windows'un önbellek için tuttuğu bekleyen bellek sayfalarını güvenle serbest bırak. Aktif uygulamaların verisi korunur."
        actions={
          <button type="button" onClick={() => load({ quiet: Boolean(stats) })} className="btn-ghost" disabled={loading}>
            <Icon name="refresh" className="h-4 w-4" />
            Yenile
          </button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <section className="panel hero-ring relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-ion/[0.08] blur-[90px]" />

          <div className="relative flex flex-col items-center gap-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-center lg:text-left">
              <Chip tone={standbyPercent != null && standbyPercent > 10 ? 'ion' : 'volt'}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {standbyPercent != null ? `Önbellek kullanımı: %${standbyPercent}` : 'Bellek okunuyor'}
              </Chip>

              <p className="mt-4 text-[9.5px] uppercase tracking-[0.16em] text-slate-500">Bekleyen bellek</p>
              <p className="mt-1 font-display text-[40px] font-semibold leading-none tracking-tight text-white">
                {standby != null ? formatBytes(standby) : '—'}
              </p>
              <p className="mt-2 max-w-[300px] text-[11px] leading-relaxed text-slate-500">
                Boşaltıldığında oyunlar ve yeni uygulamalar için kullanılabilir hâle gelir.
              </p>

              <button type="button" onClick={purge} disabled={purging} className="btn-volt mt-5 w-full sm:w-auto">
                {purging ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-950/30 border-t-ink-950" />
                ) : (
                  <Icon name="memory" className="h-4 w-4" />
                )}
                {purging ? 'Boşaltılıyor…' : 'Bekleyen Belleği Boşalt'}
              </button>
            </div>

            <Gauge percent={percent} size={166} stroke={12} tone="volt">
              <p className="font-display text-[29px] font-semibold tracking-tight text-white">
                {stats ? `%${percent}` : '—'}
              </p>
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted">doluluk</p>
              <p className="mt-1 font-mono text-[9px] text-slate-500">
                {stats ? `${formatBytes(stats.memory.used)} / ${formatBytes(stats.memory.total)}` : ''}
              </p>
            </Gauge>
          </div>

          <div className="relative mt-6 border-t border-white/[0.05] pt-4">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ion via-ion-soft to-volt transition-all duration-700"
                style={{ width: `${Math.max(2, percent)}%` }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[9.5px] text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-ion" />
                Kullanımda {stats ? formatBytes(stats.memory.used) : '—'}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-volt" />
                Kullanılabilir {stats ? formatBytes(stats.memory.available) : '—'}
              </span>
              <span>Çalışma süresi {stats ? formatUptime(stats.uptime) : '—'}</span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon="memory"
            label="Toplam bellek"
            value={stats ? formatBytes(stats.memory.total) : '—'}
            sub={stats ? `${stats.cpuCores} iş parçacığı` : ''}
            tone="ion"
          />
          <StatCard
            icon="gauge"
            label="Doluluk"
            value={stats ? `%${percent}` : '—'}
            sub="Anlık kullanım"
            tone="volt"
          />
          <StatCard
            icon="zap"
            label="Bekleyen"
            value={standby != null ? formatBytes(standby) : '—'}
            sub="Önbellek sayfaları"
            tone="ion"
          />
          <StatCard
            icon="cpu"
            label="İşlemci"
            value={stats ? `${stats.cpuCores} iş parçacığı` : '—'}
            sub={stats?.cpu || 'Bilinmiyor'}
          />
        </div>
      </div>

      {result && (
        <section className="panel mt-4 flex flex-wrap items-center gap-3 p-4 animate-fade-in">
          <span
            className={`grid h-10 w-10 place-items-center rounded-xl border ${
              result.purged
                ? 'border-volt/25 bg-volt/10 text-volt'
                : 'border-amber-400/25 bg-amber-400/10 text-amber-300'
            }`}
          >
            <Icon name={result.purged ? 'check' : 'alert'} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-white">
              {result.purged ? 'Bekleyen bellek boşaltıldı' : 'Boşaltma çağrısı reddedildi'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {result.standbyBefore != null && result.standbyAfter != null
                ? `${formatBytes(result.standbyBefore)} → ${formatBytes(result.standbyAfter)}`
                : 'Ölçüm alınamadı'}
              {result.availableDeltaBytes > 0
                ? ` · kullanılabilir bellek +${formatBytes(result.availableDeltaBytes)}`
                : ''}
            </p>
          </div>
          <Chip tone="volt">~{formatBytes(result.releasedBytes)} serbest</Chip>
        </section>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <section className="panel p-5">
          <p className="label">İşlem adımları</p>
          <h2 className="mt-1 text-[15px] font-semibold text-white">Boşaltma nasıl çalışır?</h2>

          <div className="mt-4 space-y-2.5">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="flex items-start gap-3 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-ion/20 bg-ion/[0.06] font-mono text-[10px] font-semibold text-ion">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[11.5px] font-medium text-slate-200">{step.title}</p>
                  <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-500">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-ion/15 bg-ion/[0.06] text-ion">
                <Icon name="info" className="h-4 w-4" />
              </span>
              <h2 className="text-[13px] font-semibold text-white">Dikkat edilmesi gerekenler</h2>
            </div>
            <ul className="mt-3 space-y-2 text-[10.5px] leading-relaxed text-slate-400">
              <li className="flex gap-2">
                <Icon name="chevronRight" className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                Oyun açıkken çalıştırmak anlık takılmaya yol açabilir.
              </li>
              <li className="flex gap-2">
                <Icon name="chevronRight" className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                Boşaltma sonrası Windows önbelleği zamanla yeniden doldurur; bu normaldir.
              </li>
              <li className="flex gap-2">
                <Icon name="chevronRight" className="mt-0.5 h-3 w-3 shrink-0 text-slate-600" />
                İşlem kalıcı bir ayar değiştirmez; yalnızca önbellek sayfalarını serbest bırakır.
              </li>
            </ul>
          </section>

          <section className="panel p-5">
            <p className="label">Daha fazla alan</p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Disk alanı da oyun yükleme sürelerini etkiler. Geçici dosyaları temizleyerek depolama
              alanını artırabilirsin.
            </p>
            <button type="button" onClick={() => onNavigate?.('cleanup')} className="btn-ghost mt-3 w-full">
              <Icon name="trash" className="h-4 w-4" />
              Sistem Temizliğine git
            </button>
          </section>
        </aside>
      </div>
    </>
  )
}
