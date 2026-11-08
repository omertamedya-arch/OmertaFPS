import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner, Toggle } from '../components/ui'

const registryRows = [
  { name: 'TCPNoDelay', value: '1', text: 'Nagle birleştirmesini kapatır; küçük paketler beklemeden gönderilir.' },
  { name: 'TcpAckFrequency', value: '1', text: 'Her paket için onay gönderilir; gecikme düşer, trafik hafif artar.' },
  { name: 'TcpDelAckTicks', value: '0', text: 'Geciktirilmiş onay süresini sıfırlar.' }
]

const gradeMeta = {
  excellent: { label: 'Mükemmel', tone: 'volt' },
  good: { label: 'İyi', tone: 'ion' },
  fair: { label: 'Orta', tone: 'amber' },
  poor: { label: 'Yüksek gecikme', tone: 'rose' },
  loss: { label: 'Paket kaybı', tone: 'rose' },
  unknown: { label: 'Ölçülmedi', tone: 'muted' }
}

function LatencyCard({ result }) {
  const lossy = result.lossPercent > 0
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11.5px] font-medium text-slate-200">{result.label}</p>
        <span className="font-mono text-[9.5px] text-slate-500">{result.target}</span>
      </div>
      <div className="mt-2 flex items-end gap-1.5">
        <span className="font-display text-[24px] font-semibold leading-none tracking-tight text-white">
          {result.avgMs == null ? '—' : result.avgMs}
        </span>
        <span className="pb-0.5 text-[10px] text-muted">ms ort.</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5 border-t border-white/[0.04] pt-2">
        <div>
          <p className="text-[8.5px] uppercase tracking-wider text-slate-600">Jitter</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-slate-300">{result.jitterMs ?? '—'} ms</p>
        </div>
        <div>
          <p className="text-[8.5px] uppercase tracking-wider text-slate-600">Min / maks</p>
          <p className="mt-0.5 font-mono text-[10.5px] text-slate-300">
            {result.minMs ?? '—'} / {result.maxMs ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-[8.5px] uppercase tracking-wider text-slate-600">Kayıp</p>
          <p className={cn('mt-0.5 font-mono text-[10.5px]', lossy ? 'text-rose-300' : 'text-volt')}>
            %{result.lossPercent}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function Network() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [reverting, setReverting] = useState(false)
  const [flushing, setFlushing] = useState(false)
  const [pinging, setPinging] = useState(false)
  const [latency, setLatency] = useState(null)
  const [selected, setSelected] = useState([])
  const [error, setError] = useState(null)

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true)
      try {
        const response = await api.network.status()
        if (!response.ok) throw new Error(response.error || 'Ağ bilgisi okunamadı.')
        setData(response)
        setSelected(response.interfaces.map((item) => item.guid))
        setError(null)
      } catch (cause) {
        setError(cause.message)
        toast.error('Ağ bilgisi alınamadı', cause.message)
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    load()
  }, [load])

  const toggleAdapter = (guid) => {
    setSelected((current) =>
      current.includes(guid) ? current.filter((item) => item !== guid) : [...current, guid]
    )
  }

  const apply = async () => {
    if (applying || !selected.length) return
    setApplying(true)
    try {
      const response = await api.network.apply(selected)
      if (!response.ok) {
        if (response.code !== 'license-required') throw new Error(response.error || 'Ağ ayarları uygulanamadı.')
        return
      }
      setData(response)
      toast.warning(
        'Nagle devre dışı bırakıldı',
        'Değişikliğin etkinleşmesi için ağ bağdaştırıcısını yeniden başlat veya bilgisayarı yeniden başlat.'
      )
    } catch (cause) {
      toast.error('Ağ ayarları uygulanamadı', cause.message)
    } finally {
      setApplying(false)
    }
  }

  const revert = async () => {
    if (reverting) return
    setReverting(true)
    try {
      const response = await api.network.revert()
      if (!response.ok) throw new Error(response.error || 'Ayarlar geri alınamadı.')
      setData(response)
      toast.success('Ağ ayarları geri alındı', 'Özgün TCP değerleri geri yüklendi.')
    } catch (cause) {
      toast.error('Ayarlar geri alınamadı', cause.message)
    } finally {
      setReverting(false)
    }
  }

  const flushDns = async () => {
    if (flushing) return
    setFlushing(true)
    try {
      const response = await api.network.flushDns()
      if (!response.ok) throw new Error(response.error || 'DNS önbelleği temizlenemedi.')
      toast.success('DNS önbelleği temizlendi', 'Yeni adres çözümlemeleri bir sonraki bağlantıda yapılacak.')
    } catch (cause) {
      toast.error('DNS temizliği başarısız', cause.message)
    } finally {
      setFlushing(false)
    }
  }

  const runPing = async () => {
    if (pinging) return
    setPinging(true)
    try {
      const response = await api.network.ping()
      if (!response.ok) throw new Error(response.error || 'Gecikme testi yapılamadı.')
      setLatency(response)
      const meta = gradeMeta[response.grade] || gradeMeta.unknown
      if (response.grade === 'excellent' || response.grade === 'good') {
        toast.success(`Bağlantı gecikmesi: ${meta.label}`, 'Ölçüm yerel ağdan genel DNS sunucularına yapıldı.')
      } else {
        toast.warning(`Bağlantı gecikmesi: ${meta.label}`, 'Kablolu bağlantı ve arka plan indirmelerini kontrol et.')
      }
    } catch (cause) {
      toast.error('Gecikme testi başarısız', cause.message)
    } finally {
      setPinging(false)
    }
  }

  const grade = gradeMeta[latency?.grade] || gradeMeta.unknown
  const busy = applying || reverting

  return (
    <>
      <PageHeader
        eyebrow="Ağ ve Gecikme"
        title="Paket kaybını ve ping'i düşür."
        subtitle="Nagle algoritmasını kapat, TCP onay sıklığını artır ve DNS önbelleğini temizle. Tüm kayıt defteri değerleri yedeklenir ve tek tıkla geri alınır."
        actions={
          <>
            <button type="button" onClick={flushDns} disabled={flushing} className="btn-ghost">
              {flushing ? <Spinner className="h-4 w-4" /> : <Icon name="database" className="h-4 w-4" />}
              {flushing ? 'Temizleniyor…' : 'DNS temizle'}
            </button>
            <button
              type="button"
              onClick={() => load({ quiet: Boolean(data) })}
              className="btn-quiet"
              aria-label="Yenile"
            >
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </>
        }
      />

      {loading && !data ? (
        <SkeletonRows rows={3} className="h-[132px]" />
      ) : error && !data ? (
        <EmptyState icon="alert" title="Ağ bilgisi okunamadı" message={error} />
      ) : !data?.interfaces?.length ? (
        <EmptyState
          icon="wifi"
          title="Etkin ağ arayüzü bulunamadı"
          message="Kablolu veya kablosuz bağlantı kurulu olduğundan emin ol, ardından yenile."
        />
      ) : (
        <>
          <section className="panel hero-ring relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-24 -top-32 h-80 w-80 rounded-full bg-ion/[0.07] blur-[95px]" />

            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3.5">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-ion/20 bg-ion/[0.07] text-ion">
                  <Icon name="wifi" className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-[19px] font-semibold tracking-tight text-white">
                      Nagle algoritması
                    </h2>
                    <Chip tone={data.active ? 'volt' : 'muted'}>
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          data.active ? 'bg-volt shadow-[0_0_8px_rgba(61,245,165,0.9)]' : 'bg-slate-500'
                        )}
                      />
                      {data.active ? `${data.tunedCount} arayüz optimize` : 'Varsayılan'}
                    </Chip>
                  </div>
                  <p className="mt-1 max-w-[520px] text-[11.5px] leading-relaxed text-slate-400">
                    Küçük oyun paketlerinin toplanmasını bekleyen Nagle algoritması kapatılır. Ayar arayüz
                    başına yazılır; geri alma için özgün değerler yedeklenir.
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={apply}
                      disabled={busy || !selected.length || data.active}
                      className="btn-primary"
                    >
                      {applying ? <Spinner className="h-4 w-4" /> : <Icon name="zap" className="h-4 w-4" />}
                      {applying ? 'Uygulanıyor…' : 'Nagle’ı devre dışı bırak'}
                    </button>
                    <button
                      type="button"
                      onClick={revert}
                      disabled={busy || !data.backup}
                      className="btn-ghost"
                    >
                      {reverting ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
                      {reverting ? 'Geri alınıyor…' : 'Varsayılana dön'}
                    </button>
                  </div>

                  {!data.active && !selected.length && (
                    <p className="mt-2.5 flex items-center gap-1.5 text-[10.5px] text-amber-300/90">
                      <Icon name="alert" className="h-3.5 w-3.5" />
                      En az bir ağ arayüzü seç.
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full max-w-[280px] shrink-0 rounded-xl border border-white/[0.05] bg-ink-950/40 p-3.5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <Icon name="timer" className="h-3 w-3" />
                    Gecikme testi
                  </p>
                  {latency && <Chip tone={grade.tone}>{grade.label}</Chip>}
                </div>

                {latency?.results?.length ? (
                  <div className="mt-2 space-y-1.5">
                    {latency.results.map((result) => (
                      <div key={result.target} className="flex items-center justify-between gap-2">
                        <span className="truncate text-[10.5px] text-slate-400">{result.label}</span>
                        <span className="font-mono text-[10.5px] text-slate-200">
                          {result.avgMs == null ? '—' : `${result.avgMs} ms`}
                          {result.lossPercent > 0 && (
                            <span className="ml-1 text-rose-300">%{result.lossPercent}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                    Yerel ağ geçidi ve genel DNS sunucularına 5’er paket gönderilir; ortalama gecikme,
                    jitter ve kayıp ölçülür.
                  </p>
                )}

                <button type="button" onClick={runPing} disabled={pinging} className="btn-ghost mt-2.5 w-full py-1.5 text-[10.5px]">
                  {pinging ? <Spinner className="h-3.5 w-3.5" /> : <Icon name="gauge" className="h-3.5 w-3.5" />}
                  {pinging ? 'Ölçülüyor…' : latency ? 'Yeniden ölç' : 'Gecikmeyi ölç'}
                </button>
              </div>
            </div>
          </section>

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <section className="panel p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="label">Ağ arayüzleri</p>
                  <h2 className="mt-1 text-[15px] font-semibold text-white">Optimizasyon kapsamı</h2>
                </div>
                <Chip tone={data.active ? 'ion' : 'muted'}>{selected.length} seçili</Chip>
              </div>

              <div className="mt-4 space-y-2">
                {data.interfaces.map((item) => {
                  const checked = selected.includes(item.guid)
                  return (
                    <div
                      key={item.guid}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                        checked ? 'border-ion/20 bg-ion/[0.04]' : 'border-white/[0.05] bg-white/[0.02]'
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-lg border',
                          item.tuned
                            ? 'border-volt/25 bg-volt/[0.07] text-volt'
                            : 'border-white/[0.06] bg-white/[0.02] text-slate-500'
                        )}
                      >
                        <Icon name={item.name.toLowerCase().includes('wi') ? 'wifi' : 'server'} className="h-4 w-4" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="text-[12px] font-medium text-slate-200">{item.name}</p>
                          {item.tuned && <Chip tone="volt">Optimize</Chip>}
                        </div>
                        <p className="truncate text-[10px] text-slate-500">{item.description || item.guid}</p>
                        <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                          TCPNoDelay {item.tcpNoDelay ?? 'yok'} · AckFrequency {item.tcpAckFrequency ?? 'yok'} · DelAckTicks{' '}
                          {item.tcpDelAckTicks ?? 'yok'}
                        </p>
                      </div>

                      <Toggle
                        checked={checked}
                        onChange={() => toggleAdapter(item.guid)}
                        disabled={busy}
                        label={`${item.name} arayüzünü seç`}
                      />
                    </div>
                  )
                })}
              </div>

              <p className="mt-3 flex items-start gap-1.5 text-[9.5px] leading-relaxed text-slate-600">
                <Icon name="info" className="mt-0.5 h-3 w-3 shrink-0" />
                Değişiklikler kayıt defterine yazılır. Etkinleşmesi için ağ bağdaştırıcısını devre dışı bırakıp
                yeniden aç veya bilgisayarı yeniden başlat.
              </p>
            </section>

            <aside className="space-y-4">
              <section className="panel p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-lg border border-volt/15 bg-volt/[0.06] text-volt">
                    <Icon name="gauge" className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="text-[13px] font-semibold text-white">Son ölçüm</h2>
                    <p className="text-[9.5px] text-slate-500">
                      {latency ? new Date(latency.measuredAt).toLocaleTimeString('tr-TR') : 'Henüz ölçüm yok'}
                    </p>
                  </div>
                </div>

                {latency?.results?.length ? (
                  <div className="mt-3.5 grid gap-2">
                    {latency.results.map((result) => (
                      <LatencyCard key={result.target} result={result} />
                    ))}
                  </div>
                ) : (
                  <div className="mt-3.5 rounded-xl border border-dashed border-white/10 px-3 py-5 text-center">
                    <Icon name="timer" className="mx-auto h-5 w-5 text-slate-600" />
                    <p className="mt-2 text-[11px] text-slate-400">Gecikmeyi ölçerek başla.</p>
                    <p className="mt-0.5 text-[10px] text-slate-600">Ortalama, jitter ve paket kaybı raporlanır.</p>
                  </div>
                )}

                <p className="mt-3 text-[9.5px] leading-relaxed text-slate-600">
                  Ölçüm ICMP ile yapılır. Bazı sunucular ICMP’yi engellediği için sonuç oyun sunucusu
                  gecikmesinden farklı olabilir.
                </p>
              </section>

              <section className="panel p-5">
                <p className="label">Yazılan değerler</p>
                <div className="mt-2.5 space-y-2">
                  {registryRows.map((row) => (
                    <div key={row.name} className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-slate-300">{row.name}</span>
                        <span className="font-mono text-[10px] font-semibold text-volt">{row.value}</span>
                      </div>
                      <p className="mt-0.5 text-[9.5px] leading-relaxed text-slate-500">{row.text}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  )
}
