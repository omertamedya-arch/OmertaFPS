# GitHub'a Yayınlama ve Otomatik Güncelleme Rehberi

Bu proje artık iki aşamalı bir yayın akışına sahip:

1. `v*` biçiminde bir etiket push edilir (ör. `v1.1.1`).
2. `.github/workflows/release.yml` Windows runner'da testleri çalıştırır, renderer'ı derler,
   `electron-builder` ile NSIS kurulum dosyasını üretir ve GitHub Release'e yükler
   (`OmertaFPS-Setup-<sürüm>.exe`, `latest.yml`, `.blockmap`).
3. Kurulu cihazlar açılışta `electron-updater` ile `latest.yml` dosyasını okur, yeni sürümü
   arka planda indirir ve arayüzde yüzdeyi gösterir. "Yeniden başlat ve kur" ile güncellenir.

## 0. Önce güvenlik: paylaşılan token

Sohbet ortamında paylaşılan PAT (Personal Access Token) artık açık metin olarak görünür durumda.
**Onu iptal et ve yeni bir token üret.** Yeni tokenı hiçbir dosyaya, workflow'a veya commit'e yazma;
yalnızca GitHub Secrets içine ekle.

Ayrıca satıcıya ait `licenses.json` ve `lisans-kodlari.txt` dosyaları `.gitignore` içine eklendi.
Bu iki dosya repoya **asla** girmemeli; uygulamaya yalnızca `licenses.hashes.json` gömülür.

## 1. Yayın hedefini (owner/repo) kontrol et

`package.json` içindeki `build.publish` bloğu şu an şu şekilde ayarlı:

```json
"publish": {
  "provider": "github",
  "owner": "omertamedya-arch",
  "repo": "OmertaFPS",
  "releaseType": "release"
}
```

Repo adın farklıysa `owner`/`repo` değerlerini güncelle. Workflow, değerler hâlâ
`YOUR_GITHUB_USERNAME` / `YOUR_REPO_NAME` placeholder'ı ise bilinçli olarak hata verir.

> Otomatik güncellemenin çalışması için repo **public** olmalıdır. Private repoda
> `electron-updater` release dosyalarını okuyamaz; her istemciye token gömmek güvenli değildir.

## 2. Yeni PAT oluştur

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**:

- Repository access: **Only select repositories** → bu repo
- Permissions → **Contents: Read and write**

Klasik token kullanacaksan `repo` kapsamı yeterlidir.

## 3. Tokenı GitHub Secrets'a ekle

Repo sayfasında **Settings → Secrets and variables → Actions → New repository secret**:

- Name: `GH_TOKEN`
- Secret: yeni PAT

Alternatif olarak GitHub CLI ile (token komut geçmişine yazılmasın diye sorulunca yapıştır):

```powershell
gh secret set GH_TOKEN
```

Workflow bu secret'ı `GH_TOKEN` ortam değişkeni olarak `electron-builder`'a verir.

## 4. Projeyi GitHub'a pushla

Klasör henüz bir git deposu değil. İlk kez yayınlarken:

```bash
git init
git add .
git commit -m "Omerta FPS Pro ilk yayın"
git branch -M main
git remote add origin https://github.com/<kullanici>/<repo>.git
git push -u origin main
```

Push etmeden önce `git status` çıktısında `licenses.json` veya `lisans-kodlari.txt`
görünmediğini kontrol et; görünüyorsa `git rm --cached` ile takipten çıkar.

## 5. Yeni sürüm yayınla

Etiket, `package.json` sürümüyle birebir eşleşmelidir (workflow bunu doğrular):

```bash
# 1.1.0 -> 1.1.1
npm version patch --no-git-tag-version

git add package.json package-lock.json
git commit -m "v1.1.1"
git tag v1.1.1
git push origin main --tags
```

Etiket push edildiğinde workflow otomatik başlar. Birkaç dakika sonra repo'nun
**Releases** bölümünde yeni sürüm ve kurulum dosyası görünür.

## 6. Cihazlardaki güncelleme akışı

- Uygulama açıldıktan ~6 saniye sonra sessizce kontrol eder; kullanıcıyı rahatsız etmez.
- Yeni sürüm varsa arka planda indirir; sol alttaki kartta yüzde ve boyut görünür.
- İndirme bitince "Yeniden başlat ve kur" butonu çıkar; açık modüller güvenli biçimde
  kapatıldıktan sonra kurulum başlar.
- `autoInstallOnAppQuit` açık olduğu için kullanıcı butona basmasa da uygulamadan çıkarken
  güncelleme kurulur.

## Önemli notlar

- **Eski IExpress kurulumları otomatik güncellenmez.** `electron-updater` yalnızca
  `electron-builder` ile üretilen NSIS kurulumları için çalışır. Mevcut cihazlara bir kez
  yeni NSIS setup'ı kurulmalı; sonraki sürümler otomatik gelir.
- Uygulama yönetici olarak çalıştığı için (`requireAdministrator`, per-machine kurulum)
  güncelleme kurulurken Windows UAC onayı isteyebilir.
- Kurulum dosyası kod imzalı değilse SmartScreen uyarısı çıkabilir. Kod imzalama sertifikası
  eklendiğinde `electron-builder` otomatik olarak imzalar.
- Workflow testleri de çalıştırır; testlerden biri başarısız olursa yayın durur.
- Release dosyaları: `OmertaFPS-Setup-<sürüm>.exe`, `latest.yml` ve `.blockmap`.
  `latest.yml` olmadan istemciler güncellemeyi bulamaz; electron-builder bunu otomatik üretir.
