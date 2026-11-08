import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { Icon } from './Icons'
import { cn } from '../lib/format'

const VISIBLE = new Set(['available', 'downloading', 'ready'])

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(1)} MB`
}

export default function UpdateBanner() {
  const [update, setUpdate] = useState(null)
  const [installing, setInstalling] = useState(false)

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

  if (!update || !VISIBLE.has(update.state)) return null

  const percent = Math.max(0, Math.min(100, Number(update.percent) || 0))
  const version = update.version ? `v${update.version}` : ''
  const size = formatSize(update.total)

  const install = async () => {
    setInstalling(true)
    const result = await api.updater.install()
    if (!result?.installing) setInstalling(false)
  }

  const title =
    update.state === 'ready'
      ? 'Güncelleme indirildi'
      : update.state === 'downloading'
        ? 'Yeni sürüm indiriliyor'
        : 'Yeni sürüm bulundu'

  return (
    <div className="pointer-events-auto fixed bottom-5 left-5 z-[85] w-[330px] overflow-hidden rounded-xl border border-ion/20 bg-ink-800/95 shadow-panel backdrop-blur animate-fade-up">
      <div className="flex items-start gap-3 px-4 py-3.5">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ion/20 bg-ion/10 text-ion">
          <Icon name={update.state === 'ready' ? 'check' : 'refresh'} className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[12px] font-semibold text-white">{title}</p>
            {version && <span className="font-mono text-[9.5px] text-slate-500">{version}</span>}
          </div>

          {update.state === 'ready' ? (
            <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">
              Kurmak için uygulamayı yeniden başlat. Açık modüller güvenli şekilde kapatılacak.
            </p>
          ) : (
            <>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className={cn(
                    'h-full rounded-full bg-gradient-to-r from-ion to-volt transition-[width] duration-300',
                    update.state === 'available' && 'animate-pulse'
                  )}
                  style={{ width: `${update.state === 'available' ? 8 : percent}%` }}
                />
              </div>
              <p className="mt-1.5 flex items-center justify-between text-[9.5px] text-slate-500">
                <span>{update.state === 'available' ? 'İndirme hazırlanıyor…' : `%${percent.toFixed(0)}`}</span>
                {size && <span>{size}</span>}
              </p>
            </>
          )}

          {update.state === 'ready' && (
            <button
              type="button"
              onClick={install}
              disabled={installing}
              className="btn-volt mt-2.5 w-full"
            >
              {installing ? <Icon name="refresh" className="h-4 w-4 animate-spin" /> : <Icon name="power" className="h-4 w-4" />}
              {installing ? 'Kurulum başlatılıyor…' : 'Yeniden başlat ve kur'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
