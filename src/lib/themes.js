export const THEME_STORAGE_KEY = 'omerta-theme'
export const SCENE_STORAGE_KEY = 'omerta-scene'
export const DEFAULT_THEME = 'dark'

export const THEMES = [
  { id: 'dark', label: 'Karanlık', hint: 'Gece mavisi', surface: 'dark', swatch: ['#0b1018', '#3ba7ff', '#3df5a5'] },
  { id: 'light', label: 'Aydınlık', hint: 'Temiz beyaz', surface: 'light', swatch: ['#f6f8fb', '#2563eb', '#059669'] },
  { id: 'rosa', label: 'Rosa', hint: 'Kiraz çiçeği', surface: 'light', swatch: ['#fff2f7', '#f43f5e', '#0d9488'] },
  { id: 'saydam', label: 'Saydam', hint: 'Buzlu cam', surface: 'dark', swatch: ['#0e1117', '#60a5fa', '#5eead4'] },
  { id: 'okyanus', label: 'Okyanus', hint: 'Derin turkuaz', surface: 'dark', swatch: ['#03141c', '#22d3ee', '#2dd4bf'] },
  { id: 'gece', label: 'Gece Yarısı', hint: 'Mor aurora', surface: 'dark', swatch: ['#0d0a1a', '#a78bfa', '#f472b6'] },
  { id: 'kor', label: 'Kor', hint: 'Sıcak ateş', surface: 'dark', swatch: ['#160b08', '#fb923c', '#facc15'] },
  { id: 'orman', label: 'Orman', hint: 'Yeşil vadi', surface: 'dark', swatch: ['#06110d', '#34d399', '#a3e635'] }
]

const THEME_IDS = new Set(THEMES.map((theme) => theme.id))

export function normalizeTheme(value) {
  return THEME_IDS.has(value) ? value : DEFAULT_THEME
}

export function readStoredTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return DEFAULT_THEME
  }
}

export function applyTheme(value) {
  const id = normalizeTheme(value)
  const meta = THEMES.find((theme) => theme.id === id) || THEMES[0]
  const root = document.documentElement
  root.dataset.theme = meta.id
  root.dataset.surface = meta.surface
  return meta.id
}

export function readStoredScene() {
  try {
    return localStorage.getItem(SCENE_STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function persistScene(enabled) {
  const next = enabled !== false
  try {
    localStorage.setItem(SCENE_STORAGE_KEY, next ? 'on' : 'off')
  } catch {
    /* storage may be unavailable in hardened contexts */
  }
  return next
}
