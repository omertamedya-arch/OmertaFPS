param(
  [string]$InstallDir = (Join-Path $env:ProgramFiles 'Omerta FPS Pro'),
  [switch]$NoShortcuts,
  [switch]$NoLaunch
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$AppName = 'Omerta FPS Pro'
$ExeName = 'OmertaFPS.exe'
$ZipPath = Join-Path $PSScriptRoot 'app.zip'

function Fail([string]$message) {
  Write-Host ''
  Write-Host "HATA: $message" -ForegroundColor Red
  exit 1
}

function Set-ShortcutRunAsAdmin([string]$path) {
  if (-not (Test-Path -LiteralPath $path)) { return }
  try {
    $bytes = [System.IO.File]::ReadAllBytes($path)
    if ($bytes.Length -gt 0x15) {
      $bytes[0x15] = [byte]($bytes[0x15] -bor 0x20)
      [System.IO.File]::WriteAllBytes($path, $bytes)
    }
  } catch {
    Write-Host '  Uyarı: Kısayol yönetici bayrağı yazılamadı.' -ForegroundColor Yellow
  }
}

try {
  $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
  $principal = New-Object Security.Principal.WindowsPrincipal($identity)
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Fail 'Kurulum için yönetici izni gerekli.'
  }

  if (-not (Test-Path -LiteralPath $ZipPath)) {
    Fail 'app.zip paketi bulunamadı.'
  }

  Write-Host ''
  Write-Host '  OMERTA FPS PRO' -ForegroundColor Cyan
  Write-Host '  E-spor ve oyun optimizasyonu kurulumu' -ForegroundColor DarkGray
  Write-Host ''

  $running = Get-Process -Name 'OmertaFPS' -ErrorAction SilentlyContinue
  if ($running) {
    Write-Host '  Çalışan Omerta FPS kapatılıyor...'
    $running | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 900
  }

  Write-Host "  Kurulum klasörü: $InstallDir"
  if (Test-Path -LiteralPath $InstallDir) {
    Remove-Item -LiteralPath $InstallDir -Recurse -Force
  }
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null

  Write-Host '  Dosyalar açılıyor...'
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $InstallDir)

  $exePath = Join-Path $InstallDir $ExeName
  if (-not (Test-Path -LiteralPath $exePath)) {
    Fail 'Uygulama dosyası çıkarılamadı.'
  }

  $iconPath = Join-Path $InstallDir 'resources\app\assets\omerta.ico'
  if (-not (Test-Path -LiteralPath $iconPath)) {
    $iconPath = $exePath
  }

  if (-not $NoShortcuts) {
    Write-Host '  Masaüstü ve başlat menüsü kısayolları oluşturuluyor...'
    $shell = New-Object -ComObject WScript.Shell

    $desktopDir = [Environment]::GetFolderPath('CommonDesktopDirectory')
    New-Item -ItemType Directory -Force -Path $desktopDir | Out-Null
    $desktopLink = Join-Path $desktopDir "$AppName.lnk"
    $shortcut = $shell.CreateShortcut($desktopLink)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.IconLocation = $iconPath
    $shortcut.Description = 'Omerta FPS Pro - E-spor ve oyun optimizasyonu'
    $shortcut.Save()
    Set-ShortcutRunAsAdmin $desktopLink

    $startDir = [Environment]::GetFolderPath('CommonPrograms')
    New-Item -ItemType Directory -Force -Path $startDir | Out-Null
    $startLink = Join-Path $startDir "$AppName.lnk"
    $shortcut = $shell.CreateShortcut($startLink)
    $shortcut.TargetPath = $exePath
    $shortcut.WorkingDirectory = $InstallDir
    $shortcut.IconLocation = $iconPath
    $shortcut.Description = 'Omerta FPS Pro - E-spor ve oyun optimizasyonu'
    $shortcut.Save()
    Set-ShortcutRunAsAdmin $startLink
  }

  Write-Host '  Kaldırma bilgileri yazılıyor...'
  $dataDir = Join-Path $env:ProgramData 'OmertaFPS'
  New-Item -ItemType Directory -Force -Path $dataDir | Out-Null

  $uninstallScript = @'
$ErrorActionPreference = 'Stop'
$AppName = 'Omerta FPS Pro'
$InstallDir = Join-Path $env:ProgramFiles 'Omerta FPS Pro'

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = New-Object Security.Principal.WindowsPrincipal($identity)
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Start-Process powershell.exe -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $PSCommandPath) -Verb RunAs
  exit
}

$hasDialog = $true
try {
  Add-Type -AssemblyName PresentationFramework
  $answer = [System.Windows.MessageBox]::Show('Omerta FPS Pro bu bilgisayardan kaldırılsın mı?', 'Omerta FPS Pro', 'YesNo', 'Question')
  if ($answer -ne 'Yes') { exit }
} catch {
  $hasDialog = $false
}

Get-Process -Name 'OmertaFPS' -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Milliseconds 600

$desktopLink = Join-Path ([Environment]::GetFolderPath('CommonDesktopDirectory')) "$AppName.lnk"
$startLink = Join-Path ([Environment]::GetFolderPath('CommonPrograms')) "$AppName.lnk"
if (Test-Path -LiteralPath $desktopLink) { Remove-Item -LiteralPath $desktopLink -Force -ErrorAction SilentlyContinue }
if (Test-Path -LiteralPath $startLink) { Remove-Item -LiteralPath $startLink -Force -ErrorAction SilentlyContinue }

$uninstallKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Omerta FPS Pro'
if (Test-Path $uninstallKey) { Remove-Item -Path $uninstallKey -Recurse -Force -ErrorAction SilentlyContinue }

if (Test-Path -LiteralPath $InstallDir) {
  Remove-Item -LiteralPath $InstallDir -Recurse -Force
}

if ($hasDialog) {
  [System.Windows.MessageBox]::Show('Omerta FPS kaldırıldı.', 'Omerta FPS', 'OK', 'Information') | Out-Null
}
'@

  $uninstallPath = Join-Path $dataDir 'uninstall.ps1'
  Set-Content -LiteralPath $uninstallPath -Value $uninstallScript -Encoding UTF8

  $uninstallKey = 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Omerta FPS Pro'
  New-Item -Path $uninstallKey -Force | Out-Null

  $sizeBytes = (Get-ChildItem -LiteralPath $InstallDir -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  $estimatedKb = [int](($sizeBytes / 1KB) -as [double])

  $displayIcon = $iconPath + ',0'
  $uninstallCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$uninstallPath`""

  Set-ItemProperty -Path $uninstallKey -Name 'DisplayName' -Value $AppName
  Set-ItemProperty -Path $uninstallKey -Name 'DisplayVersion' -Value '1.1.0'
  Set-ItemProperty -Path $uninstallKey -Name 'Publisher' -Value 'Omerta FPS'
  Set-ItemProperty -Path $uninstallKey -Name 'DisplayIcon' -Value $displayIcon
  Set-ItemProperty -Path $uninstallKey -Name 'InstallLocation' -Value $InstallDir
  Set-ItemProperty -Path $uninstallKey -Name 'UninstallString' -Value $uninstallCmd
  Set-ItemProperty -Path $uninstallKey -Name 'QuietUninstallString' -Value $uninstallCmd
  Set-ItemProperty -Path $uninstallKey -Name 'NoModify' -Value 1 -Type DWord
  Set-ItemProperty -Path $uninstallKey -Name 'NoRepair' -Value 1 -Type DWord
  Set-ItemProperty -Path $uninstallKey -Name 'EstimatedSize' -Value $estimatedKb -Type DWord

  Write-Host ''
  Write-Host '  Kurulum tamamlandı.' -ForegroundColor Green
  Write-Host '  Masaüstünde "Omerta FPS Pro" kısayolu hazır.' -ForegroundColor Green
  Write-Host ''

  if (-not $NoLaunch) {
    Write-Host '  Omerta FPS başlatılıyor...'
    Start-Process -FilePath $exePath -WorkingDirectory $InstallDir
  }

  Start-Sleep -Milliseconds 1200
  exit 0
} catch {
  Fail $_.Exception.Message
}
