'use strict';

const nvidia = require('./nvidia');

const STEPS = [
  'NVIDIA Denetim Masası → 3D Ayarlarının Yönetilmesi → Genel Ayarlar bölümünü aç.',
  'Görüntü Ölçeklendirme (Image Scaling) seçeneğini Açık yap.',
  'Keskinleştirme (Sharpening) değerini %50–70 aralığına getir.',
  'Ölçeklendirme yönlendirmesini "Tam ekran" olarak seç ve Uygula.',
  'Oyun içi çözünürlüğü %77–85 ölçeğe indir (ör. 1080p için 1440×810).',
  'Oyunu yeniden başlatıp görüntü netliğini ve FPS artışını kontrol et.'
];

async function status() {
  let info = {};
  try {
    info = await nvidia.inspect();
  } catch {
    info = {};
  }

  const name = String(info.gpuName || '');
  const isNvidia = /nvidia|geforce|quadro|rtx|gtx/i.test(name);

  return {
    available: isNvidia,
    gpuName: info.gpuName || null,
    driverVersion: info.driverVersion || null,
    panelAvailable: Boolean(info.keyPath),
    steps: STEPS,
    note:
      'Image Scaling ve keskinleştirme ayarları NVIDIA profil veritabanında tutulur. Bu dosyayı ikili olarak düzenlemek riskli olduğu için Omerta FPS bu değerleri otomatik yazmaz; panelde senin yerine yönlendirme sunar.'
  };
}

async function openPanel() {
  return nvidia.openControlPanel();
}

module.exports = { status, openPanel };
