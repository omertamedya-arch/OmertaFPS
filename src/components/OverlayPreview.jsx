import { cn } from '../lib/format'

export const CROSSHAIR_STYLES = [
  { id: 'cross', label: 'Artı' },
  { id: 'dot', label: 'Nokta' },
  { id: 'circle', label: 'Çember' },
  { id: 'x', label: 'Çapraz' }
]

export const OVERLAY_COLORS = [
  { value: '#EAF6FF', label: 'Beyaz' },
  { value: '#3DF5A5', label: 'Mint' },
  { value: '#3BA7FF', label: 'Mavi' },
  { value: '#FFD166', label: 'Amber' },
  { value: '#FF4D7E', label: 'Pembe' },
  { value: '#FF5A5A', label: 'Kırmızı' }
]

const CENTER = 160

function crosshairArm(config, stroke, width) {
  const { size = 10, gap = 5 } = config
  return (
    <g transform={config.style === 'x' ? `rotate(45 ${CENTER} ${CENTER})` : undefined}>
      <line x1={CENTER - gap - size} y1={CENTER} x2={CENTER - gap} y2={CENTER} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
      <line x1={CENTER + gap} y1={CENTER} x2={CENTER + gap + size} y2={CENTER} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
      <line x1={CENTER} y1={CENTER - gap - size} x2={CENTER} y2={CENTER - gap} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
      <line x1={CENTER} y1={CENTER + gap} x2={CENTER} y2={CENTER + gap + size} stroke={stroke} strokeWidth={width} strokeLinecap="round" />
    </g>
  )
}

function crosshairShape(config, isOutline) {
  const stroke = isOutline ? 'rgba(0,0,0,0.55)' : config.color
  const width = isOutline ? config.thickness + 2 : config.thickness

  if (config.style === 'dot') {
    return <circle cx={CENTER} cy={CENTER} r={Math.max(2, config.thickness) + (isOutline ? 1 : 0)} fill={stroke} />
  }

  if (config.style === 'circle') {
    return <circle cx={CENTER} cy={CENTER} r={config.size} fill="none" stroke={stroke} strokeWidth={width} />
  }

  return crosshairArm(config, stroke, width)
}

export function CrosshairPreview({ config, className }) {
  return (
    <svg viewBox="0 0 320 320" className={cn('h-full w-full', className)} style={{ opacity: config.opacity }} aria-hidden="true">
      {config.outline && crosshairShape(config, true)}
      {crosshairShape(config, false)}
    </svg>
  )
}

export function FpsPreview({ config }) {
  return (
    <span
      className="inline-flex items-baseline gap-1.5 rounded-lg border border-white/[0.07] bg-[rgba(4,9,14,0.5)] px-2.5 py-1"
      style={{ opacity: config.opacity }}
    >
      <span
        className="font-semibold tabular-nums tracking-wide"
        style={{ color: config.color, fontSize: `${config.fontSize}px`, textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
      >
        144
      </span>
      <span className="text-[7px] font-semibold uppercase tracking-[0.14em] text-slate-400/60">FPS</span>
    </span>
  )
}

export function OverlayStage({ overlay }) {
  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl border border-white/[0.06]"
      style={{
        background:
          'radial-gradient(circle at 50% 45%, rgba(24,42,58,0.9) 0%, rgba(9,15,22,0.96) 55%, rgba(4,8,12,1) 100%)'
      }}
    >
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(126,160,190,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(126,160,190,0.16) 1px, transparent 1px)',
          backgroundSize: '28px 28px'
        }}
      />
      <div className="absolute inset-x-0 top-3 text-center">
        <span className="text-[8px] font-medium uppercase tracking-[0.22em] text-slate-500/70">Oyun görünümü</span>
      </div>

      {overlay.crosshair.enabled ? (
        <div className="absolute left-1/2 top-1/2 h-[46%] w-[46%] max-h-[150px] max-w-[150px] -translate-x-1/2 -translate-y-1/2">
          <CrosshairPreview config={overlay.crosshair} />
        </div>
      ) : (
        <p className="absolute inset-0 grid place-items-center text-[10px] text-slate-600">Crosshair kapalı</p>
      )}

      {overlay.fps.enabled && (
        <div className="absolute right-3 top-3">
          <FpsPreview config={overlay.fps} />
        </div>
      )}
    </div>
  )
}
