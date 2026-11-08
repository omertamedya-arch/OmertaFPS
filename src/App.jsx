import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastProvider } from './components/Toast'
import UpdateBanner from './components/UpdateBanner'
import RosaScene from './components/RosaScene'
import { AppStateProvider, useAppState } from './state/AppState'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import { Logo } from './components/Icons'
import { Spinner } from './components/ui'
import AdminGate from './screens/AdminGate'
import Paywall from './screens/Paywall'
import Scan from './screens/Scan'
import Profiles from './screens/Profiles'
import Network from './screens/Network'
import Maintenance from './screens/Maintenance'
import Advanced from './screens/Advanced'
import Settings from './screens/Settings'

const SCREENS = {
  scan: Scan,
  profiles: Profiles,
  network: Network,
  maintenance: Maintenance,
  advanced: Advanced,
  settings: Settings
}

function Splash({ error, onRetry }) {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden px-8">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ion/[0.06] blur-[100px]" />

      <div className="relative text-center animate-fade-up">
        <div className="relative mx-auto w-fit">
          <div className="absolute -inset-8 rounded-full border border-white/[0.04]" />
          <div className="absolute -inset-8 animate-spin-slow rounded-full border border-transparent border-t-ion/40" />
          <div className="absolute -inset-14 rounded-full border border-white/[0.025]" />
          <div className="grid h-20 w-20 place-items-center rounded-[24px] border border-white/[0.06] bg-ink-900/70">
            <Logo className="h-12 w-12" />
          </div>
        </div>

        {error ? (
          <>
            <p className="label mt-8">Başlatma hatası</p>
            <h1 className="mt-2 font-display text-[24px] font-semibold text-white">Sistem denetlenemedi</h1>
            <p className="mx-auto mt-2 max-w-[420px] text-[12px] leading-relaxed text-slate-400">{error}</p>
            <button type="button" onClick={onRetry} className="btn-ghost mt-6">
              <Spinner className="h-4 w-4" />
              Tekrar dene
            </button>
          </>
        ) : (
          <>
            <p className="label mt-8">Omerta FPS · Sistem denetimi</p>
            <h1 className="mt-2 font-display text-[25px] font-semibold tracking-tight text-white">
              Sistemin hazırlanıyor
            </h1>
            <p className="mt-2 text-[12px] text-muted">Donanım kimliği ve lisans doğrulanıyor…</p>
            <div className="mt-7 flex items-center justify-center gap-4 text-[10px] text-slate-500">
              <span className="flex items-center gap-2">
                <Spinner className="h-3 w-3 text-ion" />
                HWID hesaplanıyor
              </span>
              <span className="h-1 w-1 rounded-full bg-slate-700" />
              <span>Yerel lisans doğrulama</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MainShell({ boot, licensed, onUpgrade, onLogout }) {
  const requested = new URLSearchParams(window.location.search).get('view')
  const initial = SCREENS[requested] ? requested : 'scan'
  const [screen, setScreen] = useState(initial)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [screen])

  const navigate = useCallback((id) => {
    if (SCREENS[id]) setScreen(id)
  }, [])

  const Active = SCREENS[screen] || Scan

  return (
    <div className="flex h-full w-full min-w-0">
      <Sidebar
        current={screen}
        onNavigate={navigate}
        boot={boot}
        licensed={licensed}
        onUpgrade={onUpgrade}
        onLogout={onLogout}
      />

      <main ref={scrollRef} className="min-h-0 min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[1180px] px-7 pb-16 pt-7">
          <div key={screen} className="animate-fade-in">
            <Active onNavigate={navigate} boot={boot} licensed={licensed} onUpgrade={onUpgrade} />
          </div>
        </div>
      </main>
    </div>
  )
}

function Shell() {
  const { boot, error, theme, setTheme, refresh, paywall, openPaywall, logout } = useAppState()

  let content
  let contextLabel = 'Sistem Denetimi'

  if (!boot) {
    content = <Splash error={error} onRetry={refresh} />
  } else if (!boot.admin) {
    contextLabel = 'Yönetici İzni'
    content = <AdminGate boot={boot} onRefresh={refresh} />
  } else {
    contextLabel = null
    content = (
      <MainShell
        boot={boot}
        licensed={boot.licensed}
        onRefresh={refresh}
        onUpgrade={() =>
          openPaywall({
            message: 'Bu işlem Pro lisans gerektiriyor. Anahtarını girerek onarım ve optimizasyon modüllerini aç.'
          })
        }
        onLogout={logout}
      />
    )
  }

  return (
    <div className="app-bg flex h-screen flex-col overflow-hidden">
      <div className="grid-overlay pointer-events-none fixed inset-0 z-0" />
      {theme === 'rosa' && <RosaScene />}
      <TopBar
        contextLabel={contextLabel}
        admin={boot?.admin}
        version={boot?.version || ''}
        licensed={boot?.licensed}
        theme={theme}
        onThemeChange={setTheme}
      />
      <div className="relative z-10 flex min-h-0 flex-1">{content}</div>
      {paywall && boot?.admin && <Paywall />}
      <UpdateBanner />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppStateProvider>
        <Shell />
      </AppStateProvider>
    </ToastProvider>
  )
}
