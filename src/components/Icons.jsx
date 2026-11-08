import { useId } from 'react'
import { cn } from '../lib/format'

const paths = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="7" rx="2" />
      <rect x="3" y="13" width="18" height="7" rx="2" />
      <path d="M7 7.5h.01M7 16.5h.01M11 7.5h4M11 16.5h4" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  memory: (
    <>
      <rect x="2" y="6" width="20" height="11" rx="2" />
      <path d="M6 17v3M10 17v3M14 17v3M18 17v3M6 10h12v3H6z" />
    </>
  ),
  gpu: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="16" cy="12" r="2.5" />
      <path d="M6 9v6M2 10h2M2 14h2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m8.5 11.5 2.4 2.4 4.6-4.8" />
    </>
  ),
  key: (
    <>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8.3-8.3M16.5 6.5l3 3M14 9l2 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 0 1-15.5 6.2L3 16" />
      <path d="M3 21v-5h5" />
      <path d="M3 12a9 9 0 0 1 15.5-6.2L21 8" />
      <path d="M21 3v5h-5" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  check: <path d="m20 6-11 11-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  alert: (
    <>
      <path d="M10.3 3.9 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  zap: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  gauge: (
    <>
      <path d="M3.3 19a10 10 0 1 1 17.4 0" />
      <path d="m12 14 4-4" />
      <circle cx="12" cy="14" r="1.6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  monitor: (
    <>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  power: (
    <>
      <path d="M18.4 6.6a9 9 0 1 1-12.8 0" />
      <path d="M12 2v10" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3Z" />
      <path d="M5 3v4M3 5h4M19 17v2M18 18h2" />
    </>
  ),
  rocket: (
    <>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2.1-.1-2.9a2.2 2.2 0 0 0-2.9-.1z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-4A13 13 0 0 1 22 2c0 2.7-.8 7.5-6 11a22 22 0 0 1-4 2z" />
      <path d="M9 12H4s.6-3 2-4c1.6-1.1 5 0 5 0M12 15v5s3-.6 4-2c1.1-1.6 0-5 0-5" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 15 4-4 4 2 5-7" />
    </>
  ),
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  gamepad: (
    <>
      <path d="M6 12h4M8 10v4" />
      <rect x="2" y="6" width="20" height="12" rx="5" />
      <circle cx="16" cy="11" r="1" />
      <circle cx="18.5" cy="14" r="1" />
    </>
  ),
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
      <path d="M9 2v2M15 2v2M9 20v2M15 20v2M2 9h2M2 15h2M20 9h2M20 15h2" />
    </>
  ),
  harddrive: (
    <>
      <path d="M22 12H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z" />
      <path d="M6 16h.01M10 16h.01" />
    </>
  ),
  printer: (
    <>
      <path d="M6 9V2h12v7" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  wifi: (
    <>
      <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0" />
      <path d="M12 20h.01" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </>
  ),
  scan: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M21 12h-3M12 21v-3M3 12h3" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  swords: (
    <>
      <path d="m4 20 5-5M6.5 14.5 4 20l5.5-2.5" />
      <path d="M14.5 6.5 20 4l-2.5 5.5-7.8 7.8-2.5-2.5Z" />
      <path d="m3 8 3-3 10 10M13 19l3-3 5 5" />
    </>
  ),
  film: (
    <>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M2.5 9h4.5M2.5 15h4.5M17 9h4.5M17 15h4.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.9-.9 1.9-1.9 0-.5-.2-.9-.5-1.3-.3-.3-.5-.7-.5-1.1 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-3.9-4-7-9-7z" />
      <circle cx="7.6" cy="11.2" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="10.4" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.4" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h9M19 6h1M4 12h4M14 12h6M4 18h9M19 18h1" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="11" cy="12" r="2" />
      <circle cx="16" cy="18" r="2" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
      <circle cx="9" cy="7" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="8" cy="17" r="2" />
    </>
  ),
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5z" />,
  timer: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 1.5M9 2h6" />
    </>
  ),
  expand: (
    <>
      <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </>
  ),
  shieldOff: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m4 4 16 16" />
    </>
  )
}

export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.8 }) {
  const content = paths[name]
  if (!content) return null
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {content}
    </svg>
  )
}

export function Logo({ className = 'h-7 w-7' }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden="true">
      <defs>
        <linearGradient id={`logo-${id}`} x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7CC6FF" />
          <stop offset="0.55" stopColor="#3BA7FF" />
          <stop offset="1" stopColor="#3DF5A5" />
        </linearGradient>
      </defs>
      <circle
        cx="20"
        cy="20"
        r="13"
        fill={`url(#logo-${id})`}
        fillOpacity="0.1"
        stroke={`url(#logo-${id})`}
        strokeWidth="2"
      />
      <circle cx="20" cy="20" r="5.6" stroke={`url(#logo-${id})`} strokeWidth="2" />
      <path
        d="M20 2.5v5M20 32.5v5M2.5 20h5M32.5 20h5"
        stroke={`url(#logo-${id})`}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="20" cy="20" r="1.5" fill={`url(#logo-${id})`} />
    </svg>
  )
}
