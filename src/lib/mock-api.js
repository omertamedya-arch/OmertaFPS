import servicesMeta from '../../shared/services.json'

const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
const HWID = 'D04D-270A-C82C-64A2'
const TOTAL_MEMORY = 32 * 1024 ** 3

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const nowIso = () => new Date().toISOString()
const clone = (value) => JSON.parse(JSON.stringify(value))

const VENDOR = ['amd', 'intel'].includes(params.get('gpu')) ? params.get('gpu') : 'nvidia'

const GPU_BY_VENDOR = {
  nvidia: {
    name: 'NVIDIA GeForce RTX 5060 Ti',
    vendor: 'nvidia',
    vendorLabel: 'NVIDIA',
    driverVersion: '32.0.16.2101',
    driverDate: '2026-09-18',
    vramBytes: 16 * 1024 ** 3,
    refreshRate: 240,
    resolution: '1920 × 1080',
    integrated: false,
    score: 5
  },
  amd: {
    name: 'AMD Radeon RX 7800 XT',
    vendor: 'amd',
    vendorLabel: 'AMD',
    driverVersion: '31.0.24027.1012',
    driverDate: '2026-08-12',
    vramBytes: 16 * 1024 ** 3,
    refreshRate: 240,
    resolution: '1920 × 1080',
    integrated: false,
    score: 4
  },
  intel: {
    name: 'Intel Arc A750 Graphics',
    vendor: 'intel',
    vendorLabel: 'Intel',
    driverVersion: '31.0.101.5333',
    driverDate: '2025-06-10',
    vramBytes: 8 * 1024 ** 3,
    refreshRate: 165,
    resolution: '1920 × 1080',
    integrated: false,
    score: 2
  }
}

const PRESETS = [
  {
    id: 'fps',
    name: 'Rekabetçi FPS',
    tag: 'Valorant · CS2 · Apex Legends',
    icon: 'crosshair',
    accent: 'volt',
    description:
      'En düşük gecikme ve en tutarlı kare süresi için arka plan kaydını, güç tasarrufunu ve görsel efektleri kapatır.',
    gain: 'Yüksek',
    effects: [
      'GameDVR ve arka plan kaydı kapatılır',
      'Yüksek performans güç planı etkinleştirilir',
      'Görsel efektler performans odaklı olur',
      'Fare ivmesi kapatılır',
      'NVIDIA güç profili uygulanır (NVIDIA varsa)'
    ],
    apply: { gameDvr: false, power: 'high', visualEffects: 'performance', mouseAcceleration: false, nvidiaProfile: true },
    nvidiaSteps: [
      'Düşük gecikme modu → Ultra',
      'Güç yönetimi → Maksimum performans',
      'Dikey eşitleme → Kapalı',
      'Doku süzme kalitesi → Yüksek Performans'
    ],
    amdSteps: [
      'Radeon Anti-Lag → Açık',
      'Radeon Chill → Kapalı',
      'Radeon Boost → Kapalı (tutarlı kare süresi)',
      'FreeSync → Açık',
      'Görüntü keskinleştirme → %80',
      'Doku süzme kalitesi → Performans'
    ]
  },
  {
    id: 'fivem',
    name: 'FiveM / Roleplay',
    tag: 'GTA V · FiveM · rol yapma sunucuları',
    icon: 'gamepad',
    accent: 'rose',
    description:
      'FiveM, GTA V motorunu modlarla çalıştırdığı için CPU ve disk yükü yüksektir. Arka plan kaydını kapatır, güç planını yükseltir; görüntü ve fare ayarlarını korur.',
    gain: 'Orta-yüksek',
    effects: [
      'GameDVR ve arka plan kaydı kapatılır',
      'Yüksek performans güç planı etkinleştirilir',
      'Görsel efektler ve fare ayarları korunur',
      'FiveM işlem önceliği yükseltilir (kuruluysa)',
      'NVIDIA güç profili uygulanır (NVIDIA varsa)'
    ],
    apply: { gameDvr: false, power: 'high', visualEffects: null, mouseAcceleration: null, nvidiaProfile: true },
    note: 'FiveM açıkken işlem önceliği otomatik yükseltilir. Defender istisnası isteğe bağlıdır; yalnızca profili uygularken açtığın kutuda eklenir.',
    nvidiaSteps: [
      'Güç yönetimi → Maksimum performans',
      'Düşük gecikme modu → Açık',
      'Dikey eşitleme → Kapalı',
      'Doku süzme kalitesi → Kalite'
    ],
    amdSteps: [
      'Radeon Anti-Lag → Açık',
      'Radeon Chill → Kapalı',
      'FreeSync → Açık',
      'Doku süzme kalitesi → Kalite',
      'Radeon Boost → Kapalı'
    ]
  },
  {
    id: 'moba',
    name: 'MOBA',
    tag: 'League of Legends · Dota 2',
    icon: 'swords',
    accent: 'ion',
    description:
      'Takım savaşlarında kare düşüşlerini azaltır; kayıt araçlarını kapatır ve işlemcinin oyun iş parçacıklarına daha fazla zaman ayırmasını sağlar.',
    gain: 'Orta-yüksek',
    effects: [
      'GameDVR ve arka plan kaydı kapatılır',
      'Yüksek performans güç planı etkinleştirilir',
      'Görsel efektler performans odaklı olur',
      'Fare ivmesi kapatılır',
      'NVIDIA güç profili uygulanır (NVIDIA varsa)'
    ],
    apply: { gameDvr: false, power: 'high', visualEffects: 'performance', mouseAcceleration: false, nvidiaProfile: true },
    nvidiaSteps: [
      'Düşük gecikme modu → Açık',
      'Güç yönetimi → Maksimum performans',
      'Dikey eşitleme → Kapalı',
      'Doku süzme kalitesi → Kalite'
    ],
    amdSteps: [
      'Radeon Anti-Lag → Açık',
      'Radeon Chill → Kapalı',
      'FreeSync → Açık',
      'Görüntü keskinleştirme → %60',
      'Doku süzme kalitesi → Kalite'
    ]
  },
  {
    id: 'story',
    name: 'Hikayeli / AAA',
    tag: 'Cyberpunk 2077 · RDR2 · Hogwarts Legacy',
    icon: 'film',
    accent: 'violet',
    description:
      'Görüntü kalitesini korurken arka plan yükünü azaltır. Görsel efektler ve fare ayarlarına dokunmaz; sürücü güç profilini oyun için hazırlar.',
    gain: 'Orta',
    effects: [
      'GameDVR ve arka plan kaydı kapatılır',
      'Yüksek performans güç planı etkinleştirilir',
      'Görsel efektler ve fare ayarları korunur',
      'NVIDIA güç profili uygulanır (NVIDIA varsa)'
    ],
    apply: { gameDvr: false, power: 'high', visualEffects: null, mouseAcceleration: null, nvidiaProfile: true },
    nvidiaSteps: [
      'Güç yönetimi → Maksimum performans',
      'Dikey eşitleme → Açık',
      'G-Sync → Açık (destekliyorsa)',
      'Doku süzme kalitesi → Kalite'
    ],
    amdSteps: [
      'Radeon Chill → Kapalı',
      'FreeSync → Açık',
      'Görüntü keskinliği → %40',
      'Doku süzme kalitesi → Kalite',
      'Radeon Anti-Lag → Açık'
    ]
  },
  {
    id: 'sim',
    name: 'Simülasyon / Strateji',
    tag: 'Cities: Skylines II · Total War',
    icon: 'cpu',
    accent: 'amber',
    description:
      'CPU ve bellek ağırlıklı oyunlarda arka plan yükünü azaltır; kayıt araçlarını kapatır ve güç planını yüksek performansa alır.',
    gain: 'Orta',
    effects: [
      'GameDVR ve arka plan kaydı kapatılır',
      'Yüksek performans güç planı etkinleştirilir',
      'Görsel efektler ve fare ayarları korunur',
      'NVIDIA güç profili uygulanır (NVIDIA varsa)'
    ],
    apply: { gameDvr: false, power: 'high', visualEffects: null, mouseAcceleration: null, nvidiaProfile: true },
    nvidiaSteps: [
      'Güç yönetimi → Maksimum performans',
      'Düşük gecikme modu → Kapalı',
      'Doku süzme kalitesi → Kalite'
    ],
    amdSteps: [
      'Radeon Chill → Kapalı',
      'FreeSync → Açık',
      'Doku süzme kalitesi → Kalite',
      'Radeon Anti-Lag → Açık'
    ]
  }
]

const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]))

let admin = params.get('admin') !== '0'
let licensed = params.get('licensed') === '1'
let license = licensed
  ? {
      key: 'OMRT-****-****-PREV',
      hwid: HWID,
      activatedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      status: 'active'
    }
  : null

const gateError = (module) =>
  licensed
    ? null
    : {
        ok: false,
        code: 'license-required',
        module,
        error: 'Bu işlem Omerta FPS Pro lisansı gerektiriyor.'
      }

let usedBytes = 10.8 * 1024 ** 3
let standbyBytes = 5.4 * 1024 ** 3

let scanItems = [
  {
    id: 'userTemp',
    label: 'Kullanıcı Geçici Dosyaları',
    path: 'C:\\Users\\Kullanıcı\\AppData\\Local\\Temp',
    size: 2.36 * 1024 ** 3,
    files: 6104,
    exists: true
  },
  {
    id: 'windowsTemp',
    label: 'Windows Geçici Dosyaları',
    path: 'C:\\Windows\\Temp',
    size: 236 * 1024 ** 2,
    files: 318,
    exists: true
  },
  {
    id: 'prefetch',
    label: 'Prefetch Önbelleği',
    path: 'C:\\Windows\\Prefetch',
    size: 92 * 1024 ** 2,
    files: 147,
    exists: true
  }
]

let previewServices = servicesMeta.map((meta) => ({
  ...meta,
  enabled: true,
  running: true,
  startMode: meta.kind === 'service' ? 'Auto' : 'Etkin',
  stateLabel: meta.kind === 'service' ? 'Çalışıyor' : 'Etkin',
  missing: false
}))

let scanState = {
  gameDvr: true,
  powerHigh: false,
  startupCount: 10
}

let profileState = {
  activeProfile: null,
  appliedAt: null,
  source: null,
  backup: null
}

let settingsState = {
  startWithWindows: false,
  restorePointBeforeApply: true,
  autoProfile: { enabled: false, presetId: 'auto' },
  overlay: {
    displayId: 'primary',
    fps: { enabled: false, color: '#9FE8C8', opacity: 0.75, fontSize: 13 },
    crosshair: {
      enabled: false,
      style: 'cross',
      color: '#EAF6FF',
      opacity: 0.9,
      size: 10,
      thickness: 2,
      gap: 5,
      outline: true
    }
  }
}

const MOCK_DISPLAYS = [
  { id: 'primary', label: 'Ekran 1 (1920×1080)', primary: true },
  { id: '2', label: 'Ekran 2 (2560×1440)', primary: false }
]

let restoreMock = { supported: true, last: null }

let networkState = {
  interfaces: [
    {
      name: 'Ethernet',
      guid: '{8C2E4A10-4C3B-4F1E-9A6D-2B7C1F0A5D11}',
      description: 'Realtek PCIe 2.5GbE Family Controller',
      status: 'Up',
      linkSpeed: '2.5 Gbps',
      tcpNoDelay: null,
      tcpAckFrequency: null,
      tcpDelAckTicks: null,
      tuned: false
    },
    {
      name: 'Wi-Fi',
      guid: '{2F9B7C64-1E0A-4D8B-A3C5-7E6D9B2A4F30}',
      description: 'Intel Wi-Fi 6E AX211 160MHz',
      status: 'Up',
      linkSpeed: '1.2 Gbps',
      tcpNoDelay: null,
      tcpAckFrequency: null,
      tcpDelAckTicks: null,
      tuned: false
    }
  ],
  backup: null
}

function networkStatusPayload() {
  const interfaces = clone(networkState.interfaces)
  return {
    ok: true,
    interfaces,
    active: interfaces.some((item) => item.tuned),
    tunedCount: interfaces.filter((item) => item.tuned).length,
    backup: networkState.backup,
    requiresRestart: true
  }
}

const RESOLUTION_MODES = [
  { width: 1600, height: 1200 },
  { width: 1440, height: 1080 },
  { width: 1280, height: 960 },
  { width: 1152, height: 864 },
  { width: 1024, height: 768 },
  { width: 960, height: 720 },
  { width: 800, height: 600 },
  { width: 640, height: 480 }
]

let timerState = {
  supported: true,
  running: false,
  active: false,
  currentMs: 15.625,
  minimumMs: 0.5,
  maximumMs: 15.625,
  targetMs: 0.5,
  startedAt: null
}

let fivemState = {
  found: true,
  path: 'C:\\Users\\Kullanıcı\\AppData\\Local\\FiveM\\FiveM.app\\FiveM.exe',
  folder: 'C:\\Users\\Kullanıcı\\AppData\\Local\\FiveM\\FiveM.app',
  running: false,
  processId: null,
  priority: null,
  priorityHigh: false,
  exclusion: false,
  managedExclusion: false,
  defenderAvailable: true,
  defenderRunning: true,
  appliedAt: null,
  warning:
    'FiveM klasörünü Defender taramasından çıkarmak, bu klasördeki dosyaların taranmaması demektir. Yalnızca güvendiğin sunucularda kullan.'
}

let suspendState = {
  enabled: false,
  active: false,
  items: [],
  game: null,
  activatedAt: null,
  running: []
}

const SAFE_NAMES = ['chrome', 'msedge', 'firefox', 'OneDrive', 'Dropbox', 'notion', 'slack', 'Telegram']

let resolutionMock = {
  enabled: false,
  target: { width: 1280, height: 960 },
  backup: null,
  appliedAt: null,
  current: { width: 1920, height: 1080, frequency: 240 },
  modes: RESOLUTION_MODES,
  warning:
    'Çözünürlük değişimi ekranda kısa süreli kararma veya titreme yapabilir. Oyun kapanınca özgün çözünürlük geri yüklenir.'
}

function timerPayload() {
  return { ok: true, ...timerState }
}

function fivemPayload() {
  return { ok: true, ...fivemState }
}

function suspendPayload() {
  return {
    ok: true,
    ...suspendState,
    count: suspendState.items.length,
    safeNames: SAFE_NAMES
  }
}

function resolutionPayload() {
  const active =
    resolutionMock.current.width === resolutionMock.target.width &&
    resolutionMock.current.height === resolutionMock.target.height
  return { ok: true, ...clone(resolutionMock), active }
}

const nisSteps = [
  'NVIDIA Denetim Masası → 3D Ayarlarının Yönetilmesi → Genel Ayarlar bölümünü aç.',
  'Görüntü Ölçeklendirme (Image Scaling) seçeneğini Açık yap.',
  'Keskinleştirme (Sharpening) değerini %50–70 aralığına getir.',
  'Ölçeklendirme yönlendirmesini "Tam ekran" olarak seç ve Uygula.',
  'Oyun içi çözünürlüğü %77–85 ölçeğe indir (ör. 1080p için 1440×810).',
  'Oyunu yeniden başlatıp görüntü netliğini ve FPS artışını kontrol et.'
]

const nvidiaPreset = GPU_BY_VENDOR.nvidia

let nvidiaState = {
  gpuName: nvidiaPreset.name,
  driverVersion: nvidiaPreset.driverVersion,
  keyPath:
    'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}\\0000',
  gpuKeyName: '0000',
  values: {
    PowerMizerEnable: null,
    PowerMizerLevel: null,
    PowerMizerLevelAC: null,
    PerfLevelSrc: null,
    DisableDynamicPstate: null
  },
  settings: {
    powerManagement: false,
    dynamicPstateOff: false,
    perfLevelPinned: false
  },
  active: false,
  hasBackup: false,
  backupAt: null
}

let activity = [
  {
    id: 'preview-3',
    at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    kind: 'cleanup',
    title: 'Geçici dosyalar temizlendi',
    detail: '412 MB alan açıldı',
    status: 'success'
  },
  {
    id: 'preview-2',
    at: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    kind: 'service',
    title: 'Windows Arama: devre dışı bırakıldı',
    detail: 'WSearch',
    status: 'success'
  },
  {
    id: 'preview-1',
    at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    kind: 'license',
    title: 'Lisans etkinleştirildi',
    detail: `Donanım: ${HWID}`,
    status: 'success'
  }
]

const progressListeners = new Set()
const scanListeners = new Set()
const esportsListeners = new Set()
const updaterListeners = new Set()

const emitProgress = (payload) => progressListeners.forEach((listener) => listener(payload))
const emitScan = (payload) => scanListeners.forEach((listener) => listener(payload))
const emitEsports = (payload) => esportsListeners.forEach((listener) => listener(payload))

let updaterState = { state: 'idle', currentVersion: '1.2.0' }
let updaterTimer = null
const emitUpdater = (payload) => {
  updaterState = { ...updaterState, ...payload }
  updaterListeners.forEach((listener) => listener(updaterState))
}

function runUpdaterDemo() {
  if (updaterTimer) return
  emitUpdater({ state: 'available', version: '1.3.0', percent: 0 })
  let percent = 0
  updaterTimer = setInterval(() => {
    percent = Math.min(100, percent + 8 + Math.round(Math.random() * 8))
    if (percent >= 100) {
      clearInterval(updaterTimer)
      updaterTimer = null
      emitUpdater({ state: 'ready', version: '1.3.0', percent: 100, total: 142 * 1024 * 1024 })
      return
    }
    emitUpdater({
      state: 'downloading',
      version: '1.3.0',
      percent,
      total: 142 * 1024 * 1024,
      bytesPerSecond: 5.2 * 1024 * 1024
    })
  }, 900)
}

function pushActivity(entry) {
  activity = [
    {
      id: `preview-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: nowIso(),
      status: 'success',
      ...entry
    },
    ...activity
  ].slice(0, 12)
}

function memoryStats(includeStandby = true) {
  const available = Math.max(0, TOTAL_MEMORY - usedBytes)
  return {
    memory: {
      total: TOTAL_MEMORY,
      available,
      used: usedBytes,
      percent: Math.round((usedBytes / TOTAL_MEMORY) * 100)
    },
    standbyBytes: includeStandby ? standbyBytes : null,
    cpu: 'Intel Core i5-9400F CPU @ 2.90GHz',
    cpuCores: 6,
    uptime: 86400 * 2 + 3600 * 5 + 60 * 24,
    gpu: GPU_BY_VENDOR[VENDOR].name,
    gpuDriver: GPU_BY_VENDOR[VENDOR].driverVersion,
    osName: 'Microsoft Windows 10 Pro',
    build: '19045',
    hostname: 'DESKTOP-2VHL97T',
    at: nowIso()
  }
}

function maskKey(value) {
  const raw = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  return `${raw.slice(0, 4)}-****-****-${raw.slice(12, 16)}`
}

function gb(bytes) {
  return (Number(bytes) || 0) / 1024 ** 3
}

function formatGb(bytes) {
  return `${gb(bytes).toFixed(1).replace('.', ',')} GB`
}

function buildHardwareRecommendations(primaryGpu) {
  const items = []

  items.push({
    id: 'ram-speed',
    tone: 'info',
    title: 'Bellek 2666 MHz çalışıyor',
    text: 'BIOS içindeki XMP profili kapalı olabilir. Desteklenen hızı açmak CPU ağırlıklı oyunlarda kare hızını artırabilir.'
  })

  if (primaryGpu.vendor === 'nvidia') {
    items.push({
      id: 'gpu-nvidia',
      tone: 'info',
      title: 'NVIDIA sürücü profili kullanılabilir',
      text: 'Güç yönetimi maksimum performansa alınabilir; oyun türü profilleri GameDVR, güç planı ve gecikme ayarlarını birlikte düzenler.'
    })
  } else if (primaryGpu.vendor === 'amd') {
    items.push({
      id: 'gpu-amd',
      tone: 'info',
      title: 'AMD Adrenalin ayarları hazır',
      text: 'Radeon Anti-Lag, Chill, FreeSync ve doku kalitesi önerileri oyun türüne göre hazırlandı. Sürücü ayarları AMD Software üzerinden tek tıkla uygulanır.'
    })
  } else if (primaryGpu.integrated) {
    items.push({
      id: 'gpu-integrated',
      tone: 'warning',
      title: 'Entegre grafik birimi kullanılıyor',
      text: 'FPS artışı sınırlıdır. 720p/900p çözünürlük, FSR veya oyun içi ölçekleme ve düşük gölge ayarları en gerçekçi beklentidir.'
    })
  }

  const driverAge = Math.floor((Date.now() - new Date(primaryGpu.driverDate).getTime()) / 86400000)
  if (Number.isFinite(driverAge) && driverAge > 365) {
    items.push({
      id: 'gpu-driver',
      tone: 'warning',
      title: 'Ekran kartı sürücüsü eski',
      text: `Sürücü ${Math.round(driverAge / 30)} aydır güncellenmemiş. Yeni oyunlar için üreticinin güncel sürücüsünü kur.`
    })
  }

  return items
}

const gpu = GPU_BY_VENDOR[VENDOR]

const hardwareState = {
  cpu: {
    name: 'Intel Core i5-9400F CPU @ 2.90GHz',
    cores: 6,
    threads: 6,
    maxClockMhz: 2900
  },
  memory: {
    totalBytes: TOTAL_MEMORY,
    totalGb: 32,
    moduleCount: 2,
    modules: [
      {
        capacity: 16 * 1024 ** 3,
        speedMhz: 2666,
        typeCode: 26,
        typeLabel: 'DDR4',
        manufacturer: 'Corsair',
        partNumber: 'CMK16GX4M1A2666C16'
      },
      {
        capacity: 16 * 1024 ** 3,
        speedMhz: 2666,
        typeCode: 26,
        typeLabel: 'DDR4',
        manufacturer: 'Corsair',
        partNumber: 'CMK16GX4M1A2666C16'
      }
    ],
    speedMhz: 2666,
    typeLabel: 'DDR4'
  },
  gpu: gpu,
  gpus: [gpu],
  storage: {
    name: 'Samsung SSD 990 EVO 1TB',
    media: 'SSD',
    bus: 'NVMe',
    sizeBytes: 1000 * 1024 ** 3,
    freePercent: 33,
    systemSizeBytes: 1000 * 1024 ** 3,
    systemFreeBytes: 330 * 1024 ** 3
  },
  display: {
    refreshRate: gpu.refreshRate,
    resolution: gpu.resolution
  },
  board: {
    vendor: 'ASUSTeK COMPUTER INC.',
    name: 'PRIME B365M-A',
    manufacturer: 'System manufacturer',
    model: 'System Product Name'
  },
  os: {
    name: 'Microsoft Windows 10 Pro',
    build: '19045',
    version: '10.0.19045',
    arch: 'x64',
    hostname: 'DESKTOP-2VHL97T'
  },
  tier:
    VENDOR === 'intel'
      ? { id: 'mid', label: 'Orta seviye', tone: 'neutral' }
      : { id: 'upper', label: 'Orta-üst', tone: 'ion' },
  score: VENDOR === 'intel' ? 5 : 8,
  recommendations: buildHardwareRecommendations(gpu)
}

function vendorSummary() {
  return {
    id: gpu.vendor,
    label: gpu.vendorLabel,
    name: gpu.name,
    integrated: Boolean(gpu.integrated),
    driverVersion: gpu.driverVersion,
    driverDate: gpu.driverDate,
    hasNvidia: gpu.vendor === 'nvidia',
    hasAmd: gpu.vendor === 'amd'
  }
}

function withVendor(preset, vendor) {
  const steps =
    vendor.id === 'amd'
      ? preset.amdSteps
      : vendor.id === 'intel'
        ? [
            'Intel Arc Kontrol Merkezi → Oyun modu',
            'Güç yönetimi → Maksimum performans',
            'Dikey eşitleme → Kapalı (rekabetçi)',
            'XeSS/FSR → Kaliteli veya Dengeli'
          ]
        : preset.nvidiaSteps

  return {
    ...preset,
    vendorSteps: steps,
    vendorStepsTitle:
      vendor.id === 'amd'
        ? 'AMD Software önerileri'
        : vendor.id === 'intel'
          ? 'Intel Arc önerileri'
          : vendor.id === 'nvidia'
            ? 'NVIDIA panel önerileri'
            : 'Sürücü önerileri',
    driverProfileAuto: preset.apply.nvidiaProfile && vendor.hasNvidia,
    driverProfileNote:
      preset.apply.nvidiaProfile && vendor.hasNvidia
        ? 'NVIDIA güç profili bu profille otomatik uygulanır.'
        : vendor.id === 'amd'
          ? 'AMD sürücü ayarları kayıt defterinden güvenli yazılamaz; panelden tek tıkla uygulanır.'
          : 'Sürücü paneli ayarları elle uygulanır.'
  }
}

function profileStatus() {
  const vendor = vendorSummary()
  const activePreset = profileState.activeProfile ? PRESET_BY_ID.get(profileState.activeProfile) : null

  return {
    presets: PRESETS.map((preset) => withVendor(preset, vendor)),
    vendor,
    hardware: {
      cpu: hardwareState.cpu.name,
      cpuThreads: hardwareState.cpu.threads,
      memoryGb: hardwareState.memory.totalGb,
      storage: hardwareState.storage.media,
      tier: hardwareState.tier
    },
    activeProfile: activePreset ? withVendor(activePreset, vendor) : null,
    appliedAt: profileState.appliedAt,
    source: profileState.source || null,
    hasBackup: Boolean(profileState.backup),
    nvidiaApplied: Boolean(profileState.backup?.nvidiaApplied),
    fivemApplied: Boolean(profileState.backup?.fivem?.applied),
    autoProfile: { ...settingsState.autoProfile },
    restorePoint: clone(restoreMock)
  }
}

function resetNvidiaProfile() {
  nvidiaState = {
    ...nvidiaState,
    active: false,
    hasBackup: false,
    backupAt: null,
    settings: { powerManagement: false, dynamicPstateOff: false, perfLevelPinned: false },
    values: {
      PowerMizerEnable: null,
      PowerMizerLevel: null,
      PowerMizerLevelAC: null,
      PerfLevelSrc: null,
      DisableDynamicPstate: null
    }
  }
}

function buildScanResult(startedAt) {
  const findings = []
  const tempBytes = scanItems
    .filter((item) => item.id !== 'prefetch')
    .reduce((sum, item) => sum + Number(item.size || 0), 0)
  const prefetchBytes = scanItems.find((item) => item.id === 'prefetch')?.size || 0

  if (tempBytes > 1.5 * 1024 ** 3) {
    findings.push({
      id: 'temp-large',
      severity: 'warning',
      category: 'Temizlik',
      title: `${formatGb(tempBytes)} geçici dosya birikmiş`,
      detail: 'Kullanıcı ve Windows Temp klasörlerinde gereksiz kurulum artıkları ve önbellek dosyaları var.',
      recommendation: 'Geçici dosyaları temizlemek disk alanı açar ve dosya erişimini hızlandırır.',
      action: { type: 'fix', id: 'cleanTemp', label: 'Geçici dosyaları temizle' }
    })
  } else if (tempBytes > 350 * 1024 ** 2) {
    findings.push({
      id: 'temp-moderate',
      severity: 'info',
      category: 'Temizlik',
      title: `${formatGb(tempBytes)} geçici dosya`,
      detail: 'Temp klasörlerinde orta düzeyde birikim var.',
      recommendation: 'Uygun bir zamanda temizlik çalıştırmak yeterli.',
      action: { type: 'fix', id: 'cleanTemp', label: 'Temizle' }
    })
  } else {
    findings.push({
      id: 'temp-clean',
      severity: 'good',
      category: 'Temizlik',
      title: 'Geçici dosyalar temiz',
      detail: `Temp konumlarında yalnızca ${formatGb(tempBytes)} veri var.`,
      recommendation: null,
      action: { type: 'navigate', target: 'cleanup', label: 'Temizlik modülü' }
    })
  }

  if (standbyBytes > 3 * 1024 ** 3) {
    findings.push({
      id: 'standby-high',
      severity: 'warning',
      category: 'Bellek',
      title: `${formatGb(standbyBytes)} bekleyen bellek`,
      detail: 'Windows önbellek için ayırdığı standby sayfaları oyunlara daha az boş RAM bırakıyor.',
      recommendation: 'Oyun öncesinde bekleyen belleği boşaltmak yeni uygulamalar için alan açar.',
      action: { type: 'fix', id: 'purgeStandby', label: 'Belleği rahatlat' }
    })
  } else if (standbyBytes > 1024 ** 3) {
    findings.push({
      id: 'standby-moderate',
      severity: 'info',
      category: 'Bellek',
      title: `${formatGb(standbyBytes)} bekleyen bellek`,
      detail: 'Standby önbelleği normal aralıkta; yoğun oyun öncesinde temizlenebilir.',
      recommendation: 'Sorun yok, isteğe bağlı olarak rahatlatma çalıştırabilirsin.',
      action: { type: 'fix', id: 'purgeStandby', label: 'Belleği temizle' }
    })
  }

  const memoryPercent = Math.round((usedBytes / TOTAL_MEMORY) * 100)
  if (memoryPercent >= 75) {
    findings.push({
      id: 'ram-high',
      severity: 'warning',
      category: 'Bellek',
      title: `RAM kullanımı %${memoryPercent}`,
      detail: 'Bellek doluluğu yüksek; oyun sırasında takılmalar görülebilir.',
      recommendation: 'Gereksiz arka plan uygulamalarını kapat ve RAM bakımını çalıştır.',
      action: { type: 'navigate', target: 'ram', label: 'RAM bakımı' }
    })
  } else {
    findings.push({
      id: 'ram-ok',
      severity: 'good',
      category: 'Bellek',
      title: `RAM kullanımı %${memoryPercent}`,
      detail: `${formatGb(TOTAL_MEMORY - usedBytes)} bellek kullanılabilir.`,
      recommendation: null,
      action: { type: 'navigate', target: 'ram', label: 'RAM bakımı' }
    })
  }

  const enabledRecommended = previewServices.filter(
    (item) => !item.missing && item.recommendedOff && item.enabled
  )
  if (enabledRecommended.length >= 4) {
    findings.push({
      id: 'services-many',
      severity: 'warning',
      category: 'Hizmetler',
      title: `${enabledRecommended.length} gereksiz Windows bileşeni açık`,
      detail: enabledRecommended
        .slice(0, 4)
        .map((item) => item.name)
        .join(', '),
      recommendation: 'Telemetri, Xbox ve arka plan arama bileşenlerini kapatmak CPU/disk yükünü azaltır.',
      action: { type: 'navigate', target: 'services', label: 'Hizmetleri yönet' }
    })
  } else if (enabledRecommended.length > 0) {
    findings.push({
      id: 'services-some',
      severity: 'info',
      category: 'Hizmetler',
      title: `${enabledRecommended.length} bileşen kapatılabilir`,
      detail: enabledRecommended.map((item) => item.name).join(', '),
      recommendation: 'Oyun odaklı kullanımda bu bileşenlerin kapatılması önerilir.',
      action: { type: 'navigate', target: 'services', label: 'Hizmetleri yönet' }
    })
  } else {
    findings.push({
      id: 'services-clean',
      severity: 'good',
      category: 'Hizmetler',
      title: 'Gereksiz Windows bileşenleri kapalı',
      detail: 'Önerilen bileşenlerin tamamı devre dışı.',
      recommendation: null,
      action: { type: 'navigate', target: 'services', label: 'Hizmetleri yönet' }
    })
  }

  if (!scanState.gameDvr) {
    findings.push({
      id: 'gamedvr-off',
      severity: 'good',
      category: 'Oyun',
      title: 'GameDVR arka plan kaydı kapalı',
      detail: 'Kayıt servisi oyun sırasında ek yük oluşturmuyor.',
      recommendation: null,
      action: { type: 'navigate', target: 'profiles', label: 'Oyun profilleri' }
    })
  } else {
    findings.push({
      id: 'gamedvr-on',
      severity: 'warning',
      category: 'Oyun',
      title: 'GameDVR arka plan kaydı açık',
      detail: 'Windows, oyun görüntüsünü arka planda kaydederek GPU ve disk kullanabilir.',
      recommendation: "Oyun profillerinden GameDVR'ı kapatabilirsin.",
      action: { type: 'navigate', target: 'profiles', label: 'Profil uygula' }
    })
  }

  if (scanState.powerHigh) {
    findings.push({
      id: 'power-high',
      severity: 'good',
      category: 'Sistem',
      title: 'Yüksek performans güç planı aktif',
      detail: 'İşlemci güç tasarrufu oyun sırasında devreye girmiyor.',
      recommendation: null,
      action: { type: 'navigate', target: 'profiles', label: 'Oyun profilleri' }
    })
  } else {
    findings.push({
      id: 'power-balanced',
      severity: 'info',
      category: 'Sistem',
      title: 'Güç planı: Dengeli',
      detail: 'Dengeli plan oyunlarda işlemci frekansını sınırlayabilir.',
      recommendation: 'Rekabetçi oyunlar için yüksek performans planı önerilir.',
      action: { type: 'navigate', target: 'profiles', label: 'Profil uygula' }
    })
  }

  if (scanState.startupCount >= 10) {
    findings.push({
      id: 'startup-many',
      severity: 'warning',
      category: 'Sistem',
      title: `${scanState.startupCount} başlangıç öğesi`,
      detail: 'Steam, Discord, OneDrive, Spotify gibi uygulamalar açılışta otomatik başlıyor.',
      recommendation: 'Görev Yöneticisi > Başlangıç sekmesinden kullanmadıklarını devre dışı bırak.',
      action: null
    })
  } else if (scanState.startupCount > 6) {
    findings.push({
      id: 'startup-some',
      severity: 'info',
      category: 'Sistem',
      title: `${scanState.startupCount} başlangıç öğesi`,
      detail: 'Açılışta çalışan uygulamalar arka planda bellek tüketir.',
      recommendation: 'Kullanmadığın başlangıç uygulamalarını devre dışı bırak.',
      action: null
    })
  } else {
    findings.push({
      id: 'startup-ok',
      severity: 'good',
      category: 'Sistem',
      title: 'Başlangıç listesi sade',
      detail: `${scanState.startupCount} otomatik başlangıç öğesi algılandı.`,
      recommendation: null,
      action: null
    })
  }

  if (gpu.vendor === 'nvidia') {
    if (nvidiaState.active) {
      findings.push({
        id: 'nvidia-active',
        severity: 'good',
        category: 'GPU',
        title: 'NVIDIA maksimum performans profili aktif',
        detail: nvidiaState.gpuName,
        recommendation: null,
        action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
      })
    } else {
      findings.push({
        id: 'nvidia-default',
        severity: 'info',
        category: 'GPU',
        title: 'NVIDIA sürücü profili varsayılan',
        detail: 'Güç yönetimi maksimum performansa sabitlenmemiş.',
        recommendation: 'Oyun profilleri veya GPU merkezi ile güç profilini uygula.',
        action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
      })
    }
  } else if (gpu.vendor === 'amd') {
    findings.push({
      id: 'amd-guide',
      severity: 'info',
      category: 'GPU',
      title: 'AMD Adrenalin ayarları hazır',
      detail: gpu.name,
      recommendation: 'Radeon Anti-Lag, Chill ve FreeSync önerileri GPU merkezinde.',
      action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
    })
  }

  const driverAgeDays = Math.floor((Date.now() - new Date(gpu.driverDate).getTime()) / 86400000)
  if (Number.isFinite(driverAgeDays) && driverAgeDays > 365) {
    findings.push({
      id: 'driver-old',
      severity: 'warning',
      category: 'GPU',
      title: 'Ekran kartı sürücüsü eski',
      detail: `Sürücü yaklaşık ${Math.round(driverAgeDays / 30)} aydır güncellenmemiş.`,
      recommendation: 'Üreticinin güncel sürücüsünü kur; yeni oyunlarda belirgin fark yaratır.',
      action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
    })
  }

  const severityOrder = { critical: 0, warning: 1, info: 2, good: 3 }
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  const counts = findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1
      return acc
    },
    { critical: 0, warning: 0, info: 0, good: 0 }
  )

  const weight = { critical: 16, warning: 8, info: 2, good: 0 }
  const penalty = findings.reduce((sum, finding) => sum + weight[finding.severity], 0)
  const score = Math.max(0, Math.min(100, 100 - penalty))

  return {
    scannedAt: nowIso(),
    durationMs: Date.now() - startedAt,
    score,
    counts,
    findings,
    quickActions: [
      ...(tempBytes > 0 ? [{ id: 'cleanTemp', label: 'Geçici dosyaları temizle' }] : []),
      ...(standbyBytes > 0 ? [{ id: 'purgeStandby', label: 'Bekleyen belleği boşalt' }] : [])
    ],
    hardware: {
      cpu: hardwareState.cpu,
      memory: {
        totalGb: hardwareState.memory.totalGb,
        speedMhz: hardwareState.memory.speedMhz,
        typeLabel: hardwareState.memory.typeLabel,
        moduleCount: hardwareState.memory.moduleCount
      },
      gpu: hardwareState.gpu,
      gpus: hardwareState.gpus,
      storage: hardwareState.storage,
      display: hardwareState.display,
      os: hardwareState.os,
      board: hardwareState.board,
      tier: hardwareState.tier
    },
    hardwareAdvice: hardwareState.recommendations,
    storage: scanItems.map((item) => ({ ...item })),
    prefetchBytes,
    startupCount: scanState.startupCount
  }
}

export function createMockApi() {
  return {
    async bootstrap() {
      await wait(320)
      return {
        ok: true,
        admin,
        licensed: admin ? licensed : false,
        license: admin ? license : null,
        hwid: HWID,
        licenseReady: true,
        licenseError: null,
        system: {
          hostname: 'DESKTOP-2VHL97T',
          platform: 'Windows_NT 10.0.19045',
          arch: 'x64',
          totalMemory: TOTAL_MEMORY
        },
        product: 'Omerta FPS Pro',
        plan: licensed ? 'pro' : 'free',
        theme: null,
        version: '1.2.0'
      }
    },

    async setTheme(theme) {
      return { ok: true, theme: String(theme || 'dark') }
    },

    async relaunchAdmin() {
      await wait(500)
      admin = true
      return { ok: true, started: true }
    },

    async quit() {
      return { ok: true, quitting: true }
    },

    async copy(text) {
      try {
        await navigator.clipboard.writeText(String(text))
      } catch {
        /* clipboard may be blocked in preview */
      }
      return { ok: true, copied: true }
    },

    async activateLicense(key) {
      await wait(900)
      const raw = String(key || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
      if (raw.length !== 16) {
        throw new Error('Lisans anahtarı ABCD-1234-EFGH-5678 biçiminde olmalı.')
      }
      if (raw === '0000000000000000') {
        throw new Error('Bu lisans anahtarı geçersiz. Anahtarı kontrol edip tekrar deneyin.')
      }
      licensed = true
      license = {
        key: maskKey(raw),
        hwid: HWID,
        activatedAt: nowIso(),
        status: 'active'
      }
      pushActivity({ kind: 'license', title: 'Lisans etkinleştirildi', detail: `Donanım: ${HWID}` })
      return { ok: true, license }
    },

    async logout() {
      licensed = false
      license = null
      return { ok: true }
    },

    hardware: {
      async detect() {
        await wait(420)
        return clone(hardwareState)
      }
    },

    services: {
      async list() {
        await wait(420)
        return { ok: true, items: previewServices.map((item) => ({ ...item })) }
      },
      async set(id, enabled) {
        if (enabled !== true) {
          const blocked = gateError('services')
          if (blocked) return blocked
        }
        await wait(650)
        const index = previewServices.findIndex((item) => item.id === id)
        if (index === -1) return { ok: false, error: 'Bilinmeyen hizmet.' }
        const meta = previewServices[index]
        const updated = {
          ...meta,
          enabled,
          running: enabled,
          startMode: meta.kind === 'service' ? (enabled ? 'Auto' : 'Disabled') : enabled ? 'Etkin' : 'Devre dışı',
          stateLabel: enabled ? (meta.kind === 'service' ? 'Çalışıyor' : 'Etkin') : 'Devre dışı'
        }
        previewServices[index] = updated
        if (id === 'GameDVR') scanState.gameDvr = enabled
        pushActivity({
          kind: 'service',
          title: `${meta.name}: ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}`,
          detail: meta.tech,
          status: 'success'
        })
        return { ok: true, service: { ...updated }, warning: null }
      }
    },

    maintenance: {
      async stats(options = {}) {
        await wait(220)
        return { ok: true, ...memoryStats(options.standby !== false) }
      },
      async scan() {
        await wait(750)
        return { ok: true, items: scanItems.map((item) => ({ ...item })) }
      },
      async clean(ids) {
        const blocked = gateError('maintenance')
        if (blocked) return blocked
        await wait(1000)
        const selected = Array.isArray(ids) && ids.length ? ids : scanItems.map((item) => item.id)
        let freedBytes = 0
        const results = scanItems.map((item) => {
          const cleaned = selected.includes(item.id)
          const freed = cleaned ? item.size : 0
          freedBytes += freed
          if (cleaned) {
            const index = scanItems.findIndex((entry) => entry.id === item.id)
            scanItems[index] = { ...item, size: 0, files: 0 }
          }
          return {
            id: item.id,
            label: item.label,
            path: item.path,
            freedBytes: freed,
            beforeBytes: item.size,
            afterBytes: cleaned ? 0 : item.size,
            cleaned
          }
        })
        usedBytes = Math.max(7 * 1024 ** 3, usedBytes - freedBytes * 0.12)
        if (freedBytes > 0) {
          pushActivity({
            kind: 'cleanup',
            title: 'Geçici dosyalar temizlendi',
            detail: `${Math.round(freedBytes / 1024 ** 2)} MB alan açıldı`
          })
        }
        return {
          ok: true,
          results,
          freedBytes,
          freedMb: Math.round(freedBytes / 1024 ** 2)
        }
      },
      async purge() {
        const blocked = gateError('maintenance')
        if (blocked) return blocked
        await wait(1200)
        const before = standbyBytes
        standbyBytes = 0.62 * 1024 ** 3
        const releasedBytes = Math.max(0, before - standbyBytes)
        pushActivity({
          kind: 'memory',
          title: 'Bekleyen bellek temizlendi',
          detail: `Yaklaşık ${Math.round(releasedBytes / 1024 ** 2)} MB serbest bırakıldı`
        })
        return {
          ok: true,
          purged: true,
          releasedBytes,
          releasedMb: Math.round(releasedBytes / 1024 ** 2),
          standbyBefore: before,
          standbyAfter: standbyBytes,
          availableDeltaBytes: 0
        }
      },
      async boost() {
        const blocked = gateError('maintenance')
        if (blocked) return blocked
        emitProgress({ step: 'cleanup', status: 'running' })
        await wait(1300)
        const selected = scanItems.map((item) => item.id)
        let freedBytes = 0
        scanItems = scanItems.map((item) => {
          if (!selected.includes(item.id)) return item
          freedBytes += item.size
          return { ...item, size: 0, files: 0 }
        })
        emitProgress({ step: 'cleanup', status: 'done', freedBytes })

        emitProgress({ step: 'standby', status: 'running' })
        await wait(1100)
        const before = standbyBytes
        standbyBytes = 0.62 * 1024 ** 3
        const releasedBytes = Math.max(0, before - standbyBytes)
        emitProgress({ step: 'standby', status: 'done', releasedBytes })

        usedBytes = Math.max(7 * 1024 ** 3, usedBytes - freedBytes * 0.12)
        const freedMb = Math.round(freedBytes / 1024 ** 2)
        pushActivity({
          kind: 'boost',
          title: 'Sistem rahatlatıldı',
          detail: `${freedMb} MB disk + ~${Math.round(releasedBytes / 1024 ** 2)} MB RAM`
        })

        return {
          ok: true,
          cleanup: { freedBytes, freedMb },
          purge: { releasedBytes, releasedMb: Math.round(releasedBytes / 1024 ** 2), purged: true },
          stats: memoryStats(false),
          durationMs: 2400
        }
      }
    },

    nvidia: {
      async status() {
        await wait(380)
        return {
          ok: true,
          ...nvidiaState,
          settings: { ...nvidiaState.settings },
          values: { ...nvidiaState.values }
        }
      },
      async apply() {
        const blocked = gateError('nvidia')
        if (blocked) return blocked
        await wait(900)
        nvidiaState = {
          ...nvidiaState,
          active: true,
          hasBackup: true,
          backupAt: nowIso(),
          settings: { powerManagement: true, dynamicPstateOff: true, perfLevelPinned: true },
          values: {
            PowerMizerEnable: 1,
            PowerMizerLevel: 1,
            PowerMizerLevelAC: 1,
            PerfLevelSrc: 8738,
            DisableDynamicPstate: 1
          }
        }
        pushActivity({
          kind: 'nvidia',
          title: 'NVIDIA maksimum performans profili uygulandı',
          detail: nvidiaState.gpuName
        })
        return { ok: true, info: clone(nvidiaState), requiresRestart: true }
      },
      async revert() {
        await wait(800)
        resetNvidiaProfile()
        pushActivity({
          kind: 'nvidia',
          title: 'NVIDIA ayarları varsayılana döndürüldü',
          detail: nvidiaState.gpuName,
          status: 'info'
        })
        return { ok: true, info: clone(nvidiaState), requiresRestart: true }
      },
      async openPanel() {
        await wait(400)
        return { ok: true, opened: true, target: 'NVIDIA app' }
      }
    },

    amd: {
      async status() {
        await wait(360)
        if (gpu.vendor !== 'amd') {
          return { ok: true, available: false, gpu: null, panelAvailable: false }
        }
        return {
          ok: true,
          available: true,
          gpu: clone(gpu),
          driverVersion: gpu.driverVersion,
          driverDate: gpu.driverDate,
          integrated: gpu.integrated,
          vramBytes: gpu.vramBytes,
          panelAvailable: true,
          panelTarget: 'AMD Software: Adrenalin Edition'
        }
      },
      async openPanel() {
        await wait(400)
        if (gpu.vendor !== 'amd') {
          throw new Error('AMD ekran kartı algılanamadı. Bu modül yalnızca AMD GPU bulunan sistemlerde çalışır.')
        }
        return { ok: true, opened: true, target: 'AMD Software: Adrenalin Edition' }
      }
    },

    scan: {
      async run() {
        const startedAt = Date.now()
        const steps = [
          ['hardware', gpu.name],
          ['storage', `${scanItems.length} konum`],
          ['memory', `${Math.round((usedBytes / TOTAL_MEMORY) * 100)}% dolu`],
          ['services', `${previewServices.length} bileşen`],
          ['registry', 'GameDVR ve güç planı'],
          ['startup', `${scanState.startupCount} öğe`],
          ['gpu', gpu.vendorLabel]
        ]

        for (const [step, detail] of steps) {
          emitScan({ step, status: 'running' })
          await wait(step === 'hardware' ? 420 : 260)
          emitScan({ step, status: 'done', detail })
        }

        const result = buildScanResult(startedAt)
        emitScan({ step: 'score', status: 'done', detail: `${result.score}/100` })
        return { ok: true, ...result }
      },
      async fix(id) {
        const blocked = gateError('scan')
        if (blocked) return blocked
        if (id === 'cleanTemp') {
          emitScan({ step: 'fix', status: 'running', detail: 'Geçici dosyalar temizleniyor' })
          await wait(750)
          let freedBytes = 0
          scanItems = scanItems.map((item) => {
            if (item.id === 'prefetch') return item
            freedBytes += item.size
            return { ...item, size: 0, files: 0 }
          })
          usedBytes = Math.max(7 * 1024 ** 3, usedBytes - freedBytes * 0.12)
          emitScan({ step: 'fix', status: 'done' })
          pushActivity({
            kind: 'cleanup',
            title: 'Tarama önerisi uygulandı',
            detail: `Geçici dosyalar temizlendi · ${Math.round(freedBytes / 1024 ** 2)} MB`
          })
          return {
            ok: true,
            id,
            title: 'Geçici dosyalar temizlendi',
            detail: `${Math.round(freedBytes / 1024 ** 2)} MB alan açıldı.`,
            freedBytes
          }
        }

        if (id === 'purgeStandby') {
          emitScan({ step: 'fix', status: 'running', detail: 'Bekleyen bellek boşaltılıyor' })
          await wait(700)
          const before = standbyBytes
          standbyBytes = 0.62 * 1024 ** 3
          const releasedBytes = Math.max(0, before - standbyBytes)
          emitScan({ step: 'fix', status: 'done' })
          pushActivity({
            kind: 'memory',
            title: 'Bekleyen bellek temizlendi',
            detail: `Yaklaşık ${Math.round(releasedBytes / 1024 ** 2)} MB serbest bırakıldı`
          })
          return {
            ok: true,
            id,
            title: 'Bekleyen bellek boşaltıldı',
            detail: `Yaklaşık ${Math.round(releasedBytes / 1024 ** 2)} MB RAM serbest bırakıldı.`,
            releasedBytes
          }
        }

        throw new Error('Bilinmeyen tarama düzeltmesi.')
      }
    },

    profiles: {
      async status() {
        await wait(320)
        return { ok: true, ...profileStatus() }
      },
      async apply(id, options = {}) {
        const blocked = gateError('profiles')
        if (blocked) return blocked
        await wait(800)
        const preset = PRESET_BY_ID.get(String(id || ''))
        if (!preset) throw new Error('Bilinmeyen oyun profili.')
        const source = options.source === 'auto' ? 'auto' : 'manual'

        if (profileState.activeProfile === preset.id) {
          if (source === 'manual' && profileState.source !== 'manual') {
            profileState = { ...profileState, source: 'manual' }
          }
          return { ok: true, alreadyActive: true, ...profileStatus() }
        }

        if (profileState.activeProfile && source === 'auto' && profileState.source !== 'auto') {
          return { ok: true, skipped: true, reason: 'manual-profile-active', ...profileStatus() }
        }

        if (profileState.activeProfile) {
          if (profileState.backup?.nvidiaApplied) resetNvidiaProfile()
          if (profileState.backup?.fivem?.exclusionAdded) {
            fivemState = { ...fivemState, exclusion: false, managedExclusion: false, appliedAt: null }
          }
          scanState.gameDvr = profileState.backup?.previousGameDvr ?? true
          scanState.powerHigh = profileState.backup?.previousPowerHigh ?? false
        }

        let restorePoint = null
        if (source === 'manual' && settingsState.restorePointBeforeApply) {
          restorePoint = {
            created: true,
            reason: null,
            at: nowIso(),
            description: `Omerta FPS - ${preset.name}`,
            note: null
          }
          restoreMock = { supported: true, last: restorePoint }
        }

        const backup = {
          presetId: preset.id,
          source,
          savedAt: nowIso(),
          previousGameDvr: scanState.gameDvr,
          previousPowerHigh: scanState.powerHigh,
          registryEntries: [],
          power: null,
          nvidiaApplied: false,
          fivem: null
        }

        scanState.gameDvr = preset.apply.gameDvr
        scanState.powerHigh = preset.apply.power === 'high'

        if (preset.apply.nvidiaProfile && gpu.vendor === 'nvidia') {
          nvidiaState = {
            ...nvidiaState,
            active: true,
            hasBackup: true,
            backupAt: nowIso(),
            settings: { powerManagement: true, dynamicPstateOff: true, perfLevelPinned: true },
            values: {
              PowerMizerEnable: 1,
              PowerMizerLevel: 1,
              PowerMizerLevelAC: 1,
              PerfLevelSrc: 8738,
              DisableDynamicPstate: 1
            }
          }
          backup.nvidiaApplied = true
        }

        if (preset.id === 'fivem') {
          const exclusionAdded = options.defenderExclusion === true && fivemState.found
          backup.fivem = { applied: true, exclusionAdded, priorityApplied: false }
          if (exclusionAdded) {
            fivemState = { ...fivemState, exclusion: true, managedExclusion: true, appliedAt: nowIso() }
          }
        }

        profileState = {
          activeProfile: preset.id,
          appliedAt: nowIso(),
          source,
          backup
        }

        pushActivity({
          kind: 'profile',
          title: `${preset.name} profili uygulandı`,
          detail:
            source === 'auto' ? 'Oyun algılandı · otomatik profil' : `${gpu.vendorLabel} · ${gpu.name}`,
          status: backup.nvidiaApplied ? 'warning' : 'success'
        })

        return {
          ok: true,
          applies: preset.effects,
          requiresRestart: backup.nvidiaApplied,
          checkpoint: restorePoint,
          fivemApplied: Boolean(backup.fivem?.applied),
          fivemExclusion: Boolean(backup.fivem?.exclusionAdded),
          warning: backup.nvidiaApplied
            ? 'NVIDIA sürücü ayarlarının etkinleşmesi için yeniden başlatma önerilir.'
            : null,
          ...profileStatus()
        }
      },
      async revert(options = {}) {
        await wait(700)
        if (!profileState.activeProfile) {
          return { ok: true, reverted: false, ...profileStatus() }
        }
        if (options.source && profileState.source !== options.source) {
          return { ok: true, reverted: false, skipped: true, reason: 'source-mismatch', ...profileStatus() }
        }

        const preset = PRESET_BY_ID.get(profileState.activeProfile)
        if (profileState.backup?.nvidiaApplied) resetNvidiaProfile()
        if (profileState.backup?.fivem?.exclusionAdded) {
          fivemState = { ...fivemState, exclusion: false, managedExclusion: false, appliedAt: null }
        }
        scanState.gameDvr = profileState.backup?.previousGameDvr ?? true
        scanState.powerHigh = profileState.backup?.previousPowerHigh ?? false
        const auto = profileState.source === 'auto'
        profileState = { activeProfile: null, appliedAt: null, source: null, backup: null }

        pushActivity({
          kind: 'profile',
          title: auto ? 'Otomatik oyun profili geri alındı' : 'Oyun profili geri alındı',
          detail: preset ? preset.name : 'Önceki ayarlar',
          status: 'info'
        })

        return { ok: true, reverted: true, warning: null, ...profileStatus() }
      }
    },

    network: {
      async status() {
        await wait(380)
        return networkStatusPayload()
      },
      async apply(guids) {
        const blocked = gateError('network')
        if (blocked) return blocked
        await wait(850)
        const selected = Array.isArray(guids) && guids.length ? guids : networkState.interfaces.map((item) => item.guid)
        if (!networkState.backup) {
          networkState.backup = {
            createdAt: nowIso(),
            count: networkState.interfaces.length,
            names: networkState.interfaces.map((item) => item.name)
          }
        }
        networkState.interfaces = networkState.interfaces.map((item) =>
          selected.includes(item.guid)
            ? { ...item, tcpNoDelay: 1, tcpAckFrequency: 1, tcpDelAckTicks: 0, tuned: true }
            : item
        )
        pushActivity({
          kind: 'network',
          title: 'Nagle algoritması devre dışı bırakıldı',
          detail: networkState.interfaces
            .filter((item) => selected.includes(item.guid))
            .map((item) => item.name)
            .join(', ')
        })
        return { ok: true, ...networkStatusPayload(), requiresRestart: true }
      },
      async revert() {
        await wait(700)
        networkState.interfaces = networkState.interfaces.map((item) => ({
          ...item,
          tcpNoDelay: null,
          tcpAckFrequency: null,
          tcpDelAckTicks: null,
          tuned: false
        }))
        networkState.backup = null
        pushActivity({
          kind: 'network',
          title: 'Ağ ayarları geri alındı',
          detail: 'Özgün TCP değerleri geri yüklendi',
          status: 'info'
        })
        return { ok: true, ...networkStatusPayload(), requiresRestart: true }
      },
      async flushDns() {
        await wait(650)
        pushActivity({ kind: 'network', title: 'DNS önbelleği temizlendi', detail: 'ipconfig /flushdns' })
        return { ok: true, flushed: true }
      },
      async ping() {
        await wait(1100)
        return {
          ok: true,
          results: [
            {
              target: '192.168.1.1',
              label: 'Yerel ağ geçidi',
              sent: 5,
              received: 5,
              lost: 0,
              lossPercent: 0,
              avgMs: 2,
              minMs: 1,
              maxMs: 4,
              jitterMs: 1
            },
            {
              target: '1.1.1.1',
              label: '1.1.1.1',
              sent: 5,
              received: 5,
              lost: 0,
              lossPercent: 0,
              avgMs: 18,
              minMs: 16,
              maxMs: 21,
              jitterMs: 2
            },
            {
              target: '8.8.8.8',
              label: '8.8.8.8',
              sent: 5,
              received: 5,
              lost: 0,
              lossPercent: 0,
              avgMs: 24,
              minMs: 21,
              maxMs: 29,
              jitterMs: 3
            }
          ],
          primary: '1.1.1.1',
          grade: 'excellent',
          measuredAt: nowIso()
        }
      }
    },

    timer: {
      async status() {
        await wait(260)
        return timerPayload()
      },
      async start() {
        const blocked = gateError('timer')
        if (blocked) return blocked
        await wait(900)
        timerState = {
          ...timerState,
          running: true,
          active: true,
          currentMs: 0.5,
          startedAt: nowIso()
        }
        pushActivity({
          kind: 'esports',
          title: 'Maksimum tepkime modu açıldı',
          detail: 'Zamanlayıcı 0.5 ms'
        })
        return { ...timerPayload(), started: true }
      },
      async stop() {
        await wait(500)
        timerState = {
          ...timerState,
          running: false,
          active: false,
          currentMs: 15.625,
          startedAt: null
        }
        pushActivity({
          kind: 'esports',
          title: 'Maksimum tepkime modu kapatıldı',
          detail: 'Windows varsayılan zamanlayıcısına dönüldü',
          status: 'info'
        })
        return { ...timerPayload(), stopped: true }
      }
    },

    fivem: {
      async status() {
        await wait(300)
        return fivemPayload()
      },
      async apply() {
        const blocked = gateError('fivem')
        if (blocked) return blocked
        await wait(950)
        if (!fivemState.found) {
          return { ok: false, code: 'not-found', error: 'FiveM kurulumu bulunamadı.' }
        }
        fivemState = {
          ...fivemState,
          priority: 'High',
          priorityHigh: true,
          exclusion: true,
          managedExclusion: true,
          appliedAt: nowIso(),
          warning:
            'İşlem önceliği yalnızca çalışan FiveM süreçlerine uygulanır ve kalıcı değildir. FiveM’i yeniden başlatırsan profili tekrar uygula.'
        }
        pushActivity({
          kind: 'esports',
          title: 'FiveM / Roleplay profili uygulandı',
          detail: fivemState.folder
        })
        return { ...fivemPayload(), priorityApplied: true, exclusionAdded: true }
      },
      async revert() {
        await wait(700)
        fivemState = {
          ...fivemState,
          priority: null,
          priorityHigh: false,
          exclusion: false,
          managedExclusion: false,
          appliedAt: null,
          warning:
            'FiveM klasörünü Defender taramasından çıkarmak, bu klasördeki dosyaların taranmaması demektir. Yalnızca güvendiğin sunucularda kullan.'
        }
        pushActivity({
          kind: 'esports',
          title: 'FiveM profili geri alındı',
          detail: fivemState.folder,
          status: 'info'
        })
        return { ...fivemPayload(), reverted: true }
      }
    },

    suspend: {
      async status() {
        await wait(260)
        return suspendPayload()
      },
      async enable() {
        const blocked = gateError('suspend')
        if (blocked) return blocked
        await wait(600)
        suspendState = {
          ...suspendState,
          enabled: true,
          active: true,
          items: ['chrome', 'OneDrive'],
          game: 'Counter-Strike 2',
          activatedAt: nowIso(),
          running: ['cs2']
        }
        pushActivity({
          kind: 'esports',
          title: 'Arka plan uygulamaları duraklatıldı',
          detail: '2 uygulama · Counter-Strike 2'
        })
        return { ...suspendPayload(), enabled: true }
      },
      async disable() {
        await wait(600)
        suspendState = {
          ...suspendState,
          enabled: false,
          active: false,
          items: [],
          game: null,
          activatedAt: null
        }
        pushActivity({
          kind: 'esports',
          title: 'Duraklatılan uygulamalar uyandırıldı',
          detail: '2 uygulama',
          status: 'info'
        })
        return { ...suspendPayload(), enabled: false }
      },
      async resume() {
        await wait(500)
        suspendState = { ...suspendState, active: false, items: [], game: null, activatedAt: null }
        pushActivity({
          kind: 'esports',
          title: 'Duraklatılan uygulamalar uyandırıldı',
          detail: '2 uygulama',
          status: 'info'
        })
        return suspendPayload()
      }
    },

    resolution: {
      async status() {
        await wait(380)
        return resolutionPayload()
      },
      async enable(width, height) {
        const blocked = gateError('resolution')
        if (blocked) return blocked
        await wait(500)
        const w = Number(width) || resolutionMock.target.width
        const h = Number(height) || resolutionMock.target.height
        const supported = resolutionMock.modes.some((mode) => mode.width === w && mode.height === h)
        if (!supported) {
          return { ok: false, code: 'not-supported', error: `${w}×${h} bu ekranda desteklenmiyor.` }
        }
        resolutionMock = { ...resolutionMock, enabled: true, target: { width: w, height: h } }
        return resolutionPayload()
      },
      async disable() {
        await wait(600)
        resolutionMock = {
          ...resolutionMock,
          enabled: false,
          backup: null,
          appliedAt: null,
          current: { width: 1920, height: 1080, frequency: 240 }
        }
        return resolutionPayload()
      },
      async applyNow() {
        const blocked = gateError('resolution')
        if (blocked) return blocked
        await wait(800)
        const backup =
          resolutionMock.backup || {
            width: resolutionMock.current.width,
            height: resolutionMock.current.height
          }
        resolutionMock = {
          ...resolutionMock,
          backup,
          appliedAt: nowIso(),
          current: {
            width: resolutionMock.target.width,
            height: resolutionMock.target.height,
            frequency: 240
          }
        }
        pushActivity({
          kind: 'esports',
          title: '4:3 çözünürlük uygulandı',
          detail: `${resolutionMock.target.width}×${resolutionMock.target.height}`
        })
        return resolutionPayload()
      },
      async restoreNow() {
        await wait(650)
        if (resolutionMock.backup) {
          resolutionMock = {
            ...resolutionMock,
            current: { ...resolutionMock.backup, frequency: 240 },
            backup: null,
            appliedAt: null
          }
          pushActivity({
            kind: 'esports',
            title: 'Masaüstü çözünürlüğü geri yüklendi',
            detail: `${resolutionMock.current.width}×${resolutionMock.current.height}`,
            status: 'info'
          })
        }
        return resolutionPayload()
      }
    },

    nis: {
      async status() {
        await wait(300)
        const gpu = GPU_BY_VENDOR[VENDOR]
        return {
          ok: true,
          available: VENDOR === 'nvidia',
          gpuName: gpu.name,
          driverVersion: gpu.driverVersion,
          panelAvailable: true,
          steps: nisSteps,
          note:
            'Image Scaling ve keskinleştirme ayarları NVIDIA profil veritabanında tutulur. Bu dosyayı ikili olarak düzenlemek riskli olduğu için Omerta FPS bu değerleri otomatik yazmaz; panelde senin yerine yönlendirme sunar.'
        }
      },
      async openPanel() {
        await wait(250)
        return { ok: true, opened: true, target: 'NVIDIA Denetim Masası' }
      }
    },

    async activity() {
      await wait(200)
      return { ok: true, items: activity.slice(0, 12) }
    },

    async activityClear() {
      await wait(150)
      activity = []
      return { ok: true, cleared: true }
    },

    settings: {
      async status() {
        await wait(120)
        return {
          ok: true,
          ...clone(settingsState),
          autoProfile: { ...settingsState.autoProfile },
          overlay: clone(settingsState.overlay),
          displays: clone(MOCK_DISPLAYS),
          loginItem: settingsState.startWithWindows,
          dataDir: 'C:\\ProgramData\\OmertaFPS',
          version: '1.2.0',
          platform: 'Windows_NT 10.0.19045'
        }
      },
      async update(patch) {
        const input = patch && typeof patch === 'object' ? patch : {}
        if (input.autoProfile?.enabled === true) {
          const blocked = gateError('profiles')
          if (blocked) return blocked
        }
        const enablesFps = input.overlay?.fps?.enabled === true && !settingsState.overlay.fps.enabled
        const enablesCrosshair =
          input.overlay?.crosshair?.enabled === true && !settingsState.overlay.crosshair.enabled
        if (enablesFps || enablesCrosshair) {
          const blocked = gateError('overlay')
          if (blocked) return blocked
        }
        await wait(250)
        const nextAuto = {
          ...settingsState.autoProfile,
          ...(input.autoProfile && typeof input.autoProfile === 'object' ? input.autoProfile : {})
        }
        const nextOverlay = {
          ...settingsState.overlay,
          ...(input.overlay && typeof input.overlay === 'object' ? input.overlay : {}),
          fps: {
            ...settingsState.overlay.fps,
            ...(input.overlay?.fps && typeof input.overlay.fps === 'object' ? input.overlay.fps : {})
          },
          crosshair: {
            ...settingsState.overlay.crosshair,
            ...(input.overlay?.crosshair && typeof input.overlay.crosshair === 'object'
              ? input.overlay.crosshair
              : {})
          }
        }
        settingsState = {
          startWithWindows:
            typeof input.startWithWindows === 'boolean'
              ? input.startWithWindows
              : settingsState.startWithWindows,
          restorePointBeforeApply:
            typeof input.restorePointBeforeApply === 'boolean'
              ? input.restorePointBeforeApply
              : settingsState.restorePointBeforeApply,
          autoProfile: {
            enabled: nextAuto.enabled === true,
            presetId: ['auto', 'fps', 'fivem', 'moba', 'story', 'sim'].includes(nextAuto.presetId)
              ? nextAuto.presetId
              : 'auto'
          },
          overlay: nextOverlay
        }
        return {
          ok: true,
          ...clone(settingsState),
          autoProfile: { ...settingsState.autoProfile },
          overlay: clone(settingsState.overlay),
          displays: clone(MOCK_DISPLAYS),
          loginItem: settingsState.startWithWindows,
          dataDir: 'C:\\ProgramData\\OmertaFPS'
        }
      }
    },

    restorePoint: {
      async status() {
        await wait(120)
        return { ok: true, ...clone(restoreMock) }
      },
      async create() {
        await wait(1400)
        const entry = {
          created: true,
          reason: null,
          at: nowIso(),
          description: 'Omerta FPS - Manuel istek',
          note: null
        }
        restoreMock = { supported: true, last: entry }
        pushActivity({
          kind: 'system',
          title: 'Geri yükleme noktası oluşturuldu',
          detail: 'Manuel istek'
        })
        return { ok: true, ...entry }
      }
    },

    onProgress(callback) {
      progressListeners.add(callback)
      return () => progressListeners.delete(callback)
    },

    onScanProgress(callback) {
      scanListeners.add(callback)
      return () => scanListeners.delete(callback)
    },

    onEsportsEvent(callback) {
      esportsListeners.add(callback)
      return () => esportsListeners.delete(callback)
    },

    updater: {
      async status() {
        await wait(80)
        return { ok: true, ...updaterState }
      },
      async check() {
        runUpdaterDemo()
        return { ok: true, ...updaterState }
      },
      async install() {
        await wait(200)
        return { ok: true, installing: true }
      },
      onStatus(callback) {
        updaterListeners.add(callback)
        setTimeout(runUpdaterDemo, 1200)
        return () => updaterListeners.delete(callback)
      }
    }
  }
}
