'use strict';

const os = require('node:os');
const { runPowerShellJson } = require('./ps');

let cache = null;
const CACHE_MS = 120000;

const VENDORS = {
  nvidia: { id: 'nvidia', label: 'NVIDIA', tone: 'volt' },
  amd: { id: 'amd', label: 'AMD', tone: 'rose' },
  intel: { id: 'intel', label: 'Intel', tone: 'ion' },
  generic: { id: 'generic', label: 'Bilinmeyen', tone: 'muted' }
};

const RAM_TYPES = {
  20: 'DDR',
  21: 'DDR2',
  24: 'DDR3',
  26: 'DDR4',
  34: 'DDR5'
};

function vendorOf(name) {
  const text = String(name || '');
  if (/nvidia/i.test(text)) return VENDORS.nvidia;
  if (/amd|radeon|advanced micro devices/i.test(text)) return VENDORS.amd;
  if (/intel|arc|iris|uhd/i.test(text)) return VENDORS.intel;
  return VENDORS.generic;
}

function isDiscrete(name) {
  return /nvidia|geforce|quadro/i.test(name) || /radeon\s+(rx|pro|vii)|rx\s*\d{3,4}/i.test(name);
}

function gpuScore(name) {
  const text = String(name || '');
  const nvidia = text.match(/rtx\s*(\d{4})/i);
  if (nvidia) {
    const series = Number(nvidia[1].slice(0, 2));
    if (series >= 50) return 5;
    if (series >= 40) return 4;
    if (series >= 30) return 3;
    if (series >= 20) return 2.2;
    return 1.8;
  }
  if (/gtx\s*16/i.test(text)) return 1.6;
  if (/gtx/i.test(text)) return 1.4;
  const amd = text.match(/rx\s*(\d{4})/i);
  if (amd) {
    const series = Number(amd[1].slice(0, 1));
    if (series >= 9) return 5;
    if (series >= 7) return 4;
    if (series >= 6) return 3;
    if (series >= 5) return 2;
    return 1.5;
  }
  if (/arc\s*a?(\d{3})/i.test(text)) return 2;
  if (/intel|iris|uhd/i.test(text)) return 0.5;
  return 1;
}

function tierOf(score) {
  if (score >= 8.5) return { id: 'high', label: 'Üst seviye', tone: 'volt' };
  if (score >= 6.5) return { id: 'upper', label: 'Orta-üst', tone: 'ion' };
  if (score >= 4.5) return { id: 'mid', label: 'Orta seviye', tone: 'neutral' };
  return { id: 'entry', label: 'Giriş seviyesi', tone: 'amber' };
}

function gb(bytes) {
  return Math.round((Number(bytes) || 0) / 1024 ** 3);
}

function daysSince(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function buildRecommendations(hardware) {
  const items = [];
  const totalGb = hardware.memory.totalGb;
  const gpu = hardware.gpu;
  const disk = hardware.storage;

  if (totalGb > 0 && totalGb < 9) {
    items.push({
      id: 'ram-capacity',
      tone: 'warning',
      title: `${totalGb} GB RAM darboğaz oluşturur`,
      text: 'Yeni oyunlarda dokular ve arka plan uygulamaları belleği doldurur. 16 GB çift kanal kit en etkili yükseltmedir; bu arada oyun içi doku kalitesini düşür ve tarayıcıyı arka planda kapat.'
    });
  } else if (totalGb >= 9 && totalGb < 15) {
    items.push({
      id: 'ram-upgrade',
      tone: 'info',
      title: `${totalGb} GB RAM sınıra yakın`,
      text: 'AAA oyunlarda 16 GB çift kanal bellek belirgin biçimde daha tutarlı kare süreleri verir. Şimdilik RAM bakımını ve arka plan temizliğini düzenli çalıştır.'
    });
  }

  if (hardware.memory.moduleCount === 1 && totalGb >= 8) {
    items.push({
      id: 'ram-single-channel',
      tone: 'warning',
      title: 'Tek kanal bellek kullanılıyor',
      text: 'İkinci bir bellek modülü eklemek, özellikle işlemci grafiğinde ve oyunlarda bellek bant genişliğini ikiye katlar. Aynı hız ve kapasitede ikinci modül önerilir.'
    });
  }

  if (hardware.memory.speedMhz > 0 && hardware.memory.speedMhz < 3000 && /DDR4|DDR5/.test(hardware.memory.typeLabel)) {
    items.push({
      id: 'ram-speed',
      tone: 'info',
      title: `Bellek ${hardware.memory.speedMhz} MHz çalışıyor`,
      text: 'BIOS içindeki XMP/EXPO profili kapalı olabilir. Desteklenen hızı açmak CPU ağırlıklı oyunlarda kare hızını artırabilir.'
    });
  }

  if (disk?.media === 'HDD') {
    items.push({
      id: 'storage-hdd',
      tone: 'warning',
      title: 'Sistem diski HDD',
      text: 'Oyun yükleme süreleri ve doku akışı SSD\'ye göre çok yavaş kalır. Windows ve oyunları NVMe/SATA SSD\'ye taşımak algılanan akıcılığı artırır; Prefetch hizmetini bu diskte kapatma.'
    });
  }

  if (disk && disk.freePercent != null && disk.freePercent < 15) {
    items.push({
      id: 'storage-free',
      tone: 'warning',
      title: `Diskte yalnızca ${disk.freePercent}% boş alan var`,
      text: 'SSD\'ler doldukça yazma performansı düşer. Geçici dosyaları temizle ve kullanılmayan oyunları kaldır.'
    });
  }

  if (gpu?.vendor === 'nvidia') {
    items.push({
      id: 'gpu-nvidia',
      tone: 'info',
      title: 'NVIDIA sürücü profili kullanılabilir',
      text: 'Güç yönetimi maksimum performansa alınabilir; oyun türü profilleri GameDVR, güç planı ve gecikme ayarlarını birlikte düzenler.'
    });
  } else if (gpu?.vendor === 'amd') {
    items.push({
      id: 'gpu-amd',
      tone: 'info',
      title: 'AMD Adrenalin ayarları hazır',
      text: 'Radeon Anti-Lag, Chill, FreeSync ve doku kalitesi önerileri oyun türüne göre hazırlandı. Sürücü ayarları AMD Software üzerinden tek tıkla uygulanır.'
    });
  } else if (gpu?.integrated) {
    items.push({
      id: 'gpu-integrated',
      tone: 'warning',
      title: 'Entegre grafik birimi kullanılıyor',
      text: 'FPS artışı sınırlıdır. 720p/900p çözünürlük, FSR veya oyun içi ölçekleme ve düşük gölge ayarları en gerçekçi beklentidir.'
    });
  }

  const driverAge = daysSince(gpu?.driverDate);
  if (driverAge != null && driverAge > 365) {
    items.push({
      id: 'gpu-driver',
      tone: 'warning',
      title: 'Ekran kartı sürücüsü eski',
      text: `Sürücü ${Math.round(driverAge / 30)} aydır güncellenmemiş. Yeni oyunlar için üreticinin güncel sürücüsünü kur.`
    });
  }

  if (hardware.cpu.threads > 0 && hardware.cpu.threads <= 4) {
    items.push({
      id: 'cpu-low',
      tone: 'warning',
      title: 'Sınırlı CPU iş parçacığı',
      text: 'Arka plan hizmetlerini ve başlangıç uygulamalarını azaltmak, darboğazı hafifletmenin en hızlı yoludur.'
    });
  }

  if (hardware.display?.refreshRate > 0 && hardware.display.refreshRate < 100) {
    items.push({
      id: 'display-refresh',
      tone: 'info',
      title: `${hardware.display.refreshRate} Hz ekran algılandı`,
      text: 'FPS 60\'ın üzerine çıksa da ekran 60 Hz ise akıcılık sınırlı kalır. Monitörün desteklediği en yüksek tazeleme hızını Windows ayarlarından seç.'
    });
  }

  return items;
}

function normalizeModule(row) {
  return {
    capacity: Number(row.capacity) || 0,
    speedMhz: Number(row.speed) || 0,
    typeCode: Number(row.memoryType) || 0,
    typeLabel: RAM_TYPES[Number(row.memoryType)] || 'Bilinmiyor',
    manufacturer: String(row.manufacturer || '').trim(),
    partNumber: String(row.partNumber || '').trim()
  };
}

async function readPowerShellHardware() {
  const rows = await runPowerShellJson(
    `$cpu = Get-CimInstance Win32_Processor -ErrorAction SilentlyContinue | Select-Object -First 1
$os = Get-CimInstance Win32_OperatingSystem -ErrorAction SilentlyContinue
$board = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue
$cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue
$gpuBase = 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}'
$vramByDesc = @{}
foreach ($key in @(Get-ChildItem -LiteralPath $gpuBase -ErrorAction SilentlyContinue)) {
  $props = Get-ItemProperty -LiteralPath $key.PSPath -ErrorAction SilentlyContinue
  $desc = [string]$props.DriverDesc
  $mem = $props.'HardwareInformation.qwMemorySize'
  if ($desc -and $mem) { $vramByDesc[$desc] = [int64]$mem }
}
$gpus = @(Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
  $name = [string]$_.Name
  $vram = 0
  if ($vramByDesc.ContainsKey($name)) { $vram = [int64]$vramByDesc[$name] } else { $vram = [int64]$_.AdapterRAM }
  [pscustomobject]@{
    name = $name
    driverVersion = [string]$_.DriverVersion
    driverDate = if ($_.DriverDate) { $_.DriverDate.ToString('yyyy-MM-dd') } else { $null }
    vram = $vram
    refreshRate = [int]$_.CurrentRefreshRate
    width = [int]$_.CurrentHorizontalResolution
    height = [int]$_.CurrentVerticalResolution
  }
})
$modules = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue | ForEach-Object {
  [pscustomobject]@{
    capacity = [int64]$_.Capacity
    speed = [int]$_.ConfiguredClockSpeed
    memoryType = [int]$_.SMBIOSMemoryType
    manufacturer = [string]$_.Manufacturer
    partNumber = [string]$_.PartNumber
  }
})
$disks = @()
try {
  $disks = @(Get-PhysicalDisk -ErrorAction Stop | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.FriendlyName; media = [string]$_.MediaType; bus = [string]$_.BusType; size = [int64]$_.Size }
  })
} catch { }
$systemVolume = $null
try {
  $letter = ([string]$env:SystemDrive).TrimEnd(':')
  $volume = Get-Volume -DriveLetter $letter -ErrorAction Stop
  $systemVolume = [pscustomobject]@{ letter = $letter; size = [int64]$volume.Size; free = [int64]$volume.SizeRemaining; fileSystem = [string]$volume.FileSystem }
} catch { }
[pscustomobject]@{
  cpuName = [string]$cpu.Name
  cpuCores = [int]$cpu.NumberOfCores
  cpuThreads = [int]$cpu.NumberOfLogicalProcessors
  cpuMaxClock = [int]$cpu.MaxClockSpeed
  osName = [string]$os.Caption
  osBuild = [string]$os.BuildNumber
  osVersion = [string]$os.Version
  hostname = [string]$cs.Name
  manufacturer = [string]$cs.Manufacturer
  model = [string]$cs.Model
  boardVendor = [string]$board.Manufacturer
  boardName = [string]$board.Product
  gpus = $gpus
  ramModules = $modules
  disks = $disks
  systemVolume = $systemVolume
}`,
    { timeout: 60000 }
  );
  return rows[0] || {};
}

async function detect(force = false) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  let raw = {};
  try {
    raw = await readPowerShellHardware();
  } catch {
    raw = {};
  }

  const gpus = (Array.isArray(raw.gpus) ? raw.gpus : [])
    .filter((row) => row && row.name)
    .map((row) => {
      const vendor = vendorOf(row.name);
      return {
        name: String(row.name).trim(),
        vendor: vendor.id,
        vendorLabel: vendor.label,
        driverVersion: row.driverVersion || null,
        driverDate: row.driverDate || null,
        vramBytes: Number(row.vram) > 0 ? Number(row.vram) : null,
        refreshRate: Number(row.refreshRate) || null,
        resolution:
          Number(row.width) > 0 && Number(row.height) > 0 ? `${row.width} × ${row.height}` : null,
        integrated: !isDiscrete(row.name),
        score: gpuScore(row.name)
      };
    })
    .sort((a, b) => {
      if (a.integrated !== b.integrated) return a.integrated ? 1 : -1;
      if (b.vramBytes !== a.vramBytes) return (b.vramBytes || 0) - (a.vramBytes || 0);
      return b.score - a.score;
    });

  const primary = gpus[0] || null;
  const modules = (Array.isArray(raw.ramModules) ? raw.ramModules : []).map(normalizeModule);
  const totalMemory = modules.reduce((sum, item) => sum + item.capacity, 0) || os.totalmem();
  const storageRows = (Array.isArray(raw.disks) ? raw.disks : [])
    .filter((row) => row && Number(row.size) > 0)
    .map((row) => ({
      name: String(row.name || '').trim(),
      media: /ssd/i.test(row.media) ? 'SSD' : /hdd/i.test(row.media) ? 'HDD' : String(row.media || 'Bilinmiyor'),
      bus: String(row.bus || '').trim(),
      sizeBytes: Number(row.size)
    }))
    .sort((a, b) => b.sizeBytes - a.sizeBytes);

  const systemVolume = raw.systemVolume || {};
  const storage = storageRows[0] || null;
  const freePercent =
    Number(systemVolume.size) > 0
      ? Math.round((Number(systemVolume.free) / Number(systemVolume.size)) * 100)
      : null;

  const cpuName = String(raw.cpuName || os.cpus()[0]?.model || 'Bilinmeyen işlemci')
    .replace(/\s+/g, ' ')
    .trim();
  const threads = Number(raw.cpuThreads) || os.cpus().length;
  const cores = Number(raw.cpuCores) || Math.max(1, Math.ceil(threads / 2));
  const totalGb = Math.round((totalMemory / 1024 ** 3) * 10) / 10;

  const score =
    (primary?.score || 0.5) +
    (totalGb >= 32 ? 3 : totalGb >= 16 ? 2 : totalGb >= 8 ? 1 : 0) +
    (threads >= 16 ? 2 : threads >= 12 ? 1.5 : threads >= 8 ? 1 : 0);

  const hardware = {
    cpu: {
      name: cpuName,
      cores,
      threads,
      maxClockMhz: Number(raw.cpuMaxClock) || null
    },
    memory: {
      totalBytes: totalMemory,
      totalGb,
      moduleCount: modules.length,
      modules,
      speedMhz: modules.length ? Math.max(...modules.map((item) => item.speedMhz)) : 0,
      typeLabel: modules[0]?.typeLabel || 'Bilinmiyor'
    },
    gpu: primary,
    gpus,
    storage: storage
      ? {
          ...storage,
          freePercent,
          systemSizeBytes: Number(systemVolume.size) || null,
          systemFreeBytes: Number(systemVolume.free) || null
        }
      : null,
    display: {
      refreshRate: primary?.refreshRate || null,
      resolution: primary?.resolution || null
    },
    board: {
      vendor: String(raw.boardVendor || '').trim(),
      name: String(raw.boardName || '').trim(),
      manufacturer: String(raw.manufacturer || '').trim(),
      model: String(raw.model || '').trim()
    },
    os: {
      name: String(raw.osName || `Windows ${os.release()}`).trim(),
      build: String(raw.osBuild || os.release()),
      version: raw.osVersion || null,
      arch: os.arch(),
      hostname: String(raw.hostname || os.hostname())
    },
    tier: tierOf(score),
    score,
    recommendations: []
  };

  hardware.recommendations = buildRecommendations(hardware);
  cache = { at: Date.now(), data: hardware };
  return hardware;
}

module.exports = {
  detect,
  vendorOf
};
