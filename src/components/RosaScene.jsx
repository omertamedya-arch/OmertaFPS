import { useEffect, useMemo, useState } from 'react'
import { cn } from '../lib/format'
import { useReducedMotion } from '../lib/motion'

const PETAL_COLORS = [
  'linear-gradient(140deg, #fff1f7, #fbcfe8 55%, #f472b6)',
  'linear-gradient(140deg, #ffe4ef, #f9a8d4 60%, #ec4899)',
  'linear-gradient(140deg, #fff5fa, #fbcfe8 50%, #e879b9)'
]

const SPARKS = Array.from({ length: 11 }, (_, index) => {
  const angle = (Math.PI * 2 * index) / 11
  const distance = 30 + (index % 3) * 15
  return {
    dx: `${Math.round(Math.cos(angle) * distance)}px`,
    dy: `${Math.round(Math.sin(angle) * distance) - 8}px`,
    delay: `${(index % 4) * 0.035}s`
  }
})

function buildPetals(count) {
  return Array.from({ length: count }, (_, index) => {
    const size = 7 + Math.random() * 7
    return {
      id: index,
      left: Math.random() * 100,
      size,
      delay: -(Math.random() * 18),
      duration: 11 + Math.random() * 9,
      driftA: -60 + Math.random() * 120,
      driftB: -80 + Math.random() * 140,
      opacity: 0.5 + Math.random() * 0.45,
      color: PETAL_COLORS[index % PETAL_COLORS.length],
      top: 4 + Math.random() * 82,
      rotate: Math.random() * 360
    }
  })
}

const INITIAL_STATE = {
  pos: 'left',
  pace: 'walk',
  facing: 'right',
  pose: 'idle',
  enemy: 'hidden'
}

const SCHEDULE = [
  { at: 0, patch: { pos: 'left', pace: 'walk', facing: 'right', pose: 'walk', enemy: 'hidden' } },
  { at: 700, patch: { pos: 'center' } },
  { at: 3000, patch: { pose: 'idle' } },
  { at: 3350, patch: { pose: 'jump' } },
  { at: 4150, patch: { pose: 'idle' } },
  { at: 4350, patch: { enemy: 'appear' } },
  { at: 5100, patch: { pos: 'near', pace: 'dash', pose: 'walk' } },
  { at: 5650, patch: { pose: 'attack' } },
  { at: 6150, patch: { enemy: 'hit' }, burst: true },
  { at: 6900, patch: { pose: 'idle', enemy: 'hidden' } },
  { at: 7400, patch: { facing: 'left', pos: 'left', pace: 'walk', pose: 'walk' } },
  { at: 9700, patch: { facing: 'right', pose: 'idle' } },
  { at: 10300, patch: { pose: 'jump' } },
  { at: 11100, patch: { pose: 'idle', pace: 'walk' } }
]

const LOOP_MS = 13400

const POSE_CLASS = {
  walk: 'is-walking',
  jump: 'is-jumping',
  attack: 'is-attacking',
  idle: ''
}

function Samurai() {
  return (
    <svg viewBox="0 0 64 84" className="h-full w-full" aria-hidden="true">
      <ellipse cx="32" cy="80" rx="15" ry="3" fill="#9d174d" opacity="0.16" />

      <g className="samurai-leg samurai-leg-back">
        <rect x="23.5" y="53" width="7.5" height="19" rx="3.5" fill="#241f38" />
        <rect x="21" y="70" width="12" height="4.5" rx="2" fill="#171327" />
      </g>
      <g className="samurai-leg samurai-leg-front">
        <rect x="33" y="53" width="7.5" height="19" rx="3.5" fill="#332b4d" />
        <rect x="31" y="70" width="12" height="4.5" rx="2" fill="#171327" />
      </g>

      <path d="M18 36q6-8 13-3l-3 11z" fill="#3a3158" />
      <path d="M24 30h17l5 27q-14 6-28 0z" fill="#332b4d" />
      <path d="M24.5 33.5h16v12q-8 4-16 0z" fill="#453a66" />
      <path d="M27 38.5h11M27 43.5h11" stroke="#b91c1c" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      <rect x="23" y="46.5" width="18" height="4" rx="1.6" fill="#b91c1c" />
      <circle cx="32" cy="48.5" r="2.2" fill="#e11d48" />
      <path d="M21 50.5h22l3 11q-14 5-28 0z" fill="#2a2440" />

      <path d="M21.5 34q-5.5 3-4.5 10.5l4.5 2q.8-5.5 4-8z" fill="#2f2747" />

      <rect x="29.4" y="26.5" width="5.2" height="5" fill="#e8b49a" />
      <circle cx="32" cy="22" r="9" fill="#f3c9ad" />
      <path d="M23.3 21.5q8.7 10 17.4 0v4.2q-8.7 7.5-17.4 0z" fill="#8f1d3f" />
      <ellipse cx="28.8" cy="19.6" rx="1.7" ry="1.15" fill="#2b1320" />
      <ellipse cx="35.2" cy="19.6" rx="1.7" ry="1.15" fill="#2b1320" />

      <path d="M22 21q0-11 10-11t10 11z" fill="#221c35" />
      <rect x="21" y="19.5" width="22" height="4.4" rx="2.2" fill="#2f2747" />
      <path d="M32 5.5l3.4 8.5h-6.8z" fill="#f5c542" />
      <path d="M22.6 16q-6.3-5.2-2.6-11.2.8 5.4 5.2 8.5z" fill="#f5c542" />
      <path d="M41.4 16q6.3-5.2 2.6-11.2-.8 5.4-5.2 8.5z" fill="#f5c542" />
      <rect x="19.4" y="22.6" width="4.2" height="6.4" rx="1.8" fill="#2f2747" />
      <rect x="40.4" y="22.6" width="4.2" height="6.4" rx="1.8" fill="#2f2747" />

      <path d="M40 33.5q6.4 3 7.6 9.5l-5 2.2q-1-5.4-4.4-7z" fill="#3a3158" />
      <circle cx="45" cy="44.5" r="2.8" fill="#f3c9ad" />

      <g className="samurai-sword">
        <path d="M40 51l7.4-7.4" stroke="#7f1d1d" strokeWidth="4.4" strokeLinecap="round" />
        <circle cx="47.5" cy="42.5" r="2.7" fill="#f5c542" stroke="#b45309" strokeWidth="0.9" />
        <path d="M49.4 40.6q.8-1.6 1.2-2L62 15" stroke="#2f2747" strokeWidth="5.6" strokeLinecap="round" />
        <path d="M49.4 40.6q.8-1.6 1.2-2L62 15" stroke="#e8eef7" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M50.6 38.4 61 16.6" stroke="#ffffff" strokeWidth="1.1" strokeLinecap="round" opacity="0.85" />
      </g>
    </svg>
  )
}

function Enemy() {
  return (
    <svg viewBox="0 0 48 62" className="h-full w-full" aria-hidden="true">
      <ellipse cx="24" cy="59" rx="12" ry="2.4" fill="#4c0519" opacity="0.2" />
      <rect x="15" y="41" width="7" height="16" rx="3" fill="#241127" />
      <rect x="26" y="41" width="7" height="16" rx="3" fill="#2f1733" />
      <rect x="12.5" y="54" width="11" height="4" rx="2" fill="#180a1c" />
      <rect x="24" y="54" width="11" height="4" rx="2" fill="#180a1c" />

      <path d="M12 21h24l4 22q-16 6-32 0z" fill="#3b1f3f" />
      <path d="M11 24q13 6 26 0l1.4 5q-14.4 6-28.8 0z" fill="#7f1d1d" />
      <rect x="12.5" y="37" width="23" height="4" rx="1.6" fill="#7f1d1d" />

      <circle cx="24" cy="15" r="9.4" fill="#4a2a4a" />
      <path d="M15.6 15.4q8.4 8.2 16.8 0v3.4q-8.4 6.6-16.8 0z" fill="#2a1229" />
      <ellipse cx="20.4" cy="13.4" rx="1.9" ry="1.25" fill="#fb7185" />
      <ellipse cx="27.6" cy="13.4" rx="1.9" ry="1.25" fill="#fb7185" />
      <path d="M14.8 8.2 12 2.4l6 2.6z" fill="#f8fafc" />
      <path d="M33.2 8.2 36 2.4l-6 2.6z" fill="#f8fafc" />

      <path d="M37 37 45 12" stroke="#6b3f2a" strokeWidth="4" strokeLinecap="round" />
      <circle cx="39.2" cy="30" r="1.3" fill="#c9a227" />
      <circle cx="41.2" cy="23" r="1.3" fill="#c9a227" />
      <circle cx="43.2" cy="16" r="1.3" fill="#c9a227" />
      <path d="M10.6 25.5 7 33" stroke="#6b3f2a" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  )
}

function Slash() {
  return (
    <svg viewBox="0 0 74 74" className="samurai-slash" aria-hidden="true">
      <path d="M8 18Q54 5 66 46" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" opacity="0.92" />
      <path d="M12 27Q52 16 61 48" fill="none" stroke="#f9a8d4" strokeWidth="5.5" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}

export default function RosaScene() {
  const reduced = useReducedMotion()
  const petals = useMemo(() => buildPetals(30), [])
  const staticPetals = useMemo(() => buildPetals(9), [])
  const [state, setState] = useState(INITIAL_STATE)
  const [burst, setBurst] = useState(0)

  useEffect(() => {
    if (reduced) return undefined
    let timers = []
    let loopTimer = 0

    const run = () => {
      timers = []
      setState(INITIAL_STATE)
      SCHEDULE.forEach((entry) => {
        timers.push(
          window.setTimeout(() => {
            setState((current) => ({ ...current, ...entry.patch }))
            if (entry.burst) setBurst((value) => value + 1)
          }, entry.at)
        )
      })
      loopTimer = window.setTimeout(run, LOOP_MS)
    }

    run()
    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(loopTimer)
    }
  }, [reduced])

  if (reduced) {
    return (
      <div className="sakura-stage" aria-hidden="true">
        {staticPetals.map((petal) => (
          <span
            key={petal.id}
            className="sakura-petal"
            style={{
              left: `${petal.left}%`,
              top: `${petal.top}%`,
              width: petal.size,
              height: petal.size * 0.88,
              background: petal.color,
              opacity: 0.7,
              transform: `rotate(${petal.rotate}deg)`
            }}
          />
        ))}
        <div className="sakura-actor" data-pos="center">
          <div className="samurai-sprite">
            <Samurai />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="sakura-field" aria-hidden="true">
        {petals.map((petal) => (
          <span
            key={petal.id}
            className="sakura-petal"
            style={{
              left: `${petal.left}%`,
              width: petal.size,
              height: petal.size * 0.88,
              background: petal.color,
              animationDelay: `${petal.delay}s`,
              animationDuration: `${petal.duration}s`,
              '--drift-a': `${petal.driftA}px`,
              '--drift-b': `${petal.driftB}px`,
              '--petal-opacity': petal.opacity
            }}
          />
        ))}
      </div>

      <div className="sakura-stage" aria-hidden="true">
        <div className="sakura-actor" data-pos={state.pos} data-pace={state.pace}>
          <div className={cn('samurai-flip', state.facing === 'left' && 'is-left')}>
            <div className={cn('samurai-sprite', POSE_CLASS[state.pose])}>
              <Samurai />
              <Slash />
            </div>
          </div>
        </div>

        {state.enemy !== 'hidden' && (
          <div className={cn('sakura-enemy', state.enemy === 'appear' ? 'is-visible' : 'is-hit')}>
            <Enemy />
          </div>
        )}

        {burst > 0 && (
          <div key={burst} className="sakura-burst">
            {SPARKS.map((spark, index) => (
              <span
                key={index}
                className="sakura-spark"
                style={{
                  '--dx': spark.dx,
                  '--dy': spark.dy,
                  '--spark-delay': spark.delay
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
