import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Arayüz hatası', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-ink-950 px-8 text-center">
        <p className="label">Beklenmeyen hata</p>
        <h1 className="font-display text-[22px] font-semibold text-white">Arayüz yeniden yüklenmeli</h1>
        <p className="max-w-[440px] text-[11.5px] leading-relaxed text-slate-400">
          {String(error?.message || error)}
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn-volt" onClick={() => window.location.reload()}>
            Yeniden yükle
          </button>
          <button type="button" className="btn-ghost" onClick={() => window.nitro?.quit?.()}>
            Uygulamayı kapat
          </button>
        </div>
      </div>
    )
  }
}
