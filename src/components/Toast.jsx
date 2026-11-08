import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { cn } from '../lib/format'
import { Icon } from './Icons'

const ToastContext = createContext(null)

const styles = {
  success: {
    icon: 'check',
    accent: 'text-volt',
    border: 'border-volt/20',
    bar: 'bg-volt'
  },
  error: {
    icon: 'alert',
    accent: 'text-rose-300',
    border: 'border-rose-400/20',
    bar: 'bg-rose-400'
  },
  warning: {
    icon: 'alert',
    accent: 'text-amber-300',
    border: 'border-amber-400/20',
    bar: 'bg-amber-400'
  },
  info: {
    icon: 'info',
    accent: 'text-ion',
    border: 'border-ion/20',
    bar: 'bg-ion'
  }
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (type, title, message = '') => {
      counter.current += 1
      const id = `toast-${Date.now()}-${counter.current}`
      setToasts((current) => [...current.slice(-3), { id, type, title, message }])
      window.setTimeout(() => dismiss(id), 5200)
    },
    [dismiss]
  )

  const toast = useMemo(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      warning: (title, message) => push('warning', title, message),
      info: (title, message) => push('info', title, message)
    }),
    [push]
  )

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[80] flex w-[350px] flex-col gap-2">
        {toasts.map((item) => {
          const style = styles[item.type] || styles.info
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto relative overflow-hidden rounded-xl border bg-ink-800/95 px-4 py-3 shadow-panel backdrop-blur animate-fade-up',
                style.border
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn('mt-0.5 shrink-0', style.accent)}>
                  <Icon name={style.icon} className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-semibold text-white">{item.title}</p>
                  {item.message && <p className="mt-0.5 text-[11.5px] leading-relaxed text-slate-400">{item.message}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
                  aria-label="Bildirimi kapat"
                >
                  <Icon name="x" className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className={cn('absolute inset-x-0 bottom-0 h-[2px] opacity-60', style.bar)} />
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast ToastProvider içinde kullanılmalıdır.')
  return context
}
