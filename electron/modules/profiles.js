'use strict';

const store = require('../lib/store');
const activity = require('../lib/activity');
const hardware = require('../lib/hardware');
const settings = require('../lib/settings');
const restore = require('../lib/restore');
const nvidia = require('./nvidia');
const tweaks = require('./tweaks');
const fivem = require('./fivem');

const STATE_FILE = () => store.dataFile('profiles-state.json');

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
      'Görüntü keskinleştirme → %40',
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
];

const PRESET_BY_ID = new Map(PRESETS.map((item) => [item.id, item]));

function getPreset(id) {
  return PRESET_BY_ID.get(id) || null;
}

function readState() {
  const state = store.readJson(STATE_FILE(), null);
  return state && typeof state === 'object' ? state : null;
}

function vendorSummary(hw) {
  const primary = hw.gpu;
  return {
    id: primary?.vendor || 'generic',
    label: primary?.vendorLabel || 'Bilinmiyor',
    name: primary?.name || 'Algılanamadı',
    integrated: Boolean(primary?.integrated),
    driverVersion: primary?.driverVersion || null,
    driverDate: primary?.driverDate || null,
    hasNvidia: hw.gpus.some((item) => item.vendor === 'nvidia'),
    hasAmd: hw.gpus.some((item) => item.vendor === 'amd')
  };
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
        : preset.nvidiaSteps;

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
  };
}

async function status() {
  const hw = await hardware.detect();
  const vendor = vendorSummary(hw);
  const state = readState();
  const activePreset = state?.activeProfile ? getPreset(state.activeProfile) : null;

  return {
    presets: PRESETS.map((preset) => withVendor(preset, vendor)),
    vendor,
    hardware: {
      cpu: hw.cpu.name,
      cpuThreads: hw.cpu.threads,
      memoryGb: hw.memory.totalGb,
      storage: hw.storage?.media || null,
      tier: hw.tier
    },
    activeProfile: activePreset ? withVendor(activePreset, vendor) : null,
    appliedAt: state?.appliedAt || null,
    source: state?.source || null,
    hasBackup: Boolean(state?.backup),
    nvidiaApplied: Boolean(state?.backup?.nvidiaApplied),
    fivemApplied: Boolean(state?.backup?.fivem?.applied),
    autoProfile: settings.get().autoProfile,
    restorePoint: restore.status()
  };
}

async function revertInternal(state) {
  const backup = state?.backup;
  if (!backup) return { reverted: false };

  let warning = null;
  if (backup.nvidiaApplied) {
    try {
      await nvidia.revert();
    } catch (error) {
      warning = error.message;
    }
  }

  if (backup.fivem?.applied) {
    try {
      if (backup.fivem.exclusionAdded) await fivem.revert();
      else await fivem.resetPriority();
    } catch (error) {
      warning = warning || error.message;
    }
  }

  await tweaks.restoreEntries(backup.registryEntries || []);
  await tweaks.restorePower(backup.power || null);
  store.removeFile(STATE_FILE());

  return { reverted: true, warning };
}

async function apply(id, options = {}) {
  const preset = getPreset(String(id || ''));
  if (!preset) {
    const error = new Error('Bilinmeyen oyun profili.');
    error.code = 'unknown-profile';
    throw error;
  }

  const source = options.source === 'auto' ? 'auto' : 'manual';
  const hw = await hardware.detect();
  const vendor = vendorSummary(hw);
  const previous = readState();

  if (previous?.activeProfile === preset.id) {
    if (source === 'manual' && previous.source !== 'manual') {
      store.writeJson(STATE_FILE(), { ...previous, source: 'manual' });
    }
    return {
      alreadyActive: true,
      ...(await status())
    };
  }

  if (previous?.activeProfile && source === 'auto' && previous.source !== 'auto') {
    return {
      skipped: true,
      reason: 'manual-profile-active',
      ...(await status())
    };
  }

  if (previous?.activeProfile) {
    await revertInternal(previous);
  }

  let restorePoint = null;
  if (source === 'manual' && settings.get().restorePointBeforeApply) {
    restorePoint = await restore.create(preset.name).catch((error) => ({
      created: false,
      reason: 'error',
      message: error.message,
      at: new Date().toISOString()
    }));
  }

  const before = await tweaks.readState();
  const backup = {
    presetId: preset.id,
    source,
    savedAt: new Date().toISOString(),
    registryEntries: before.entries,
    power: tweaks.powerBackup(before),
    nvidiaApplied: false,
    fivem: null
  };

  let fivemResult = null;
  let fivemWarning = null;

  try {
    await tweaks.setGameDvr(preset.apply.gameDvr);
    await tweaks.setPowerPlan(preset.apply.power);
    if (preset.apply.visualEffects) {
      await tweaks.setVisualEffects(preset.apply.visualEffects);
    }
    if (preset.apply.mouseAcceleration === false) {
      await tweaks.setMouseAcceleration(false);
    }

    let nvidiaApplied = false;
    if (preset.apply.nvidiaProfile && vendor.hasNvidia) {
      const info = await nvidia.inspect();
      if (!info.active) {
        await nvidia.apply();
        nvidiaApplied = true;
      }
      backup.nvidiaApplied = nvidiaApplied;
    }

    if (preset.id === 'fivem') {
      try {
        fivemResult = await fivem.apply({ addExclusion: options.defenderExclusion === true });
        backup.fivem = {
          applied: true,
          exclusionAdded: Boolean(fivemResult.exclusionAddedByCall),
          priorityApplied: Boolean(fivemResult.priorityApplied)
        };
      } catch (error) {
        fivemWarning = error.message;
      }
    }
  } catch (error) {
    try {
      if (backup.fivem?.applied) {
        if (backup.fivem.exclusionAdded) await fivem.revert();
        else await fivem.resetPriority();
      }
    } catch {
      /* best effort */
    }
    try {
      await tweaks.restoreEntries(backup.registryEntries);
      await tweaks.restorePower(backup.power);
    } catch {
      /* best effort restore */
    }
    throw error;
  }

  store.writeJson(STATE_FILE(), {
    activeProfile: preset.id,
    appliedAt: new Date().toISOString(),
    source,
    backup
  });

  activity.add({
    kind: 'profile',
    title: `${preset.name} profili uygulandı`,
    detail:
      source === 'auto'
        ? 'Oyun algılandı · otomatik profil'
        : vendor.label === 'Bilinmiyor'
          ? 'Sistem ayarları güncellendi'
          : `${vendor.label} · ${vendor.name}`,
    status: backup.nvidiaApplied ? 'warning' : 'success'
  });

  const warnings = [];
  if (backup.nvidiaApplied) warnings.push('NVIDIA sürücü ayarlarının etkinleşmesi için yeniden başlatma önerilir.');
  if (fivemWarning) warnings.push(`FiveM: ${fivemWarning}`);

  return {
    applies: preset.effects,
    requiresRestart: backup.nvidiaApplied,
    checkpoint: restorePoint,
    fivemApplied: Boolean(backup.fivem?.applied),
    fivemExclusion: Boolean(backup.fivem?.exclusionAdded),
    warning: warnings.length ? warnings.join(' ') : null,
    ...(await status())
  };
}

async function revert(options = {}) {
  const state = readState();
  if (!state) {
    return { reverted: false, ...(await status()) };
  }

  if (options.source && state.source !== options.source) {
    return { reverted: false, skipped: true, reason: 'source-mismatch', ...(await status()) };
  }

  const preset = getPreset(state.activeProfile);
  const result = await revertInternal(state);

  activity.add({
    kind: 'profile',
    title:
      state.source === 'auto' ? 'Otomatik oyun profili geri alındı' : 'Oyun profili geri alındı',
    detail: preset ? preset.name : 'Önceki ayarlar',
    status: result.warning ? 'warning' : 'info'
  });

  return {
    reverted: result.reverted,
    warning: result.warning,
    ...(await status())
  };
}

module.exports = {
  status,
  apply,
  revert,
  getPreset
};
