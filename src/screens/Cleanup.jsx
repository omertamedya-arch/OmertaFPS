import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { cn, formatBytes } from '../lib/format'
import { useToast } from '../components/Toast'
import { Icon } from '../components/Icons'
import { Chip, EmptyState, PageHeader, SkeletonRows, Spinner } from '../components/ui'

const targetIcons = {
  userTemp: 'trash',
  windowsTemp: 'monitor',
  prefetch: 'zap'
}

const safeguards = [
  'Yalnızca geçici dosya klasörleri taranır; kişisel belgelerine dokunulmaz.',
  'Açık dosyalar silinmeye çalışılmaz, kilitli olanlar atlanır.',
  'Windows Update indirme önbelleği ve sistem geri yükleme noktaları korunur.',
  'Temizlik öncesi ve sonrası boyut ölçülür; gerçek kazanç raporlanır.'
]

export default function Cleanup() {
  const toast = useToast()
  const [items, setItems] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [cleaning, setCleaning] = useState(false)
  const [result, setResult] = useState(null)

  const scan = async ({ quiet = false } = {}) => {
    if (quiet) setScanning(true)
    else setLoading(true)
    try {
      const response = await api.maintenance.scan()
      if (!response.ok) throw new Error(response.error || 'Tarama tamamlanamadı.')
      setItems(response.items)
      setSelected(new Set(response.items.filter((item) => item.exists).map((item) => item.id)))
    } catch (error) {
      toast.error('Tarama başarısız', error.message)
    } finally {
      setLoading(false)
      setScanning(false)
    }
  }

  useEffect(() => {
    scan()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const totalBytes = useMemo(
    () => (items || []).reduce((sum, item) => sum + (selected.has(item.id) ? item.size : 0), 0),
    [items, selected]
  )
  const totalFiles = useMemo(
    () => (items || []).reduce((sum, item) => sum + (selected.has(item.id) ? item.files : 0), 0),
    [items, selected]
  )

  const toggle = (id) => {
    setSelected((current) => {
      const copy = new Set(current)
      if (copy.has(id)) copy.delete(id)
      else copy.add(id)
      return copy
    })
  }

  const selectAll = () => {
    if (!items) return
    const allReady = items.filter((item) => item.exists)
    if (selected.size === allReady.length) setSelected(new Set())
    else setSelected(new Set(allReady.map((item) => item.id)))
  }

  const clean = async () => {
    if (cleaning || selected.size === 0) return
    setCleaning(true)
    setResult(null)
    try {
      const response = await api.maintenance.clean(Array.from(selected))
      if (!response.ok) throw new Error(response.error || 'Temizlik tamamlanamadı.')
      setResult(response)
      toast.success(
        'Temizlik tamamlandı',
        `${formatBytes(response.freedBytes)} disk alanı açıldı.`
      )
      await scan({ quiet: true })
    } catch (error) {
      toast.error('Temizlik tamamlanamadı', error.message)
    } finally {
      setCleaning(false)
    }
  }

  const allReady = (items || []).filter((item) => item.exists)
  const allSelected = allReady.length > 0 && selected.size === allReady.length

  return (
    <>
      <PageHeader
        eyebrow="Sistem Temizliği"
        title="Biriken artıkları sil."
        subtitle="Windows Temp, kullanıcı Temp ve Prefetch klasörlerini tara. Ne kadar alan açılacağını görmeden hiçbir dosya silinmez."
        actions={
          <button
            type="button"
            onClick={() => scan({ quiet: Boolean(items) })}
            className="btn-ghost"
            disabled={loading || scanning || cleaning}
          >
            {scanning ? <Spinner className="h-4 w-4" /> : <Icon name="refresh" className="h-4 w-4" />}
            {scanning ? 'Taranıyor…' : 'Yeniden tara'}
          </button>
        }
      />

      {result && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-volt/20 bg-volt/[0.05] px-4 py-3.5 animate-fade-in">
          <span className="grid h-10 w-10 place-items-center rounded-xl border border-volt/25 bg-volt/10 text-volt">
            <Icon name="check" className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12.5px] font-semibold text-white">Temizlik tamamlandı</p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {formatBytes(result.freedBytes)} alan açıldı
              {result.results?.some((entry) => entry.cleaned && entry.afterBytes > 0)
                ? ' · bazı dosyalar kullanımda olduğu için atlandı'
                : ''}
            </p>
          </div>
          <Chip tone="volt">
            <Icon name="harddrive" className="h-3 w-3" />
            {formatBytes(result.freedBytes)} kazanç
          </Chip>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel flex flex-col p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="label">Taranan konumlar</p>
              <h2 className="mt-1 text-[15px] font-semibold text-white">Geçici dosya alanları</h2>
            </div>
            <button
              type="button"
              onClick={selectAll}
              disabled={!items || loading || cleaning}
              className="text-[11px] font-medium text-slate-400 transition hover:text-ion disabled:opacity-40"
            >
              {allSelected ? 'Seçimi temizle' : 'Tümünü seç'}
            </button>
          </div>

          <div className="mt-4 flex-1 space-y-2">
            {loading && !items ? (
              <SkeletonRows rows={3} className="h-[74px]" />
            ) : (
              (items || []).map((item) => {
                const isSelected = selected.has(item.id)
                const empty = item.size === 0
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`${item.label} seç`}
                    disabled={!item.exists || cleaning}
                    onClick={() => toggle(item.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all',
                      isSelected && !empty
                        ? 'border-ion/25 bg-ion/[0.05]'
                        : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]',
                      (!item.exists || cleaning) && 'cursor-not-allowed opacity-50'
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-ion bg-ion text-ink-950'
                          : 'border-white/15 bg-transparent text-transparent'
                      )}
                    >
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
                    </span>

                    <span
                      className={cn(
                        'grid h-9 w-9 shrink-0 place-items-center rounded-lg border',
                        empty
                          ? 'border-white/[0.06] bg-white/[0.02] text-slate-600'
                          : 'border-ion/15 bg-ion/[0.06] text-ion'
                      )}
                    >
                      <Icon name={targetIcons[item.id] || 'trash'} className="h-4 w-4" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-slate-200">{item.label}</span>
                      <span className="mt-0.5 block truncate font-mono text-[9.5px] text-slate-500">
                        {item.path || 'Konum bulunamadı'}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          'block font-display text-[13px] font-semibold',
                          empty ? 'text-slate-500' : 'text-white'
                        )}
                      >
                        {formatBytes(item.size)}
                      </span>
                      <span className="mt-0.5 block text-[9.5px] text-slate-500">
                        {item.exists ? `${item.files.toLocaleString('tr-TR')} dosya` : 'yok'}
                      </span>
                    </span>
                  </button>
                )
              })
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-4">
            <div>
              <p className="text-[9.5px] uppercase tracking-[0.14em] text-slate-500">Seçilen alan</p>
              <p className="mt-1 font-display text-[18px] font-semibold text-white">
                {formatBytes(totalBytes)}
                <span className="ml-2 text-[10px] font-normal text-slate-500">
                  {totalFiles.toLocaleString('tr-TR')} dosya
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={clean}
              disabled={cleaning || selected.size === 0 || totalBytes === 0}
              className="btn-primary"
            >
              {cleaning ? <Spinner className="h-4 w-4" /> : <Icon name="trash" className="h-4 w-4" />}
              {cleaning ? 'Temizleniyor…' : 'Seçilenleri Temizle'}
            </button>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="panel p-5">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg border border-volt/15 bg-volt/[0.06] text-volt">
                <Icon name="shield" className="h-4 w-4" />
              </span>
              <h2 className="text-[13.5px] font-semibold text-white">Güvenli temizlik</h2>
            </div>

            <ul className="mt-3.5 space-y-2.5">
              {safeguards.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                  <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt" strokeWidth={2.2} />
                  {line}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-5">
            <p className="flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ion">
              <Icon name="info" className="h-3 w-3" />
              Prefetch hakkında
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              Prefetch, sık açılan uygulamaların ilk yüklemesini hızlandıran bir önbellektir. Temizledikten
              sonra ilk açılışlar bir miktar yavaşlayabilir; birkaç kullanımdan sonra Windows önbelleği
              yeniden oluşturur.
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              <Chip tone="muted">
                <Icon name="harddrive" className="h-3 w-3" />
                Disk alanı
              </Chip>
              <Chip tone="muted">
                <Icon name="zap" className="h-3 w-3" />
                Tek seferlik
              </Chip>
            </div>
          </section>

          {result?.results?.length > 0 && (
            <section className="panel p-5">
              <p className="label">Son temizlik dökümü</p>
              <div className="mt-3 space-y-2">
                {result.results.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-[10.5px] text-slate-400">{entry.label || entry.id}</span>
                    <span
                      className={cn(
                        'shrink-0 font-mono text-[10px]',
                        entry.freedBytes > 0 ? 'text-volt' : 'text-slate-500'
                      )}
                    >
                      {entry.cleaned ? `+${formatBytes(entry.freedBytes)}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>

      {!loading && items && items.every((item) => !item.exists) && (
        <div className="mt-4">
          <EmptyState
            icon="harddrive"
            title="Taranacak konum bulunamadı"
            message="Geçici klasörler bu sistemde mevcut görünmüyor. Uygulamayı yönetici olarak çalıştırdığından emin ol."
          />
        </div>
      )}
    </>
  )
}
