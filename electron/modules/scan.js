'use strict';

const activity = require('../lib/activity');
const hardware = require('../lib/hardware');
const maintenance = require('./maintenance');
const services = require('./services');
const tweaks = require('./tweaks');
const nvidia = require('./nvidia');
const { runPowerShellJson } = require('../lib/ps');

const SEVERITY_WEIGHT = { critical: 16, warning: 8, info: 2, good: 0 };
const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2, good: 3 };

function gb(bytes) {
  return (Number(bytes) || 0) / 1024 ** 3;
}

function formatGb(bytes) {
  return `${gb(bytes).toFixed(1).replace('.', ',')} GB`;
}

async function readStartup() {
  try {
    const rows = await runPowerShellJson(
      `$items = @(Get-CimInstance Win32_StartupCommand -ErrorAction SilentlyContinue)
[pscustomobject]@{
  count = $items.Count
  items = @($items | Select-Object -First 10 | ForEach-Object {
    [pscustomobject]@{ name = [string]$_.Name; location = [string]$_.Location; command = [string]$_.Command }
  })
}`,
      { timeout: 30000 }
    );
    const row = rows[0] || {};
    return {
      count: Number(row.count) || 0,
      items: (Array.isArray(row.items) ? row.items : []).map((item) => ({
        name: String(item.name || '').slice(0, 80),
        location: String(item.location || '').slice(0, 60)
      }))
    };
  } catch {
    return { count: 0, items: [] };
  }
}

async function run(onProgress = () => {}) {
  const startedAt = Date.now();

  onProgress({ step: 'hardware', status: 'running' });
  const hw = await hardware.detect(true);
  onProgress({ step: 'hardware', status: 'done', detail: hw.gpu?.name || hw.cpu.name });

  for (const step of ['storage', 'memory', 'services', 'registry', 'startup']) {
    onProgress({ step, status: 'running' });
  }

  const [storageResult, statsResult, servicesResult, registryResult, startupResult] = await Promise.all([
    maintenance.scan().catch(() => null),
    maintenance.getStats({ standby: true }).catch(() => null),
    services.list().catch(() => []),
    tweaks.readState().catch(() => null),
    readStartup()
  ]);

  onProgress({ step: 'storage', status: 'done', detail: storageResult ? `${storageResult.length} konum` : 'atlandı' });
  onProgress({ step: 'memory', status: 'done', detail: statsResult ? `${statsResult.memory.percent}% dolu` : 'atlandı' });
  onProgress({ step: 'services', status: 'done', detail: `${servicesResult.length} bileşen` });
  onProgress({ step: 'registry', status: 'done' });
  onProgress({ step: 'startup', status: 'done', detail: `${startupResult.count} öğe` });

  onProgress({ step: 'gpu', status: 'running' });
  let nvidiaInfo = null;
  if (hw.gpus.some((item) => item.vendor === 'nvidia')) {
    nvidiaInfo = await nvidia.inspect().catch(() => null);
  }
  onProgress({ step: 'gpu', status: 'done', detail: hw.gpu?.vendorLabel || 'Algılanamadı' });

  const findings = [];
  const storage = storageResult || [];
  const tempBytes = storage
    .filter((item) => item.id !== 'prefetch')
    .reduce((sum, item) => sum + Number(item.size || 0), 0);
  const prefetchBytes = storage.find((item) => item.id === 'prefetch')?.size || 0;

  if (tempBytes > 1.5 * 1024 ** 3) {
    findings.push({
      id: 'temp-large',
      severity: 'warning',
      category: 'Temizlik',
      title: `${formatGb(tempBytes)} geçici dosya birikmiş`,
      detail: 'Kullanıcı ve Windows Temp klasörlerinde gereksiz kurulum artıkları ve önbellek dosyaları var.',
      recommendation: 'Geçici dosyaları temizlemek disk alanı açar ve dosya erişimini hızlandırır.',
      action: { type: 'fix', id: 'cleanTemp', label: 'Geçici dosyaları temizle' }
    });
  } else if (tempBytes > 350 * 1024 ** 2) {
    findings.push({
      id: 'temp-moderate',
      severity: 'info',
      category: 'Temizlik',
      title: `${formatGb(tempBytes)} geçici dosya`,
      detail: 'Temp klasörlerinde orta düzeyde birikim var.',
      recommendation: 'Uygun bir zamanda temizlik çalıştırmak yeterli.',
      action: { type: 'fix', id: 'cleanTemp', label: 'Temizle' }
    });
  } else {
    findings.push({
      id: 'temp-clean',
      severity: 'good',
      category: 'Temizlik',
      title: 'Geçici dosyalar temiz',
      detail: `Temp konumlarında yalnızca ${formatGb(tempBytes)} veri var.`,
      recommendation: null,
      action: { type: 'navigate', target: 'cleanup', label: 'Temizlik modülü' }
    });
  }

  const standbyBytes = Number(statsResult?.standbyBytes || 0);
  if (standbyBytes > 3 * 1024 ** 3) {
    findings.push({
      id: 'standby-high',
      severity: 'warning',
      category: 'Bellek',
      title: `${formatGb(standbyBytes)} bekleyen bellek`,
      detail: 'Windows önbellek için ayırdığı standby sayfaları oyunlara daha az boş RAM bırakıyor.',
      recommendation: 'Oyun öncesinde bekleyen belleği boşaltmak yeni uygulamalar için alan açar.',
      action: { type: 'fix', id: 'purgeStandby', label: 'Belleği rahatlat' }
    });
  } else if (standbyBytes > 1024 ** 3) {
    findings.push({
      id: 'standby-moderate',
      severity: 'info',
      category: 'Bellek',
      title: `${formatGb(standbyBytes)} bekleyen bellek`,
      detail: 'Standby önbelleği normal aralıkta; yoğun oyun öncesinde temizlenebilir.',
      recommendation: 'Sorun yok, isteğe bağlı olarak rahatlatma çalıştırabilirsin.',
      action: { type: 'fix', id: 'purgeStandby', label: 'Belleği temizle' }
    });
  }

  const memoryPercent = Number(statsResult?.memory?.percent || 0);
  if (memoryPercent >= 85) {
    findings.push({
      id: 'ram-critical',
      severity: 'critical',
      category: 'Bellek',
      title: `RAM kullanımı %${memoryPercent}`,
      detail: 'Kullanılabilir bellek oyunlar için kritik seviyede düşük.',
      recommendation: 'Arka plan uygulamalarını kapat ve bekleyen belleği boşalt.',
      action: { type: 'fix', id: 'purgeStandby', label: 'Belleği rahatlat' }
    });
  } else if (memoryPercent >= 75) {
    findings.push({
      id: 'ram-high',
      severity: 'warning',
      category: 'Bellek',
      title: `RAM kullanımı %${memoryPercent}`,
      detail: 'Bellek doluluğu yüksek; oyun sırasında takılmalar görülebilir.',
      recommendation: 'Gereksiz arka plan uygulamalarını kapat ve RAM bakımını çalıştır.',
      action: { type: 'navigate', target: 'ram', label: 'RAM bakımı' }
    });
  } else {
    findings.push({
      id: 'ram-ok',
      severity: 'good',
      category: 'Bellek',
      title: `RAM kullanımı %${memoryPercent}`,
      detail: `${formatGb(statsResult?.memory?.available)} bellek kullanılabilir.`,
      recommendation: null,
      action: { type: 'navigate', target: 'ram', label: 'RAM bakımı' }
    });
  }

  const enabledRecommended = servicesResult.filter(
    (item) => !item.missing && item.recommendedOff && item.enabled
  );
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
    });
  } else if (enabledRecommended.length > 0) {
    findings.push({
      id: 'services-some',
      severity: 'info',
      category: 'Hizmetler',
      title: `${enabledRecommended.length} bileşen kapatılabilir`,
      detail: enabledRecommended.map((item) => item.name).join(', '),
      recommendation: 'Oyun odaklı kullanımda bu bileşenlerin kapatılması önerilir.',
      action: { type: 'navigate', target: 'services', label: 'Hizmetleri yönet' }
    });
  } else {
    findings.push({
      id: 'services-clean',
      severity: 'good',
      category: 'Hizmetler',
      title: 'Gereksiz Windows bileşenleri kapalı',
      detail: 'Önerilen bileşenlerin tamamı devre dışı.',
      recommendation: null,
      action: { type: 'navigate', target: 'services', label: 'Hizmetleri yönet' }
    });
  }

  if (registryResult && !registryResult.gameDvr.enabled) {
    findings.push({
      id: 'gamedvr-off',
      severity: 'good',
      category: 'Oyun',
      title: 'GameDVR arka plan kaydı kapalı',
      detail: 'Kayıt servisi oyun sırasında ek yük oluşturmuyor.',
      recommendation: null,
      action: { type: 'navigate', target: 'profiles', label: 'Oyun profilleri' }
    });
  } else if (registryResult) {
    findings.push({
      id: 'gamedvr-on',
      severity: 'warning',
      category: 'Oyun',
      title: 'GameDVR arka plan kaydı açık',
      detail: 'Windows, oyun görüntüsünü arka planda kaydederek GPU ve disk kullanabilir.',
      recommendation: 'Oyun profillerinden GameDVR\'ı kapatabilirsin.',
      action: { type: 'navigate', target: 'profiles', label: 'Profil uygula' }
    });
  }

  const powerName = String(registryResult?.power?.name || '');
  if (/yüksek performans|nihai performans|ultimate|high performance/i.test(powerName)) {
    findings.push({
      id: 'power-high',
      severity: 'good',
      category: 'Sistem',
      title: 'Yüksek performans güç planı aktif',
      detail: 'İşlemci güç tasarrufu oyun sırasında devreye girmiyor.',
      recommendation: null,
      action: { type: 'navigate', target: 'profiles', label: 'Oyun profilleri' }
    });
  } else if (powerName) {
    findings.push({
      id: 'power-balanced',
      severity: 'info',
      category: 'Sistem',
      title: `Güç planı: ${powerName}`,
      detail: 'Dengeli plan oyunlarda işlemci frekansını sınırlayabilir.',
      recommendation: 'Rekabetçi oyunlar için yüksek performans planı önerilir.',
      action: { type: 'navigate', target: 'profiles', label: 'Profil uygula' }
    });
  }

  if (startupResult.count >= 10) {
    findings.push({
      id: 'startup-many',
      severity: 'warning',
      category: 'Sistem',
      title: `${startupResult.count} başlangıç öğesi`,
      detail:
        startupResult.items
          .slice(0, 4)
          .map((item) => item.name)
          .join(', ') || 'Arka planda otomatik başlayan uygulamalar var.',
      recommendation: 'Görev Yöneticisi > Başlangıç sekmesinden kullanmadıklarını devre dışı bırak.',
      action: null
    });
  } else if (startupResult.count > 6) {
    findings.push({
      id: 'startup-some',
      severity: 'info',
      category: 'Sistem',
      title: `${startupResult.count} başlangıç öğesi`,
      detail: 'Açılışta çalışan uygulamalar arka planda bellek tüketir.',
      recommendation: 'Kullanmadığın başlangıç uygulamalarını devre dışı bırak.',
      action: null
    });
  } else {
    findings.push({
      id: 'startup-ok',
      severity: 'good',
      category: 'Sistem',
      title: 'Başlangıç listesi sade',
      detail: `${startupResult.count} otomatik başlangıç öğesi algılandı.`,
      recommendation: null,
      action: null
    });
  }

  if (hw.storage?.freePercent != null && hw.storage.freePercent < 12) {
    findings.push({
      id: 'disk-low',
      severity: 'warning',
      category: 'Depolama',
      title: `Sistem diskinde %${hw.storage.freePercent} boş alan`,
      detail: 'Dolu SSD\'lerde yazma ve doku akışı performansı düşer.',
      recommendation: 'Geçici dosyaları temizle ve kullanılmayan oyunları kaldır.',
      action: { type: 'navigate', target: 'cleanup', label: 'Temizliğe git' }
    });
  } else if (hw.storage?.freePercent != null && hw.storage.freePercent < 22) {
    findings.push({
      id: 'disk-moderate',
      severity: 'info',
      category: 'Depolama',
      title: `Sistem diskinde %${hw.storage.freePercent} boş alan`,
      detail: 'Boş alan ideal seviyenin altında.',
      recommendation: 'Temizlik ve oyun arşivi düzenlemesi faydalı olur.',
      action: { type: 'navigate', target: 'cleanup', label: 'Temizliğe git' }
    });
  }

  if (nvidiaInfo) {
    if (nvidiaInfo.active) {
      findings.push({
        id: 'nvidia-active',
        severity: 'good',
        category: 'GPU',
        title: 'NVIDIA maksimum performans profili aktif',
        detail: nvidiaInfo.gpuName,
        recommendation: null,
        action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
      });
    } else {
      findings.push({
        id: 'nvidia-default',
        severity: 'info',
        category: 'GPU',
        title: 'NVIDIA sürücü profili varsayılan',
        detail: 'Güç yönetimi maksimum performansa sabitlenmemiş.',
        recommendation: 'Oyun profilleri veya GPU merkezi ile güç profilini uygula.',
        action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
      });
    }
  } else if (hw.gpu?.vendor === 'amd') {
    findings.push({
      id: 'amd-guide',
      severity: 'info',
      category: 'GPU',
      title: 'AMD Adrenalin ayarları hazır',
      detail: hw.gpu.name,
      recommendation: 'Radeon Anti-Lag, Chill ve FreeSync önerileri GPU merkezinde.',
      action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
    });
  }

  const driverAgeMs = hw.gpu?.driverDate ? Date.now() - new Date(hw.gpu.driverDate).getTime() : null;
  const driverAgeDays = driverAgeMs != null && Number.isFinite(driverAgeMs) ? Math.floor(driverAgeMs / 86400000) : null;
  if (driverAgeDays != null && driverAgeDays > 365) {
    findings.push({
      id: 'driver-old',
      severity: 'warning',
      category: 'GPU',
      title: 'Ekran kartı sürücüsü eski',
      detail: `Sürücü yaklaşık ${Math.round(driverAgeDays / 30)} aydır güncellenmemiş.`,
      recommendation: 'Üreticinin güncel sürücüsünü kur; yeni oyunlarda belirgin fark yaratır.',
      action: { type: 'navigate', target: 'gpu', label: 'GPU merkezi' }
    });
  }

  if (hw.tier?.id === 'entry') {
    findings.push({
      id: 'hardware-tier',
      severity: 'info',
      category: 'Donanım',
      title: 'Donanım giriş seviyesinde',
      detail: `${hw.cpu.name} · ${hw.gpu?.name || 'GPU algılanamadı'} · ${hw.memory.totalGb} GB RAM`,
      recommendation: 'Beklentiyi 720p/900p ve düşük-orta grafik ayarlarında tut; FSR/XeSS kullan.',
      action: { type: 'navigate', target: 'profiles', label: 'Oyun profilleri' }
    });
  }

  findings.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);

  const counts = findings.reduce(
    (acc, finding) => {
      acc[finding.severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0, good: 0 }
  );

  const penalty = findings.reduce((sum, finding) => sum + SEVERITY_WEIGHT[finding.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  onProgress({ step: 'score', status: 'done', detail: `${score}/100` });

  return {
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    score,
    counts,
    findings,
    quickActions: [
      ...(tempBytes > 0 ? [{ id: 'cleanTemp', label: 'Geçici dosyaları temizle' }] : []),
      ...(standbyBytes > 0 ? [{ id: 'purgeStandby', label: 'Bekleyen belleği boşalt' }] : [])
    ],
    hardware: {
      cpu: hw.cpu,
      memory: {
        totalGb: hw.memory.totalGb,
        speedMhz: hw.memory.speedMhz,
        typeLabel: hw.memory.typeLabel,
        moduleCount: hw.memory.moduleCount
      },
      gpu: hw.gpu,
      gpus: hw.gpus,
      storage: hw.storage,
      display: hw.display,
      os: hw.os,
      board: hw.board,
      tier: hw.tier
    },
    hardwareAdvice: hw.recommendations,
    storage,
    prefetchBytes
  };
}

async function fix(id, onProgress = () => {}) {
  const target = String(id || '');

  if (target === 'cleanTemp') {
    onProgress({ step: 'fix', status: 'running', detail: 'Geçici dosyalar temizleniyor' });
    const result = await maintenance.clean(['userTemp', 'windowsTemp']);
    onProgress({ step: 'fix', status: 'done' });
    activity.add({
      kind: 'cleanup',
      title: 'Tarama önerisi uygulandı',
      detail: `Geçici dosyalar temizlendi · ${result.freedMb} MB`,
      status: 'success'
    });
    return {
      id: target,
      title: 'Geçici dosyalar temizlendi',
      detail: `${result.freedMb} MB alan açıldı.`,
      freedBytes: result.freedBytes
    };
  }

  if (target === 'purgeStandby') {
    onProgress({ step: 'fix', status: 'running', detail: 'Bekleyen bellek boşaltılıyor' });
    const result = await maintenance.purgeStandby();
    onProgress({ step: 'fix', status: 'done' });
    return {
      id: target,
      title: 'Bekleyen bellek boşaltıldı',
      detail: `Yaklaşık ${result.releasedMb} MB RAM serbest bırakıldı.`,
      releasedBytes: result.releasedBytes
    };
  }

  const error = new Error('Bilinmeyen tarama düzeltmesi.');
  error.code = 'unknown-fix';
  throw error;
}

module.exports = {
  run,
  fix
};
