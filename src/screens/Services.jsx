import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { cn } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner, Toggle } from '../components/ui'

const categoryIcons = {
  Telemetri: 'wifi',
  Sistem: 'cpu',
  Arama: 'search',
  Yazıcı: 'printer',
  Xbox: 'gamepad',
  Oyun: 'gamepad',
  Güvenlik: 'shield',
  Gizlilik: 'lock',
  Ağ: 'wifi'
}

function SummaryTile({ label, value, sub, tone = 'neutral' }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3">
      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p
        className={cn(
          'mt-1 font-display text-[19px] font-semibold tracking-tight',
          tone === 'volt'
            ? 'text-volt'
            : tone === 'ion'
              ? 'text-ion'
              : tone === 'orange'
                ? 'text-orange-300'
                : 'text-white'
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[10px] text-muted">{sub}</p>
    </div>
  )
}

export default function Services() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(() => new Set())
  const [expanded, setExpanded] = useState(() => new Set())

  const load = async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true)
    try {
      const result = await api.services.list()
      if (!result.ok) throw new Error(result.error || 'Hizmetler okunamadı.')
      setItems(result.items)
    } catch (error) {
      toast.error('Hizmet listesi alınamadı', error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const categories = useMemo(() => {
    const map = new Map()
    ;(items || []).forEach((item) => map.set(item.category, (map.get(item.category) || 0) + 1))
    return Array.from(map.entries())
  }, [items])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (items || []).filter((item) => {
      if (
        needle &&
        !`${item.name} ${item.tech} ${item.category} ${item.description}`.toLowerCase().includes(needle)
      ) {
        return false
      }
      if (filter === 'recommended') return item.recommendedOff && item.enabled && !item.missing
      if (filter === 'disabled') return !item.enabled
      if (filter === 'all') return true
      return item.category === filter
    })
  }, [items, query, filter])

  const disabledCount = (items || []).filter((item) => !item.enabled && !item.missing).length
  const pendingRecommendedCount = (items || []).filter(
    (item) => item.recommendedOff && item.enabled && !item.missing
  ).length
  const optimizedCount = (items || []).filter(
    (item) => item.recommendedOff && !item.enabled && !item.missing
  ).length

  const handleToggle = async (item, next) => {
    if (busy.has(item.id)) return
    setBusy((current) => new Set(current).add(item.id))
    try {
      const result = await api.services.set(item.id, next)
      if (!result.ok) throw new Error(result.error || 'Değişiklik uygulanamadı.')
      setItems((current) =>
        current
          ? current.map((entry) => (entry.id === item.id ? { ...entry, ...result.service } : entry))
          : current
      )
      if (result.warning) {
        toast.warning(item.name, result.warning)
      } else {
        toast.success(
          next ? 'Bileşen etkinleştirildi' : 'Bileşen devre dışı bırakıldı',
          `${item.name} · ${
            next
              ? 'önceki başlangıç ayarına döndürüldü'
              : item.kind === 'registry'
                ? 'kayıt ayarı kapatıldı'
                : 'hizmet durduruldu'
          }`
        )
      }
    } catch (error) {
      toast.error('Değişiklik uygulanamadı', error.message)
    } finally {
      setBusy((current) => {
        const copy = new Set(current)
        copy.delete(item.id)
        return copy
      })
    }
  }

  const toggleExpanded = (id) => {
    setExpanded((current) => {
      const copy = new Set(current)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const filters = [
    { id: 'all', label: 'Tümü', count: items?.length || 0 },
    { id: 'recommended', label: 'Kapatılması önerilen', count: pendingRecommendedCount },
    { id: 'disabled', label: 'Devre dışı', count: disabledCount },
    ...categories.map(([name, count]) => ({ id: name, label: name, count }))
  ]

  return (
    <>
      <PageHeader
        eyebrow="Windows Hizmetleri"
        title="Arka planı sadeleştir."
        subtitle="Gereksiz hizmetleri tek tek kapat. Her değişiklik öncesi mevcut başlangıç türü yedeklenir; istediğin an geri açabilirsin."
        actions={
          <button type="button" onClick={() => load({ quiet: true })} className="btn-ghost" disabled={loading}>
            {loading ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
            Yenile
          </button>
        }
      />

      <section className="panel mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryTile
          label="Toplam bileşen"
          value={items ? items.length : '—'}
          sub={`${items ? items.filter((item) => item.kind === 'service').length : '—'} hizmet · ${
            items ? items.filter((item) => item.kind === 'registry').length : '—'
          } kayıt ayarı`}
        />
        <SummaryTile
          label="Devre dışı"
          value={items ? `${disabledCount}` : '—'}
          sub="Geri alınabilir durumda"
        />
        <SummaryTile
          label="Optimize edildi"
          value={items ? `${optimizedCount}` : '—'}
          sub="Önerilen kapatmalar tamam"
          tone="volt"
        />
        <SummaryTile
          label="Kapatılması önerilen"
          value={items ? `${pendingRecommendedCount}` : '—'}
          sub="Hâlâ açık ve çalışıyor"
          tone="orange"
        />
      </section>

      <section className="panel mb-4 flex flex-wrap items-center gap-2.5 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hizmet veya bileşen ara…"
            aria-label="Hizmet ara"
            className="input py-2.5 pl-9 pr-3 text-[12.5px]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setFilter(entry.id)}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors',
                filter === entry.id
                  ? 'border-ion/30 bg-ion/10 text-ion'
                  : 'border-white/[0.05] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
              )}
            >
              {entry.label}
              <span className="ml-1.5 text-[9.5px] text-slate-500">{entry.count}</span>
            </button>
          ))}
        </div>
      </section>

      {loading && !items ? (
        <SkeletonRows rows={6} className="h-[86px]" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="search"
          title="Eşleşen bileşen yok"
          message="Arama terimini kısaltmayı veya filtreyi sıfırlamayı dene."
        />
      ) : (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const isOpen = expanded.has(item.id)
            const isBusy = busy.has(item.id)
            const missing = item.missing
            return (
              <article
                key={item.id}
                className={cn(
                  'panel overflow-hidden transition-colors',
                  isOpen ? 'border-white/10' : 'hover:border-white/[0.09]',
                  item.recommendedOff &&
                    !missing &&
                    (item.enabled ? 'border-orange-400/[0.12]' : 'border-volt/[0.12]')
                )}
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={cn(
                      'icon-box h-10 w-10',
                      missing
                        ? 'text-slate-500'
                        : item.recommendedOff
                          ? item.enabled
                            ? 'border-orange-400/15 bg-orange-400/[0.05] text-orange-300'
                            : 'border-volt/15 bg-volt/[0.05] text-volt'
                          : item.enabled
                            ? 'text-ion'
                            : 'text-slate-400'
                    )}
                  >
                    <Icon
                      name={item.kind === 'registry' ? 'gamepad' : categoryIcons[item.category] || 'server'}
                      className="h-[18px] w-[18px]"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-[13px] font-semibold text-slate-100">{item.name}</h3>
                      <span className="font-mono text-[10px] text-slate-500">{item.tech}</span>
                      {item.recommendedOff &&
                        !missing &&
                        (item.enabled ? (
                          <Chip tone="orange">
                            <Icon name="alert" className="h-3 w-3" />
                            Kapatılması Önerilir
                          </Chip>
                        ) : (
                          <Chip tone="volt">
                            <Icon name="check" className="h-3 w-3" />
                            Optimize Edildi
                          </Chip>
                        ))}
                      {missing && <Chip tone="rose">Bulunamadı</Chip>}
                    </div>

                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-slate-500">
                      {item.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Chip tone="muted">{item.category}</Chip>
                      <Chip tone="muted">{item.kind === 'registry' ? 'Kayıt ayarı' : 'Hizmet'}</Chip>
                      <Chip tone="ion">
                        <Icon name="chart" className="h-3 w-3" />
                        FPS etkisi {item.fps}
                      </Chip>
                      <Chip tone={item.enabled ? 'neutral' : 'volt'}>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            item.enabled ? 'bg-emerald-400' : 'bg-volt'
                          )}
                        />
                        {missing ? 'Sistemde yok' : item.stateLabel}
                      </Chip>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Toggle
                      checked={item.enabled}
                      disabled={missing}
                      busy={isBusy}
                      onChange={(next) => handleToggle(item, next)}
                      label={`${item.name} ${item.enabled ? 'kapat' : 'aç'}`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      aria-expanded={isOpen}
                      className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-white/5 hover:text-slate-200"
                    >
                      {isOpen ? 'Kapat' : 'Ayrıntı'}
                      <Icon
                        name="chevronDown"
                        className={cn('h-3 w-3 transition-transform', isOpen && 'rotate-180')}
                      />
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="animate-fade-in border-t border-white/[0.05] bg-ink-950/30 px-4 py-3.5">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                        <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ion">
                          <Icon name="info" className="h-3 w-3" />
                          Bu ne işe yarar?
                        </p>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                          {item.description}
                        </p>
                      </div>

                      <div className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
                        <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.14em] text-volt">
                          <Icon name="power" className="h-3 w-3" />
                          Kapatıldığında ne olur?
                        </p>
                        <p className="mt-1.5 text-[11.5px] leading-relaxed text-slate-400">
                          {item.disabledEffect}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[10px] text-slate-600">
                        <Icon name="chart" className="h-3 w-3" />
                        Tahmini FPS etkisi: {item.fps} — donanım ve oyuna göre değişir.
                      </p>
                      <Chip tone="muted">
                        <Icon name="shield" className="h-3 w-3" />
                        Değişiklik yedeklenir
                      </Chip>
                    </div>

                    {item.warning && (
                      <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-[10.5px] leading-relaxed text-amber-300/90">
                        <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {item.warning}
                      </p>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}

      <p className="mt-5 flex items-start gap-2 rounded-xl border border-white/[0.05] bg-white/[0.02] px-3.5 py-3 text-[10.5px] leading-relaxed text-slate-500">
        <Icon name="shield" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600" />
        Kapatılan hizmetlerin özgün başlangıç türü yerel olarak saklanır. Bir sorun yaşarsan ilgili
        anahtarı yeniden açman yeterli; seçim yeniden başlatmadan sonra da korunur. Kritik güvenlik
        ve ağ hizmetleri bu listede yer almaz.
      </p>
    </>
  )
}
