# GitHub'a Yayınlama ve Otomatik Güncelleme Rehberi

Bu proje artık iki aşamalı bir yayın akışına sahip:

1. `v*` biçiminde bir etiket push edilir (ör. `v1.1.1`).
2. `.github/workflows/release.yml` Windows runner'da testleri çalıştırır, renderer'ı derler,
   `electron-builder` ile NSIS kurulum dosyasını üretir ve GitHub Release'e yükler
   (`OmertaFPS-Setup-<sürüm>.exe`, `latest.yml`, `.blockmap`).
3. Kurulu cihazlar açılışta `electron-updater` ile `latest.yml` dosyasını okur, yeni sürümü
   arka planda indirir ve arayüzde yüzdeyi gösterir. "Yeniden başlat ve kur" ile güncellenir.

## 0. Önce güvenlik

Daha önce sohbet ortamında paylaşılan PAT (Personal Access Token) açık metin olarak görünmüş
durumda. **Onu iptal et.** Yayın akışı artık kişisel token kullanmıyor; yeni bir token
oluşturmana gerek yok.

Satıcıya ait `licenses.json`, `lisans-kodlari.txt` ve `scripts/generate-keys.js` (2000 geçerli
anahtar üreten satıcı aracı) `.gitignore` içinde. Bu dosyalar public repoya **asla** girmemeli;
uygulamaya yalnızca `licenses.hashes.json` gömülür.

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

## 2. Yetkilendirme: kişisel token gerekmiyor

Workflow, GitHub'ın kendi ürettiği `GITHUB_TOKEN`'ı kullanır:

```yaml
permissions:
  contents: write

# ...
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Bu token her çalıştırmada otomatik oluşturulur, yalnızca o iş için geçerlidir ve silinmez.
Repo **Settings → Secrets and variables → Actions** bölümüne elle bir secret eklemen
gerekmez. `permissions: contents: write` satırı release oluşturup dosya yüklemek için yeterlidir.

## 3. İndirme dayanıklılığı (504 hatası)

GitHub'ın release/dosya CDN'i zaman zaman `504` döndürüyor. Workflow bu yüzden electron ve
electron-builder araçlarını aynadan indirir, önbelleğe alır ve bütünlüğünü doğrular:

```yaml
env:
  ELECTRON_MIRROR: https://npmmirror.com/mirrors/electron/
  ELECTRON_BUILDER_BINARIES_MIRROR: https://npmmirror.com/mirrors/electron-builder-binaries/
```

- `actions/cache@v4` Electron ve builder araçlarını önbellekte tutar; sonraki sürümlerde indirme
  yapılmaz.
- Electron zip'inin SHA-256 değeri resmi değerle karşılaştırılır, uyuşmazsa dosya silinip yayın
  durdurulur.
- electron-builder, kendi gömülü checksum'larıyla indirdiği tüm araçları doğrular.
- Yayın adımı 3 kez denenir; her deneme arasında 20 saniye beklenir.
- Son adım (`Verify and complete release assets`) release'teki üç dosyayı listeler; eksik olanı
  `gh release upload` ile tamamlar. GitHub kesintilerinde electron-builder büyük `.exe` dosyasını
  yüklemeden başarılı dönebildiği için bu kontrol zorunlu.

> Aynalar yalnızca **indirme** içindir. Release'i her zaman bu reponun Actions akışı üretir;
> dışarıdan gelen bir kurulum dosyası yüklenmez.

## 4. Repo durumu ve push

Depo kuruldu: `https://github.com/omertamedya-arch/OmertaFPS` (public).
`origin/main` bu depoya bağlı, etiketler de push edildi. Her değişiklikten sonra:

```bash
git status
git add <degisen-dosyalar>
git commit -m "kisa aciklama"
git push origin main
```

Push etmeden önce `git status` çıktısında `licenses.json`, `lisans-kodlari.txt` veya
`scripts/generate-keys.js` görünmediğini kontrol et; görünüyorsa `git rm --cached` ile
takipten çıkar.

## 5. Yeni sürüm yayınla

Etiket, `package.json` sürümüyle birebir eşleşmelidir (workflow bunu doğrular):

```bash
# 1.2.0 -> 1.2.1
npm version patch --no-git-tag-version

git add package.json package-lock.json
git commit -m "v1.2.1"
git tag v1.2.1
git push origin main
git push origin v1.2.1
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
