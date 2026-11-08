export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function formatBytes(bytes, decimals = 1) {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '—'
  if (value === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(1024)))
  const scaled = value / 1024 ** index
  const digits = index === 0 ? 0 : scaled >= 100 ? 0 : decimals
  return `${scaled.toFixed(digits).replace('.', ',')} ${units[index]}`
}

export function formatGb(bytes, decimals = 1) {
  const value = Number(bytes)
  if (!Number.isFinite(value)) return '—'
  return `${(value / 1024 ** 3).toFixed(decimals).replace('.', ',')} GB`
}

export function formatUptime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const days = Math.floor(total / 86400)
  const hours = Math.floor((total % 86400) / 3600)
  const minutes = Math.floor((total % 3600) / 60)

  if (days > 0) return `${days} gün ${hours} saat`
  if (hours > 0) return `${hours} saat ${minutes} dk`
  return `${minutes} dk`
}

export function timeAgo(iso) {
  const timestamp = new Date(iso).getTime()
  if (!Number.isFinite(timestamp)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 45) return 'az önce'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} saat önce`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} gün önce`
  return new Date(timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })
}

export function formatDate(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatKeyInput(value) {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16)
  return (raw.match(/.{1,4}/g) || []).join('-')
}

export function maskLicenseKey(value) {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (raw.length < 16) return value || '—'
  return `${raw.slice(0, 4)}-****-****-${raw.slice(12, 16)}`
}

export function shortHwid(hwid) {
  if (!hwid) return '—'
  return hwid
}
