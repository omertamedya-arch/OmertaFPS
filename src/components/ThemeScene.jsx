import { useId, useMemo } from 'react'
import RosaScene from './RosaScene'

function useParticles(count, factory) {
  return useMemo(
    () => Array.from({ length: count }, (_, id) => ({ id, ...factory(id) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [count]
  )
}

function Drone() {
  const id = useId()
  return (
    <svg viewBox="0 0 96 74" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#46586f" />
          <stop offset="100%" stopColor="#182130" />
        </linearGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7cc6ff" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#7cc6ff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <path className="drone-beam" d="M38 42h20l13 30H25z" fill={`url(#${id}-beam)`} />

      <g stroke="#33455c" strokeWidth="1.3" strokeLinecap="round">
        <path d="M22 24h52M48 13v22" />
      </g>
      <g fill="#93c5fd" opacity="0.3">
        <ellipse cx="22" cy="16" rx="15" ry="3.4" />
        <ellipse cx="74" cy="16" rx="15" ry="3.4" />
      </g>
      <g fill="#cbd5e1" opacity="0.75">
        <rect x="19" y="14.4" width="6" height="3.2" rx="1.6" />
        <rect x="71" y="14.4" width="6" height="3.2" rx="1.6" />
      </g>

      <rect x="34" y="26" width="28" height="15" rx="7.5" fill={`url(#${id}-body)`} stroke="#3b4c66" strokeWidth="1" />
      <circle cx="48" cy="34" r="3.6" fill="#0b111b" stroke="#5b6f8c" strokeWidth="0.9" />
      <circle cx="48" cy="34" r="1.3" fill="#7cc6ff" className="drone-lens" />
      <circle cx="37" cy="45" r="1.5" fill="#f87171" className="drone-light-a" />
      <circle cx="59" cy="45" r="1.5" fill="#4ade80" className="drone-light-b" />
    </svg>
  )
}

function DarkScene() {
  const streaks = useParticles(5, (index) => ({
    top: 10 + index * 18,
    delay: index * 2.1,
    duration: 7 + (index % 3) * 1.6
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        {streaks.map((streak) => (
          <span
            key={streak.id}
            className="dark-streak"
            style={{
              top: `${streak.top}%`,
              animationDelay: `${streak.delay}s`,
              animationDuration: `${streak.duration}s`
            }}
          />
        ))}
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="drone-actor">
          <Drone />
        </div>
      </div>
    </>
  )
}

function PaperPlane() {
  return (
    <svg viewBox="0 0 78 52" className="h-full w-full" aria-hidden="true">
      <path d="M2 30 74 4 46 48 32 33z" fill="#f4f8fd" stroke="#c7d3e2" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M32 33 46 48 40 30z" fill="#dbe4ef" />
      <path d="M2 30 40 30 74 4z" fill="#ffffff" opacity="0.92" />
      <path d="M40 30 74 4" stroke="#e2e8f0" strokeWidth="1" />
    </svg>
  )
}

function LightScene() {
  const clouds = useParticles(3, (index) => ({
    top: 14 + index * 26,
    left: -8 + index * 26,
    size: 210 + index * 60,
    duration: 52 + index * 12
  }))
  const dust = useParticles(12, (index) => ({
    left: 4 + ((index * 37) % 92),
    top: 12 + ((index * 53) % 74),
    size: 2 + (index % 3),
    delay: (index % 6) * 0.9,
    duration: 10 + (index % 5) * 2.4
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        {clouds.map((cloud) => (
          <span
            key={cloud.id}
            className="light-cloud"
            style={{
              top: `${cloud.top}%`,
              left: `${cloud.left}%`,
              width: cloud.size,
              height: cloud.size * 0.42,
              animationDuration: `${cloud.duration}s`
            }}
          />
        ))}
        {dust.map((dot) => (
          <span
            key={dot.id}
            className="light-dust"
            style={{
              left: `${dot.left}%`,
              top: `${dot.top}%`,
              width: dot.size,
              height: dot.size,
              animationDelay: `${dot.delay}s`,
              animationDuration: `${dot.duration}s`
            }}
          />
        ))}
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="plane-actor">
          <div className="plane-bob">
            <PaperPlane />
          </div>
        </div>
      </div>
    </>
  )
}

function Crystal() {
  const id = useId()
  return (
    <svg viewBox="0 0 64 86" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e0f2fe" stopOpacity="0.65" />
          <stop offset="45%" stopColor="#7dd3fc" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#5eead4" stopOpacity="0.22" />
        </linearGradient>
      </defs>
      <path
        d="M32 2 56 22v26L32 84 8 48V22z"
        fill={`url(#${id}-glass)`}
        stroke="rgba(224,242,254,0.6)"
        strokeWidth="1.1"
      />
      <path d="M32 2v82M8 22l48 26M56 22 8 48" stroke="rgba(224,242,254,0.3)" strokeWidth="0.9" />
      <path d="M32 2 8 22l24 8z" fill="#ffffff" opacity="0.28" />
    </svg>
  )
}

function GlassScene() {
  const bubbles = useParticles(12, (index) => ({
    left: 5 + ((index * 31) % 88),
    size: 8 + ((index * 7) % 22),
    delay: -(index * 1.7),
    duration: 15 + (index % 6) * 3
  }))
  const sparks = useParticles(8, (index) => ({
    left: 8 + ((index * 43) % 84),
    top: 14 + ((index * 29) % 68),
    delay: (index % 5) * 0.7
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        {bubbles.map((bubble) => (
          <span
            key={bubble.id}
            className="glass-bubble"
            style={{
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`
            }}
          />
        ))}
        {sparks.map((spark) => (
          <span
            key={spark.id}
            className="frost-spark"
            style={{ left: `${spark.left}%`, top: `${spark.top}%`, animationDelay: `${spark.delay}s` }}
          />
        ))}
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="crystal-actor">
          <div className="crystal-spin">
            <Crystal />
          </div>
        </div>
      </div>
    </>
  )
}

function Koi() {
  const id = useId()
  return (
    <svg viewBox="0 0 112 56" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="60%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#2dd4bf" />
        </linearGradient>
      </defs>
      <g className="koi-tail">
        <path d="M80 28c13-9 22-12 28-8-6 6-9 12-9 18 5 2 8 5 9 9-7 3-17 0-29-8z" fill="#5eead4" opacity="0.9" />
      </g>
      <path d="M16 28c12-12 33-15 49-8 10 4 16 8 16 8s-6 4-16 8c-16 7-37 4-49-8z" fill={`url(#${id}-body)`} />
      <path d="M30 20c8-6 20-7 30-3" stroke="#cffafe" strokeWidth="2" fill="none" opacity="0.65" />
      <circle cx="25" cy="25" r="2.1" fill="#083344" />
      <path d="M40 16c4-6 10-8 16-7-4 3-6 6-6 10" fill="#2dd4bf" />
      <path d="M42 40c4 6 10 8 16 7-4-3-6-6-6-10" fill="#2dd4bf" />
    </svg>
  )
}

function OceanScene() {
  const bubbles = useParticles(13, (index) => ({
    left: 4 + ((index * 29) % 90),
    size: 5 + ((index * 5) % 14),
    delay: -(index * 1.4),
    duration: 12 + (index % 6) * 2.6
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        {bubbles.map((bubble) => (
          <span
            key={bubble.id}
            className="ocean-bubble"
            style={{
              left: `${bubble.left}%`,
              width: bubble.size,
              height: bubble.size,
              animationDelay: `${bubble.delay}s`,
              animationDuration: `${bubble.duration}s`
            }}
          />
        ))}
        <span className="ocean-wave ocean-wave-a" />
        <span className="ocean-wave ocean-wave-b" />
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="koi-actor">
          <div className="koi-bob">
            <Koi />
          </div>
        </div>
      </div>
    </>
  )
}

function Ufo() {
  const id = useId()
  return (
    <svg viewBox="0 0 92 64" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f9a8d4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f9a8d4" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path className="ufo-beam" d="M40 30h12l11 28H29z" fill={`url(#${id}-beam)`} />
      <ellipse cx="46" cy="30" rx="26" ry="7" fill="#312e81" stroke="#a5b4fc" strokeWidth="1.2" />
      <path d="M34 30a12 11 0 0 1 24 0z" fill="#c7d2fe" opacity="0.82" />
      <path d="M38 26a8 7 0 0 1 16 0z" fill="#eef2ff" opacity="0.55" />
      <g fill="#f9a8d4" className="ufo-lights">
        <circle cx="27" cy="31" r="2" />
        <circle cx="37" cy="34.5" r="1.6" />
        <circle cx="46" cy="36" r="1.6" />
        <circle cx="55" cy="34.5" r="1.6" />
        <circle cx="65" cy="31" r="2" />
      </g>
    </svg>
  )
}

function NightScene() {
  const stars = useParticles(18, (index) => ({
    left: 3 + ((index * 41) % 94),
    top: 4 + ((index * 23) % 70),
    size: 1.5 + (index % 3),
    delay: (index % 7) * 0.8
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        <span className="aurora-band aurora-a" />
        <span className="aurora-band aurora-b" />
        <span className="aurora-band aurora-c" />
        {stars.map((star) => (
          <span
            key={star.id}
            className="night-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`
            }}
          />
        ))}
        <span className="shooting-star shooting-a" />
        <span className="shooting-star shooting-b" />
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="ufo-actor">
          <Ufo />
        </div>
      </div>
    </>
  )
}

function Phoenix() {
  const id = useId()
  return (
    <svg viewBox="0 0 150 84" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="55%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
      </defs>
      <g className="phoenix-tail">
        <path d="M40 46C26 54 16 63 10 74c10-5 21-7 32-6-7 5-12 10-14 15 13-7 26-11 37-12z" fill="#fbbf24" opacity="0.75" />
        <path d="M44 50c-8 10-12 18-12 27 8-8 16-12 25-14z" fill="#f97316" opacity="0.6" />
      </g>
      <path
        className="phoenix-wing"
        d="M72 46C58 26 38 13 14 7c9 11 13 21 13 31-7-2-13-2-18 0 15 6 26 17 33 30z"
        fill="#fb923c"
        opacity="0.9"
      />
      <path d="M70 30c17-9 36-9 49 0 8 5 12 10 12 10s-12 4-25 4c-17 0-31-4-42-10z" fill={`url(#${id}-body)`} />
      <circle cx="120" cy="30" r="7.4" fill="#f97316" />
      <path d="M126 28l11 3.4-11 4z" fill="#fbbf24" />
      <circle cx="122" cy="28.5" r="1.5" fill="#7c2d12" />
      <path d="M104 40c6 5 13 8 20 8-5 5-11 8-19 8-11 0-22-4-31-11" fill="#fb923c" opacity="0.45" />
    </svg>
  )
}

function EmberScene() {
  const embers = useParticles(18, (index) => ({
    left: 4 + ((index * 33) % 92),
    size: 2.5 + ((index * 3) % 5),
    delay: -(index * 1.1),
    duration: 9 + (index % 6) * 2.2,
    drift: -30 + (index % 5) * 16
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        <span className="heat-glow" />
        {embers.map((ember) => (
          <span
            key={ember.id}
            className="ember"
            style={{
              left: `${ember.left}%`,
              width: ember.size,
              height: ember.size,
              animationDelay: `${ember.delay}s`,
              animationDuration: `${ember.duration}s`,
              '--ember-drift': `${ember.drift}px`
            }}
          />
        ))}
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="phoenix-actor">
          <Phoenix />
        </div>
      </div>
    </>
  )
}

function Fox() {
  return (
    <svg viewBox="0 0 126 64" className="h-full w-full" aria-hidden="true">
      <g className="fox-tail">
        <path d="M20 42C8 40 2 31 5 20c7 9 16 13 27 13z" fill="#ea7c3f" />
        <path d="M8 22c5 7 12 11 20 11" stroke="#fdba74" strokeWidth="2" fill="none" opacity="0.7" />
      </g>
      <ellipse cx="66" cy="41" rx="31" ry="13" fill="#f97316" />
      <path d="M64 43c3 6 10 9 18 8-3-3-5-6-5-9" fill="#fb923c" opacity="0.6" />
      <g stroke="#b45309" strokeWidth="3.4" strokeLinecap="round">
        <path d="M46 51v9M61 52v8M82 51v9" />
      </g>
      <g stroke="#7c2d12" strokeWidth="2.6" strokeLinecap="round">
        <path d="M43 55h8M58 56h8M79 55h8" />
      </g>
      <path d="M88 31c8-3 15-9 19-18 3 11-1 18-10 20 6 2 10 6 10 11-9-2-19-4-27-4z" fill="#fb923c" />
      <circle cx="103" cy="27" r="7.4" fill="#fdba74" />
      <path d="M99 21l3-9 5 8z" fill="#ea7c3f" />
      <path d="M106 21l4-7 2 9z" fill="#ea7c3f" />
      <circle cx="106" cy="26" r="1.5" fill="#431407" />
      <circle cx="112" cy="30" r="1.8" fill="#431407" />
    </svg>
  )
}

function ForestScene() {
  const fireflies = useParticles(14, (index) => ({
    left: 5 + ((index * 37) % 90),
    top: 22 + ((index * 47) % 62),
    delay: (index % 8) * 0.7,
    duration: 5 + (index % 5) * 1.4,
    drift: -14 + (index % 4) * 9
  }))
  const leaves = useParticles(8, (index) => ({
    left: 4 + ((index * 43) % 90),
    size: 7 + (index % 3) * 3,
    delay: -(index * 2.3),
    duration: 13 + (index % 5) * 3,
    drift: -50 + (index % 4) * 30
  }))

  return (
    <>
      <div className="scene-layer" aria-hidden="true">
        <span className="forest-fog" />
        {leaves.map((leaf) => (
          <span
            key={leaf.id}
            className="forest-leaf"
            style={{
              left: `${leaf.left}%`,
              width: leaf.size,
              height: leaf.size * 0.62,
              animationDelay: `${leaf.delay}s`,
              animationDuration: `${leaf.duration}s`,
              '--leaf-drift': `${leaf.drift}px`
            }}
          />
        ))}
        {fireflies.map((fly) => (
          <span
            key={fly.id}
            className="firefly"
            style={{
              left: `${fly.left}%`,
              top: `${fly.top}%`,
              animationDelay: `${fly.delay}s`,
              animationDuration: `${fly.duration}s`,
              '--fly-drift': `${fly.drift}px`
            }}
          />
        ))}
      </div>
      <div className="scene-actor-layer" aria-hidden="true">
        <div className="fox-actor">
          <div className="fox-bob">
            <Fox />
          </div>
        </div>
      </div>
    </>
  )
}

const SCENES = {
  dark: DarkScene,
  light: LightScene,
  saydam: GlassScene,
  okyanus: OceanScene,
  gece: NightScene,
  kor: EmberScene,
  orman: ForestScene
}

export default function ThemeScene({ theme }) {
  if (theme === 'rosa') return <RosaScene />
  const Scene = SCENES[theme]
  return Scene ? <Scene /> : null
}
