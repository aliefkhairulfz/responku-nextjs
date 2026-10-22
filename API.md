# Responku API

Semua endpoint berada di bawah `/api` pada origin yang sama. Request body berformat JSON
(`Content-Type: application/json`). Autentikasi memakai **cookie session** (HTTP-only), jadi client
harus mengirim cookie (`credentials: "include"` pada `fetch`).

- [Konvensi](#konvensi)
- [Kode error](#kode-error)
- [Kosakata (enum)](#kosakata-enum)
- [Auth](#auth)
- [User](#user)
- [Research](#research)
- [Payment & wallet](#payment--wallet)
- [Catatan & yang belum ada](#catatan--yang-belum-ada)

---

## Konvensi

### Envelope sukses

Semua response sukses memakai bentuk yang sama:

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {},
    "meta": {}
}
```

### Envelope error

```json
{
    "ok": false,
    "statusCode": 422,
    "message": "Validation failed",
    "errors": {
        "email": "A valid email address is required"
    }
}
```

`errors` berisi pesan per-field (key-nya path field, mis. `questions.0.choices` untuk item bersarang).
Untuk error yang tidak terkait field (mis. body kosong saat PATCH), key-nya `_root`.

### Body & field tak dikenal

Validasi memakai Zod dengan mode default, jadi **key yang tidak dikenal dibuang tanpa error**.
Kirim hanya field yang ada di dokumentasi ini. Field opsional yang **tidak dikirim** tidak diubah;
yang dikirim harus valid.

---

## Kode error

| Status | Kapan                                                             |
| ------ | ----------------------------------------------------------------- |
| `401`  | Belum login / session tidak valid / expired                       |
| `403`  | Sudah login tapi tidak punya role yang dibutuhkan                 |
| `404`  | Resource tidak ada, bukan milik pemanggil, atau sudah dihapus     |
| `409`  | Bentrok state (mis. email sudah terdaftar, riset sudah dipublish) |
| `422`  | Validasi gagal — **termasuk body yang bukan JSON valid**          |
| `429`  | Terlalu sering: cooldown kirim ulang, atau percobaan kode habis   |
| `500`  | Error tak terduga                                                 |

> Catatan: `422` dipakai untuk **semua** kegagalan validasi di project ini, bukan `400`.

### Format body yang salah

```json
{ "ok": false, "statusCode": 422, "message": "Request body must be valid JSON", "errors": {} }
```

---

## Kosakata (enum)

Nilai-nilai ini dipakai di request dan response:

| Field                  | Nilai                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `roles`                | `researcher`, `respondent`, `admin`                                                     |
| `gender`               | `male`, `female`                                                                        |
| `education`            | `high_school`, `diploma`, `bachelor`, `master`, `doctorate`                             |
| `religion`             | `islam`, `protestant`, `catholic`, `hindu`, `buddhist`, `confucian`                     |
| `category` (research)  | `fintech`, `retail`, `education`, `health`, `technology`                                |
| `operator` (criteria)  | `EQ`, `NEQ`, `IN`, `NOT_IN`, `GT`, `GTE`, `LT`, `LTE`, `BETWEEN`                        |
| `questionType`         | `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TEXT`, `NUMBER`, `SCALE`                           |
| `status` (research)    | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `CLOSED`, `COMPLETED`, `REJECTED`, `CANCELLED`  |
| `type` (token mutasi)  | `TOPUP`, `RESERVE`, `RELEASE`, `CONSUME`, `REWARD`, `WITHDRAW`, `FEE`, `REFUND`         |
| `status` (payment)     | `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `REFUNDED`                                      |
| `category` (ticket)    | `DISPUTE`, `RESEARCH`, `TRANSACTION`, `ACCOUNT`, `OTHER`                                |
| `status` (ticket)      | `REVIEW`, `RESOLVED`, `REJECTED`                                                        |
| `language` (setting)   | `id`, `en`                                                                              |
| `theme` (setting)      | `light`, `system`                                                                       |
| `status` (partisipasi) | `JOINED`, `IN_PROGRESS`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `EXPIRED` |
| `screeningResult`      | `PASS`, `FAIL`, `NEEDS_REVIEW`                                                          |
| `status` (reward)      | `PENDING`, `HELD`, `PAID`, `CANCELLED`                                                  |

`roles` disimpan sebagai JSON array. User yang baru mendaftar mendapat
`["researcher", "respondent"]`; admin `["researcher", "respondent", "admin"]`.

---

## Auth

### `POST /api/auth/register`

Membuat akun email + password, lalu mengirim OTP ke email tersebut.

**Request**

```json
{ "name": "Alief", "email": "alief@example.com", "password": "supersecret1" }
```

| Field      | Aturan                                        |
| ---------- | --------------------------------------------- |
| `name`     | wajib, 1–100 karakter (di-trim)               |
| `email`    | wajib, format email, di-trim dan di-lowercase |
| `password` | wajib, 8–72 karakter                          |

**Response `201`**

```json
{
    "ok": true,
    "statusCode": 201,
    "message": "Registration successful. Check your email for the verification code.",
    "data": {
        "user": { "id": "…", "name": "Alief", "email": "alief@example.com", "verifiedAt": null },
        "verificationSent": true
    }
}
```

`verificationSent` bernilai `false` bila email gagal dikirim — akun tetap dibuat, jadi pakai flag ini
untuk memberi tahu user agar mencoba lagi.

**Error:** `409` email sudah terdaftar · `422` validasi.

---

### `POST /api/auth/login`

Memverifikasi kredensial dan memulai session (set cookie).

**Request**

```json
{ "email": "alief@example.com", "password": "supersecret1" }
```

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Login successful",
    "data": {
        "user": {
            "id": "…",
            "name": "Alief",
            "email": "alief@example.com",
            "roles": ["researcher", "respondent"],
            "verifiedAt": null
        },
        "expiresAt": "2026-11-21T00:00:00.000Z"
    }
}
```

Session berlaku **30 hari**. Cookie: `SESSION_COOKIE_NAME` (default `nextjs_session`),
HTTP-only, `SameSite=Lax`, path `/`.

**Error:** `401` email atau password salah (pesan sama untuk akun tidak ada, password salah, dan akun
nonaktif, supaya tidak bisa dipakai menebak email terdaftar) · `422` validasi.

---

### `POST /api/auth/confirm-verification`

Menukar OTP email dengan status terverifikasi. Tidak butuh login — akun diidentifikasi lewat email.

**Request**

```json
{ "email": "alief@example.com", "code": "123456" }
```

| Field   | Aturan               |
| ------- | -------------------- |
| `email` | wajib, format email  |
| `code`  | wajib, tepat 6 digit |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Account verified",
    "data": {
        "user": { "id": "…", "name": "Alief", "email": "alief@example.com", "verifiedAt": "2026-10-22T…" },
        "alreadyVerified": false
    }
}
```

- Kode berlaku **15 menit** dan **sekali pakai** (row verifikasi dihapus saat berhasil).
- **Kode salah dihitung.** Setelah 5 percobaan, kodenya dibuang dan endpoint membalas `429`, jadi
  kode 6 digit tidak bisa di-brute force. Minta kode baru lewat `resend-verification`.
- Idempoten: kalau akun sudah terverifikasi, response `200` dengan
  `message: "Account is already verified"` dan `alreadyVerified: true`.

**Error:** `422` kode salah / kedaluwarsa / akun tidak ada (pesannya sengaja disamakan) · `429`
percobaan habis.

---

### `POST /api/auth/resend-verification`

Mengirim kode verifikasi baru ke email terdaftar. Inilah yang membuat masa berlaku 15 menit tidak
menjadi jalan buntu.

**Request**

```json
{ "email": "alief@example.com" }
```

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Verification code sent",
    "data": { "verificationSent": true, "alreadyVerified": false, "expiresAt": "2026-10-22T10:15:00.000Z" }
}
```

- Kode lama langsung tidak berlaku begitu kode baru diterbitkan.
- Akun yang sudah terverifikasi → `200` dengan `message: "Account is already verified"`,
  `alreadyVerified: true`, dan tidak ada email yang dikirim.
- `verificationSent: false` berarti pengiriman email gagal. Kodenya tetap ada, jadi tawarkan coba lagi.

**Error:** `422` akun tidak ditemukan · `429` kirim ulang terlalu cepat (cooldown 60 detik).

---

### `POST /api/auth/change-email`

Memulai perubahan email. **Butuh login**, dan password wajib diulang karena mengganti email sudah
cukup untuk mengambil alih akun. Kode dikirim ke **email baru**, jadi hanya pemilik inbox itu yang
bisa menyelesaikan perubahan.

**Request**

```json
{ "email": "baru@example.com", "password": "supersecret1" }
```

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Verification code sent to the new email",
    "data": { "email": "baru@example.com", "verificationSent": true, "expiresAt": "2026-10-22T10:15:00.000Z" }
}
```

Email baru disimpan sebagai `target` pada row verifikasi sampai dikonfirmasi.

**Error:** `401` belum login atau password salah · `409` email sudah dipakai akun lain · `422` email
sama dengan yang sekarang · `429` cooldown.

---

### `POST /api/auth/confirm-email-change`

Menyelesaikan perubahan email dengan kode yang dikirim ke alamat baru. **Butuh login.**

**Request**

```json
{ "code": "123456" }
```

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Email changed",
    "data": {
        "user": { "id": "…", "name": "Alief", "email": "baru@example.com", "verifiedAt": "2026-10-22T…" }
    }
}
```

- Session tetap berlaku, karena disimpan per `userId`, bukan per email.
- Alamat baru langsung dianggap terverifikasi, karena kodenya membuktikan kepemilikan inbox itu.

**Error:** `401` · `422` kode salah/kedaluwarsa atau tidak ada perubahan tertunda · `429` percobaan habis.

---

### `POST /api/auth/logout`

Menghapus session dan cookie. Tidak butuh body. Idempoten — logout tanpa session tetap `200`.

```json
{ "ok": true, "statusCode": 200, "message": "Logout successful", "data": {}, "meta": {} }
```

---

### `GET /api/auth/me`

Mengembalikan user yang sedang login. Butuh session.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Current user",
    "data": {
        "user": {
            "id": "…",
            "name": "Alief",
            "email": "alief@example.com",
            "image": null,
            "roles": ["researcher", "respondent"],
            "verifiedAt": null,
            "createdAt": "2026-10-22T00:00:00.000Z"
        }
    }
}
```

**Error:** `401`.

---

## User

### `GET /api/user/profile`

Profil demografi milik user yang login. Butuh login.

`profile` bernilai `null` bila user belum pernah mengisi profil — registrasi tidak membuatnya, jadi
"belum ada profil" adalah keadaan normal, bukan `404`. Bentuk objeknya sama persis dengan response
`PATCH` di bawah.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Profile",
    "data": { "profile": null }
}
```

**Error:** `401`.

---

### `PATCH /api/user/profile`

Membuat atau memperbarui profil demografi milik user yang login.

- Profil dibuat saat penulisan **pertama** (registrasi tidak membuat profil).
- Kolom demografi bersifat NOT NULL, jadi **penulisan pertama harus lengkap**; setelah itu boleh sebagian.
- Field yang tidak dikirim tidak diubah. Hanya `religion` dan `phoneNumber` yang boleh `null` (untuk
  mengosongkan).

**Request**

| Field             | Aturan                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| `gender`          | opsional, enum                                                           |
| `education`       | opsional, enum                                                           |
| `province`        | opsional, 1–100 karakter (di-trim)                                       |
| `city`            | opsional, 1–100 karakter                                                 |
| `latitude`        | opsional, −90 s/d 90                                                     |
| `longitude`       | opsional, −180 s/d 180                                                   |
| `occupation`      | opsional, 1–100 karakter                                                 |
| `phoneNumber`     | opsional, 7–20 karakter, digit dengan spasi/`+`/`-`/`()` **atau** `null` |
| `religion`        | opsional, enum **atau** `null`                                           |
| `religionConsent` | opsional, boolean                                                        |

```json
{
    "gender": "female",
    "education": "bachelor",
    "province": "DKI Jakarta",
    "city": "Jakarta Selatan",
    "latitude": -6.261493,
    "longitude": 106.8106,
    "occupation": "Researcher",
    "phoneNumber": "081234567890",
    "religion": "islam",
    "religionConsent": true
}
```

**Membuat profil (belum punya profil):** wajib mengirim `gender`, `education`, `province`, `city`,
`latitude`, `longitude`, dan `occupation` sekaligus. `phoneNumber` tidak termasuk — nomornya boleh
diisi belakangan. Kalau field wajibnya kurang, `422` dengan error per-field yang menyebut field mana
yang kurang.

**Aturan consent (UU PDP):** agama termasuk data sensitif.

- Mengungkap agama tanpa consent → `422` dengan error `religionConsent`.
- Menarik consent (`religionConsent: false`) menghapus agama yang tersimpan sekaligus consent-nya.
- Mengirim `religion` bersamaan dengan `religionConsent: false` → `422` (kontradiktif).
- `religionConsentAt` hanya dicap saat consent **pertama kali** diberikan, supaya audit trail tidak
  ikut berubah tiap kali user save ulang.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Profile updated",
    "data": {
        "profile": {
            "gender": "female",
            "education": "bachelor",
            "province": "DKI Jakarta",
            "city": "Jakarta Selatan",
            "latitude": -6.261493,
            "longitude": 106.8106,
            "occupation": "Researcher",
            "phoneNumber": "081234567890",
            "religion": "islam",
            "religionConsent": true,
            "religionConsentAt": "2026-10-22T…",
            "domicileVerified": false,
            "domicileVerifiedAt": null,
            "updatedAt": "2026-10-22T…"
        }
    }
}
```

`religion` bernilai `null` bila user tidak mengungkapkannya. `domicileVerified` hanya bisa diisi oleh
sistem — tidak bisa di-set lewat API ini.

**Error:** `401` · `422` validasi.

---

### `POST /api/user/avatar`

Mengunggah **foto profil** milik user yang login. Butuh login.

Body-nya `multipart/form-data` dengan satu field bernama `file`:

```sh
curl -X POST http://localhost:3000/api/user/avatar \
  -b cookies.txt \
  -F "file=@./foto.png;type=image/png"
```

Berkasnya diteruskan ke **Cloudinary** lewat REST API-nya, dan yang disimpan ke database
(`User.image`) hanya `secure_url` hasil unggahan — byte-nya tetap di Cloudinary. Barisnya jadi kecil,
dan gambarnya tidak ikut hilang saat deploy.

Asset-nya diberi `public_id` tetap, yaitu
`<CLOUDINARY_UPLOAD_USER_PROFILE_FOLDER>/<userId>`, sehingga unggahan kedua **menimpa** yang pertama
(`overwrite` + `invalidate`) — satu akun, satu foto, tanpa sampah asset. Segmen versi di URL ikut
berubah, jadi browser/CDN tidak menyajikan cache lama.

Batas unggahan dibaca dari env dan **dicek di server**, bukan di browser:

- `MAX_FILE_SIZE_UPLOAD` — ukuran maksimal satu berkas dalam byte (default `1000000`, yaitu 1 MB).
- `ALLOWED_MIME_TYPE` — daftar tipe MIME yang diterima, dipisah karakter `|` (default
  `image/png|image/jpeg`).
- `MAX_FILE_COUNT` — jumlah berkas per request; disiapkan untuk unggah banyak berkas, unggah tunggal
  mengabaikannya.

Kredensial yang dipakai: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, dan `CLOUDINARY_API_SECRET`
(auth HTTP Basic). Ketiganya opsional: selama belum diisi, endpoint ini menjawab `503` alih-alih
menggagalkan boot aplikasi.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Profile photo updated",
    "data": {
        "user": {
            "id": "…",
            "name": "Curl Tester",
            "email": "curl-test@example.com",
            "image": "https://res.cloudinary.com/<cloud>/image/upload/v1792671776/responku/userProfiles/<userId>.png",
            "roles": ["researcher", "respondent"],
            "verifiedAt": null,
            "createdAt": "2026-10-22T…"
        }
    }
}
```

Bentuk `user`-nya sama persis dengan `GET /api/auth/me`, jadi client bisa langsung menimpanya.

**Error:**

- `401` belum login.
- `422` — `file` tidak ada (`{"file": "Attach the image as the \"file\" field."}`), berkas kosong,
  melebihi `MAX_FILE_SIZE_UPLOAD`, tipe MIME-nya tidak di `ALLOWED_MIME_TYPE`, atau body-nya bukan
  `multipart/form-data`.
- `502` Cloudinary menolak unggahan (mis. berkasnya rusak); pesan dari Cloudinary yang diteruskan.
- `503` `CLOUDINARY_*` belum diisi.

---

### `GET /api/user/settings`

Preferensi akun yang login (halaman **Account Settings**). Butuh login.

Mencakup tiga tab: **Umum** (`language`, `theme`, `compactMode`), **Notifikasi** (`notify*`), dan
**Privasi & Keamanan** (`privacy*`, `securityTwoFactorAuth`).

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Account settings",
    "data": {
        "settings": {
            "language": "id",
            "theme": "light",
            "compactMode": false,
            "notifyEmail": true,
            "notifyPush": true,
            "notifySurveyReminder": true,
            "notifyReward": true,
            "notifyWeeklySummary": false,
            "notifyPromotion": false,
            "privacyPublicProfile": true,
            "privacyOnlineStatus": true,
            "privacyAnalyticsSharing": false,
            "securityTwoFactorAuth": false,
            "updatedAt": "2026-10-22T…"
        }
    }
}
```

**Barisnya dibuat saat dibaca pertama kali.** User yang belum pernah mengubah apa pun belum punya baris,
jadi `GET` ini membuatnya dengan nilai default kolom — supaya default hanya hidup di schema, bukan
terduplikasi di kode. Efek sampingnya `GET` ini menulis sekali per akun.

`securityTwoFactorAuth` hanya mencatat keinginan user; 2FA-nya sendiri belum ada, jadi jangan dipakai
sebagai penjaga apa pun.

**Error:** `401`.

---

### `PATCH /api/user/settings`

Memperbarui sebagian preferensi akun. Butuh login.

Semua field opsional (field yang tidak dikirim tidak diubah) dan **tidak ada yang menerima `null`** —
setiap kolom NOT NULL dengan default, jadi preferensi bisa diubah tapi tidak bisa dikosongkan.

| Field                     | Aturan                       |
| ------------------------- | ---------------------------- |
| `language`                | opsional, `id` / `en`        |
| `theme`                   | opsional, `light` / `system` |
| `compactMode`             | opsional, boolean            |
| `notifyEmail`             | opsional, boolean            |
| `notifyPush`              | opsional, boolean            |
| `notifySurveyReminder`    | opsional, boolean            |
| `notifyReward`            | opsional, boolean            |
| `notifyWeeklySummary`     | opsional, boolean            |
| `notifyPromotion`         | opsional, boolean            |
| `privacyPublicProfile`    | opsional, boolean            |
| `privacyOnlineStatus`     | opsional, boolean            |
| `privacyAnalyticsSharing` | opsional, boolean            |
| `securityTwoFactorAuth`   | opsional, boolean            |

```json
{ "theme": "system", "notifyPromotion": true, "compactMode": true }
```

**Response `200`** — bentuk `settings`-nya sama dengan `GET` di atas.

**Error:** `401` · `422` — body kosong (`{"_root": "Provide at least one setting to update"}`), atau
`language`/`theme` di luar daftar.

---

### `GET /api/user/sessions`

Daftar perangkat yang sedang login ke akun pemanggil, terbaru dulu. Butuh login.

Ini baris dari tabel `sessions` yang sudah ada — tidak ada tabel baru untuk “Sesi Aktif”. Hanya sesi
yang masih berlaku yang ditampilkan (yang kedaluwarsa disaring), karena yang ditanya adalah “sedang
login di mana”.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Active sessions",
    "data": {
        "sessions": [
            {
                "id": "…",
                "userAgent": "Mozilla/5.0 (Macintosh; …) Chrome/131.0.0.0 Safari/537.36",
                "ipAddress": "::1",
                "createdAt": "2026-10-22T…",
                "expiresAt": "2026-11-21T…",
                "current": true
            }
        ]
    }
}
```

`current` menandai sesi yang dipakai request ini, yang tidak ditawarkan tombol “Keluar” di UI.
`userAgent` dikirim mentah; label ramah seperti “Chrome di macOS” diturunkan di UI (sekadar petunjuk,
bukan fingerprint).

Yang **tidak** ada: lokasi perangkat (butuh geolokasi dari IP) dan “terakhir aktif” (tidak ada
pencatatan last-seen per request — yang tersedia hanya `createdAt` dan `expiresAt`).

**Error:** `401`.

---

### `DELETE /api/user/sessions/{id}`

Mengakhiri satu sesi milik pemanggil. Butuh login.

Dibatasi `userId`, jadi id milik orang lain dijawab `404` (bukan dihapus). Sesi yang sedang dipakai
**boleh** diakhiri — hasilnya sama dengan `logout`, dan hanya memengaruhi perangkat pemanggil sendiri.

Penghapusannya hard delete, sama seperti `logout`: sesi adalah artefak autentikasi yang fana.

**Response `200`** — `{ "revoked": 1 }`.

**Error:** `401` · `404` id tidak dikenal atau bukan milik pemanggil.

---

### `DELETE /api/user/sessions`

Mengakhiri **semua sesi lain** milik pemanggil; sesi yang dipakai request ini ikut disisakan, karena ini
aksi “keluar dari semua perangkat lain” — mengakhiri sesi sendiri justru akan mengeluarkan user dari
halaman yang baru ia pakai.

**Response `200`** — `{ "revoked": 2 }` (`0` bila memang tidak ada perangkat lain).

**Error:** `401`.

---

## Research

Semua endpoint research butuh **login** dan role **`researcher`** — kalau tidak, `401`/`403`.

Riset diidentifikasi lewat `{id}` di URL. Nama aksi (`create`) tidak pernah dianggap sebagai id.

### `GET /api/research`

Daftar riset milik pemanggil, yang paling baru diperbarui dulu.

**Query**

| Param    | Aturan                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------- |
| `status` | opsional, salah satu `DRAFT`/`PENDING_REVIEW`/`PUBLISHED`/`CLOSED`/`COMPLETED`/`REJECTED`/`CANCELLED` |
| `take`   | opsional, bilangan bulat 1–100 (default 50)                                                           |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Researches",
    "data": {
        "researches": [
            {
                "id": "…",
                "title": "",
                "status": "DRAFT",
                "questionCount": 0,
                "targetRespondentCount": 0,
                "tokensReserved": 0,
                "tokensConsumed": 0,
                "respondentCount": 0,
                "updatedAt": "2026-10-22T…"
            }
        ]
    }
}
```

`title` kosong untuk draft yang belum diberi judul. Riset yang sudah di-archive tidak ikut terdaftar, dan
query yang tidak valid dijawab `422` dengan key `status`/`take`.

`respondentCount` adalah jumlah partisipasi yang **sudah dikirim** (`submittedAt` terisi) — sekadar join
belum dihitung. Bandingkan dengan `targetRespondentCount` untuk progres "responden terkumpul".

**Error:** `401` · `403` bila bukan `researcher` · `422`.

---

### `GET /api/research/available`

Feed untuk **responden**: riset milik orang lain yang sedang dibuka dan yang belum dia **kirim**. Butuh
login, tapi **tidak** butuh role `researcher` — ini sisi sebaliknya dari resource yang sama.

Yang tidak ikut masuk daftar:

- riset milik pemanggil sendiri,
- yang statusnya bukan `PUBLISHED`,
- yang sudah di-archive,
- yang deadline-nya sudah lewat (statusnya masih `PUBLISHED`, tapi tidak lagi menerima jawaban),
- yang sudah dia **kirim** (`submittedAt` terisi).

Riset yang sudah dia **mulai tapi belum selesai** justru tetap ada di daftar, membawa `participation`-nya —
kalau tidak, pekerjaan yang belum selesai akan menghilang dari satu-satunya tempat ia bisa ditemukan lagi.
Kartunya yang membedakan: badge status plus tombol "Lanjutkan Kuesioner".

**Query**

| Param      | Aturan                                                                    |
| ---------- | ------------------------------------------------------------------------- |
| `category` | opsional, salah satu `fintech`/`retail`/`education`/`health`/`technology` |
| `take`     | opsional, bilangan bulat 1–100 (default 50)                               |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Available research",
    "data": {
        "researches": [
            {
                "id": "…",
                "title": "…",
                "description": "…",
                "category": "fintech",
                "researcherName": "…",
                "tokenPerRespondent": 2,
                "rewardIdr": 2000,
                "estimatedDurationMinutes": 8,
                "deadline": "2026-12-31T…",
                "daysLeft": 30,
                "respondentCount": 82,
                "targetRespondentCount": 100,
                "participation": { "id": "…", "status": "IN_PROGRESS" }
            }
        ]
    }
}
```

`rewardIdr` dihitung di server (`tokenPerRespondent × TOKEN_PRICE_IDR`), supaya client tidak perlu tahu
harga token. `daysLeft` juga dari server, supaya tidak ada komponen yang membaca jam saat render.
`respondentCount` mengikuti aturan yang sama dengan daftar peneliti: hanya partisipasi yang sudah dikirim.

`participation` adalah milik pemanggil sendiri bila ia sudah mulai, atau `null` — nilai yang sama dengan
`GET /api/research/available/{id}`. Statusnya yang membuat kartu bisa menuliskan "sedang dikerjakan" dan
memilih antara mulai atau melanjutkan.

**Error:** `401` · `422` query tidak valid.

---

### `GET /api/research/available/{id}`

Satu riset dari kumpulan yang sama, untuk halaman detailnya. Butuh login; role `researcher` tidak perlu,
jadi endpoint ini juga dilayani **sebelum** guard peneliti.

Aturan ketersediaannya sama dengan feed yang di atas, hanya diterapkan pada satu id — jadi halaman detail
tidak mungkin menampilkan sesuatu yang feed-nya sembunyikan. Satu perbedaan yang disengaja: riset yang
**sudah pemanggil ikuti** tetap dikembalikan beserta partisipasinya, justru supaya halamannya bisa
menawarkan melanjutkan, bukan memulai. Riset milik pemanggil sendiri, yang belum `PUBLISHED`, yang sudah
lewat deadline, atau yang di-archive dijawab `404` — satu jawaban yang sama, supaya keberadaannya tidak
bocor ke orang yang bukan sasarannya.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Available research",
    "data": {
        "research": {
            "id": "…",
            "title": "QRIS dan perilaku belanja",
            "description": "…",
            "category": "fintech",
            "researcherName": "…",
            "tokenPerRespondent": 2,
            "rewardIdr": 2000,
            "estimatedDurationMinutes": 8,
            "deadline": "2026-12-31T…",
            "daysLeft": 30,
            "respondentCount": 82,
            "targetRespondentCount": 100,
            "criteria": [{ "id": "…", "field": "occupation", "operator": "EQ", "value": "Guru" }]
        },
        "participation": null
    }
}
```

`participation` berisi `{ id, status }` milik pemanggil bila sudah ada, atau `null`. `criteria` dikirim
sebagai aturan apa adanya; cara membacanya urusan client (lihat **Kriteria (screening)** di bagian
Participation untuk arti operatornya).

**Error:** `401` · `404` riset tidak ada, bukan milik publik, sudah lewat deadline, atau bukan milik
pemanggil.

---

### `POST /api/research/create`

Membuat draft kosong. **Tidak butuh body** — skeleton-nya ditentukan backend, dan pemiliknya diambil
dari session.

**Response `201`**

```json
{
    "ok": true,
    "statusCode": 201,
    "message": "Research draft created",
    "data": {
        "research": {
            "id": "…",
            "researcherId": "…",
            "title": "",
            "description": "",
            "category": null,
            "externalSurveyUrl": null,
            "targetRespondentCount": 0,
            "estimatedDurationMinutes": 1,
            "deadline": "2026-11-06T…",
            "status": "DRAFT",
            "tokensReserved": 0,
            "tokensConsumed": 0,
            "publishedAt": null,
            "createdAt": "…",
            "updatedAt": "…"
        }
    }
}
```

Deadline default **15 hari** dari pembuatan. Body yang dikirim client diabaikan sepenuhnya.

---

### `GET /api/research/{id}`

Detail satu riset milik pemanggil, termasuk criteria dan kuesionernya (terurut by `pos`).

**Response `200`** — `data.research` berisi seluruh field di atas, ditambah:

```json
{
    "criteria": [{ "id": "…", "field": "domicileProvince", "operator": "EQ", "value": "DKI Jakarta" }],
    "questions": [
        {
            "id": "…",
            "pos": 1,
            "question": "Seberapa sering Anda memakai QRIS?",
            "questionType": "SINGLE_CHOICE",
            "mustFill": true,
            "choices": [{ "id": "…", "pos": 1, "n": "A", "choiceText": "Setiap hari" }]
        }
    ]
}
```

**Error:** `404` bila riset tidak ada, bukan milik pemanggil, atau sudah dihapus.

---

### `PATCH /api/research/{id}`

Memperbarui sebagian field editor. Semua field opsional; yang tidak dikirim tidak diubah.

| Field                      | Aturan                                                     |
| -------------------------- | ---------------------------------------------------------- |
| `title`                    | 1–255 karakter (di-trim)                                   |
| `description`              | maks 1000 karakter                                         |
| `category`                 | enum **atau** `null` (untuk mengosongkan)                  |
| `externalSurveyUrl`        | URL valid, maks 2048, **atau** `null`                      |
| `targetRespondentCount`    | integer ≥ 0                                                |
| `tokenPerRespondent`       | integer ≥ 1 — reward tiap responden, dipakai saat publish  |
| `estimatedDurationMinutes` | integer 1–180                                              |
| `deadline`                 | tanggal/waktu — menerima `"2026-12-01"` maupun ISO lengkap |
| `criteria`                 | array; bila dikirim, **menggantikan seluruh criteria**     |

```json
{
    "title": "QRIS dan perilaku belanja",
    "category": "fintech",
    "targetRespondentCount": 100,
    "criteria": [{ "field": "occupation", "operator": "EQ", "value": "Guru" }]
}
```

`criteria: []` menghapus semua criteria. Field `status`, `publishedAt`, `tokensReserved`,
`tokensConsumed`, dan `researcherId` **tidak bisa** diubah lewat endpoint ini — publish dan ledger
token punya alurnya sendiri.

Criteria termasuk bagian **definisi** riset, jadi begitu riset pernah dipublish (lihat `publishedAt`),
`criteria` tidak bisa diubah lagi — field lain tetap bisa. Untuk mengubah criteria tanpa menyentuh
field lain, pakai endpoint khusus di bawah.

**Response `200`** — bentuknya sama dengan `GET /api/research/{id}`.

**Error:** `404` · `409` bila status riset `PUBLISHED`, atau bila mengubah `criteria` pada riset yang
sudah pernah dipublish · `422` validasi.

---

### `POST /api/research/{id}/create-criteria`

Menyimpan **seluruh** daftar criteria sekaligus. Seperti kuesioner, endpoint ini **menggantikan**
(bukan menambah): criteria lama dihapus, lalu hanya yang ada di payload yang disimpan.

Daftar kosong (`[]`) valid, artinya riset menyasar semua responden.

**Request**

```json
{
    "criteria": [
        { "field": "occupation", "operator": "EQ", "value": "Guru" },
        { "field": "domicileProvince", "operator": "IN", "value": "DKI Jakarta,Jawa Barat" }
    ]
}
```

| Field                 | Aturan                      |
| --------------------- | --------------------------- |
| `criteria`            | wajib, array (boleh kosong) |
| `criteria[].field`    | 1–100 karakter              |
| `criteria[].operator` | enum                        |
| `criteria[].value`    | 1–512 karakter              |

**Response `200`** — bentuknya sama dengan `GET /api/research/{id}`.

**Error:** `404` · `409` bila riset sudah pernah dipublish · `422` validasi.

---

### `POST /api/research/{id}/create-questions`

Menyimpan **seluruh** kuesioner sekaligus. Walau namanya `create`, endpoint ini **menggantikan**
(mengganti, bukan menambah): semua soal lama dihapus, lalu hanya soal di payload yang disimpan.
Kirim 5 soal padahal tersimpan 10 → yang tersisa 5.

Isi kuesioner dibekukan begitu riset pernah dipublish (lihat `publishedAt`).

**Request**

```json
{
    "questions": [
        {
            "pos": 1,
            "question": "Seberapa sering Anda memakai QRIS?",
            "questionType": "SINGLE_CHOICE",
            "mustFill": true,
            "choices": [
                { "pos": 1, "n": "A", "choiceText": "Setiap hari" },
                { "pos": 2, "n": "B", "choiceText": "Kadang-kadang" }
            ]
        },
        { "pos": 2, "question": "Saran Anda", "questionType": "TEXT" }
    ]
}
```

| Field                              | Aturan                                              |
| ---------------------------------- | --------------------------------------------------- |
| `questions`                        | wajib, minimal 1                                    |
| `questions[].pos`                  | integer ≥ 0, **unik** antar soal                    |
| `questions[].question`             | 1+ karakter                                         |
| `questions[].questionType`         | enum                                                |
| `questions[].mustFill`             | opsional, default `true`                            |
| `questions[].choices[].pos`        | integer ≥ 0, **unik** dalam satu soal               |
| `questions[].choices[].n`          | 1–20 karakter (kode pilihan, mis. `"A"`)            |
| `questions[].choices[].choiceText` | boleh kosong **hanya** untuk `questionType: "TEXT"` |

`questionId` pada choices **tidak dikirim client** — choices ditulis bersarang di dalam soal, jadi
backend yang mengisi foreign key-nya. `id` di URL dipakai sebagai `researchId` soal-soal tersebut.

**Response `200`** — bentuknya sama dengan `GET /api/research/{id}` (berisi kuesioner yang baru
disimpan, lengkap dengan `id` yang di-generate).

**Error:** `404` · `409` bila riset sudah pernah dipublish · `422` validasi (termasuk `pos` duplikat).

---

### `POST /api/research/{id}/publish`

Mempublikasikan draft. Tidak butuh body. Hanya riset berstatus `DRAFT` yang bisa dipublish.

Draft harus lengkap, kalau tidak `422` dengan error per-field:

| Field error             | Syarat                 |
| ----------------------- | ---------------------- |
| `title`                 | judul tidak kosong     |
| `category`              | kategori sudah dipilih |
| `targetRespondentCount` | minimal 1              |
| `deadline`              | belum lewat            |
| `questions`             | minimal 1 soal         |

Criteria tidak wajib — riset boleh menyasar semua responden.

Publish juga **mengunci anggaran reward**: `targetRespondentCount × tokenPerRespondent` token diambil
dari wallet peneliti sebagai baris `RESERVE` (amount negatif), dan `research.tokensReserved` diisi
dengan total itu. Baris ledger-nya memakai `idempotencyKey: "research-reserve:{id}"`, jadi publish yang
di-retry tidak mungkin menarik token dua kali — dan reservasi, baris ledger, serta perubahan status
berada dalam **satu transaksi**.

**Response `200`** — bentuknya sama dengan `GET /api/research/{id}`, dengan `status: "PUBLISHED"` dan
`publishedAt` terisi.

`publishedAt` inilah yang nanti membekukan kuesioner dan mengubah delete menjadi archive.

**Error:** `404` · `409` bila bukan draft · `422` bila belum lengkap, alokasi melebihi 1.000.000
token, atau saldo token tidak cukup.

---

### `POST /api/research/{id}/close`

Menutup riset yang sudah dipublish. Tidak butuh body. Hanya riset berstatus `PUBLISHED` yang bisa
ditutup (`409` bila bukan); setelahnya statusnya jadi `CLOSED`.

Menutup sekaligus **mengembalikan sisa anggaran reward** ke wallet peneliti, sebesar
`tokensReserved - tokensConsumed`. Yang sudah dibayarkan ke responden tidak ikut kembali,
`tokensReserved` direset ke `0`, dan `tokensConsumed` dibiarkan apa adanya. Pengembaliannya dicatat
sebagai baris ledger `RELEASE` (amount positif) dengan `idempotencyKey: "research-release:{id}"`, dan
seluruhnya berada dalam **satu transaksi** — menutup dua kali tidak mungkin mengembalikan token dua kali.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Research closed",
    "data": {
        "research": { "…": "bentuk sama seperti GET /api/research/{id}, status: CLOSED" },
        "tokensReleased": 50
    }
}
```

`tokensReleased` bernilai `0` bila tidak ada sisa yang masih tertahan.

**Error:** `404` · `409` bila bukan `PUBLISHED` · `401`/`403`.

---

### `DELETE /api/research/{id}`

Menghapus riset. Tidak butuh body.

| Kondisi                | Yang terjadi                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Belum pernah dipublish | **dihapus permanen**, criteria & soal ikut terhapus                                                                 |
| Sudah pernah dipublish | **di-archive** (`deletedAt` diisi), baris tetap ada agar data partisipasi, jawaban, dan transaksi token tidak putus |

Archive juga melepas sisa anggaran reward yang belum terpakai, sama seperti `close` di atas — dan
melepasnya lagi setelah riset ditutup tidak menggandakan apa pun, karena baris `RELEASE`-nya memakai
`idempotencyKey: "research-release:{id}"`.

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Research deleted",
    "data": { "id": "…", "softDeleted": false, "tokensReleased": 0 }
}
```

`message` bernilai `"Research archived"` dan `softDeleted: true` untuk kasus archive; `tokensReleased`
berisi jumlah token yang dilepas kembali ke wallet.

Riset yang sudah di-archive akan terlihat seperti tidak ada (`404`) di semua endpoint.

**Error:** `404` · `401`/`403`.

---

## Participation

Sisi **responden**: mengikuti riset, mengisi kuesionernya, dan mengirimkannya. Semua endpoint di sini
butuh **login** dan role **`respondent`** — kalau tidak, `401`/`403`.

Satu partisipasi adalah satu percobaan satu responden pada satu riset. Pasangan `(riset, responden)` unik,
jadi "ikut" bersifat idempoten.

### `POST /api/research/{id}/participate`

Mengikuti riset yang sedang dibuka, atau mengembalikan partisipasi yang sudah dimiliki.

Endpoint ini tinggal di route research karena ia aksi pada sebuah riset, tetapi ia diperiksa dengan role
`respondent` dan dilayani **sebelum** guard peneliti.

Ikut dua kali bukan error: kalau partisipasinya belum dikirim, yang dikembalikan adalah partisipasi yang
sama tanpa memeriksa ulang kriteria maupun kuota — yang sudah memegang slot tetap memegangnya. Pemeriksaan
berikut hanya menjaga **join pertama**:

- riset harus `PUBLISHED`, belum lewat `deadline`, dan bukan milik pemanggil sendiri;
- kuota `targetRespondentCount` belum penuh — ini juga yang menjaga token, karena pembayaran tidak boleh
  melebihi reservasi;
- kriteria profil terpenuhi.

Ini juga panggilan yang **mencatat `startedAt`**: halaman kuesioner membuka partisipasinya lewat endpoint
ini, jadi jam mulai pengerjaan distempel di sini, sekali saja (lihat **Estimasi durasi**).

Dua permintaan yang datang bersamaan — efek yang dipanggil dua kali, atau tombol yang tertekan dua kali —
tidak menghasilkan dua baris: pasangan `(riset, responden)` unik, dan yang kalah balapan menjawab dengan
baris yang menang. `upsert` tidak cukup untuk itu: ia justru melempar `P2002` pada balapan seperti ini.

**Response `200`** — bentuk `participation`-nya sama dengan `GET /api/participation/{id}` di bawah.

**Error:** `401`/`403` · `404` riset tidak ada atau di-archive · `409` riset milik sendiri, tidak terbuka,
deadline lewat, kuota penuh, atau sudah pernah dikirim · `422` kriteria tidak terpenuhi.

---

### Kriteria (screening)

Kriteria adalah daftar aturan `{field, operator, value}`. Yang bisa **diputuskan** baru field yang memang
ada di profil: `gender`, `province`, `city`, `occupation`, `education`, `religion`.

Editor juga menawarkan `age` dan `region`, yang **belum tersimpan di mana pun** (profil tidak punya tanggal
lahir maupun pemetaan provinsi→region). Aturan tentang keduanya dikembalikan sebagai _belum bisa diputuskan_,
bukan ditebak: tebakan "lolos" akan membelanjakan token peneliti untuk orang yang ia kecualikan, dan tebakan
"tidak lolos" akan menyembunyikan risetnya tanpa alasan.

**Arti operator:**

| Operator                    | Arti                                                                         |
| --------------------------- | ---------------------------------------------------------------------------- |
| `EQ` / `NEQ`                | sama / tidak sama dengan `value`                                             |
| `IN` / `NOT_IN`             | ada / tidak ada di daftar `value` (dipisah koma)                             |
| `GT` / `GTE` / `LT` / `LTE` | perbandingan angka; sisi yang tidak terbaca sebagai angka → belum diputuskan |
| `BETWEEN`                   | angka di antara dua nilai; `value` berisi `min,maks`                         |

Hasilnya disimpan di partisipasinya:

| Field             | Arti                                                                                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `screeningScore`  | persentase aturan yang terpenuhi, atau `null` bila risetnya tidak punya kriteria. Aturan yang belum bisa diputuskan dihitung belum terpenuhi                                                     |
| `screeningResult` | `PASS`, `NEEDS_REVIEW` (ada aturan yang belum bisa diputuskan), atau `null` (tidak ada kriteria). `FAIL` tidak pernah tersimpan: kriteria yang gagal ditolak `422` sebelum partisipasinya dibuat |

---

### `GET /api/participation`

Daftar partisipasi milik pemanggil, terbaru dulu (default 50 baris).

**Query**

| Param    | Aturan                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------ |
| `status` | opsional, salah satu `JOINED`/`IN_PROGRESS`/`SUBMITTED`/`UNDER_REVIEW`/`APPROVED`/`REJECTED`/`EXPIRED` |
| `take`   | opsional, bilangan bulat 1–100 (default 50)                                                            |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Participations",
    "data": {
        "participations": [
            {
                "id": "…",
                "researchId": "…",
                "status": "SUBMITTED",
                "screeningScore": 100,
                "screeningResult": "PASS",
                "startedAt": "…",
                "submittedAt": "…",
                "createdAt": "…",
                "research": {
                    "id": "…",
                    "title": "Kebiasaan kardio",
                    "description": "Studi pendahuluan.",
                    "category": "health",
                    "externalSurveyUrl": null,
                    "researcherName": "Curl Tester",
                    "estimatedDurationMinutes": 5,
                    "tokenPerRespondent": 5,
                    "deadline": "…",
                    "status": "PUBLISHED"
                },
                "reward": { "tokenAmount": 5, "status": "PAID", "paidAt": "…" }
            }
        ]
    }
}
```

**Error:** `401`/`403` · `422` query yang tidak valid.

---

### `GET /api/participation/{id}`

Satu partisipasi milik pemanggil, lengkap dengan kuesioner dan jawaban yang sudah tersimpan — inilah yang
membuat formulir setengah jadi bisa dilanjutkan. Partisipasi milik orang lain dijawab `404`, bukan `403`,
supaya keberadaannya tidak bocor.

**Response `200`** — `data.participation`, tiap pertanyaan membawa jawabannya sendiri:

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Participation",
    "data": {
        "participation": {
            "id": "…",
            "researchId": "…",
            "status": "JOINED",
            "screeningScore": 100,
            "screeningResult": "PASS",
            "startedAt": "…",
            "submittedAt": null,
            "createdAt": "…",
            "research": {
                "id": "…",
                "title": "Kebiasaan kardio",
                "description": "Studi pendahuluan.",
                "category": "health",
                "externalSurveyUrl": null,
                "researcherName": "Curl Tester",
                "estimatedDurationMinutes": 5,
                "tokenPerRespondent": 5,
                "deadline": "…",
                "status": "PUBLISHED"
            },
            "reward": null,
            "timing": {
                "actualSeconds": null,
                "actualSecondsPerQuestion": null,
                "estimatedSeconds": 300,
                "estimatedSecondsPerQuestion": 100,
                "tooFast": null
            },
            "questions": [
                {
                    "id": "…",
                    "pos": 1,
                    "question": "Seberapa sering anda kardio?",
                    "questionType": "SINGLE_CHOICE",
                    "mustFill": true,
                    "choices": [{ "id": "…", "pos": 1, "n": "A", "choiceText": "Sering" }],
                    "answer": { "selected": [], "text": null }
                }
            ]
        }
    }
}
```

**Error:** `401`/`403` · `404`.

---

### `POST /api/participation/{id}/answers`

Menyimpan jawaban tanpa mengirimkannya; statusnya berpindah ke `IN_PROGRESS`. Halaman kuesioner memanggilnya
**sekali per halaman** saat responden menekan "Selanjutnya" — bukan sekali per soal, dan bukan pengganti
kiriman terakhir: jawaban yang lengkap tetap dikirim satu kali lewat `submit`.

Body-nya berisi **seluruh** jawaban: daftar yang dikirim menggantikan yang tersimpan, jadi daftar yang lebih
pendek berarti jawaban dihapus. Satu jawaban berisi `selected` (id pilihan), `text` (jawaban bebas), atau
keduanya kosong.

```json
{
    "answers": [
        { "questionId": "…", "selected": ["…"] },
        { "questionId": "…", "text": "Tidak ada saran." }
    ]
}
```

**Response `200`** — `data.participation`, sama dengan `GET` di atas.

**Error:** `401`/`403` · `404` · `409` partisipasinya sudah dikirim · `422` ada `questionId` yang bukan milik
riset ini, atau id pilihan yang tidak ditawarkan pertanyaannya.

---

### `POST /api/participation/{id}/submit`

Mengirim partisipasi dan **membayar responden**. Body-nya opsional; bila ada, `answers` diperlakukan sama
seperti di endpoint sebelumnya _sebelum_ divalidasi, supaya halaman terakhir formulir tidak bisa hilang di
antara simpan dan kirim.

Yang terjadi, semuanya dalam satu transaksi:

1. jawaban (bila dikirim) menggantikan yang tersimpan;
2. setiap pertanyaan ber-`mustFill` harus terjawab — kalau tidak, `422` dan tidak ada yang berubah;
3. risetnya harus masih menerima jawaban **dan deadline-nya belum lewat** — deadline diperiksa di sini
   maupun saat join;
4. `tokenPerRespondent` dibayarkan ke wallet responden sebagai baris ledger `REWARD`, dan `Reward` dibuat
   dengan status `PAID`;
5. `Research.tokensConsumed` bertambah sebanyak itu — cerminan `RESERVE` saat publish, dan angka yang
   membuat sisa reservasi bisa dilepas saat riset ditutup;
6. `submittedAt` diisi dengan waktu server, yang sekaligus menjadi waktu selesai pengerjaan (lihat
   **Estimasi durasi** di bawah).

**Response `200`** — `data.participation` dengan `status: "SUBMITTED"` dan `reward` yang terisi.

**Error:** `401`/`403` · `404` · `409` sudah pernah dikirim, risetnya sudah tidak menerima jawaban,
deadline-nya lewat, atau anggaran reward-nya habis · `422` pertanyaan wajib belum terjawab.

Kiriman kedua dijawab `409`, bukan sukses palsu: baris ledger-nya berkunci pada partisipasi, jadi efeknya
idempoten walaupun bentuk jawabannya bukan.

---

### Estimasi durasi

Riset sudah membawa `estimatedDurationMinutes` dari editor. Itu dipakai untuk menaksir berapa lama tiap
soal seharusnya dikerjakan:

```
estimatedSecondsPerQuestion = estimatedDurationMinutes * 60 / totalQuestions
```

Contoh: 5 menit dan 10 soal → 300 / 10 = **30 detik per soal**.

Waktunya diukur antara dua timestamp **server** di partisipasinya — tidak ada durasi yang disimpan:

| Waktu   | Kolom         | Diisi saat                      |
| ------- | ------------- | ------------------------------- |
| Mulai   | `startedAt`   | responden **membuka** kuesioner |
| Selesai | `submittedAt` | responden mengirim              |

```
actualSeconds = submittedAt - startedAt
```

`startedAt` distempel saat halaman kuesioner dibuka (`POST /api/research/{id}/participate`), dan hanya
sekali: kembali ke formulir yang setengah jadi melanjutkan pengukuran yang sama, bukan memulainya ulang.
Baris yang dibuat sebelum kolom ini ada tidak punya `startedAt`, dan jamnya jatuh kembali ke `createdAt`
(jam join) — arah jatuh yang aman, karena jendela yang lebih panjang hanya membuat laju terlihat lebih lambat.

Durasinya dihitung ulang tiap kali dibaca, jadi tidak mungkin berbeda dari kedua timestamp itu. Tidak ada
kolom `completedAt` yang terpisah karena isinya akan sama persis dengan `submittedAt`.

**Response** membawa blok `timing` pada `data.participation`:

| Field                         | Arti                                                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| `actualSeconds`               | `submittedAt - startedAt`, atau `null` selama belum dikirim                                            |
| `actualSecondsPerQuestion`    | `actualSeconds / totalQuestions`, atau `null`                                                          |
| `estimatedSeconds`            | `estimatedDurationMinutes * 60`                                                                        |
| `estimatedSecondsPerQuestion` | `estimatedSeconds / totalQuestions`, atau `null` kalau risetnya tidak punya soal (bukan pembagian nol) |
| `tooFast`                     | `true` bila `actualSeconds` di bawah sepertiga `estimatedSeconds`, atau `null` selama belum dikirim    |

**`tooFast` hanyalah penanda awal, bukan penilaian.** Jamnya berjalan dari saat kuesioner **dibuka**, bukan
saat jawaban terakhir diketik, jadi jendelanya sudah termasuk waktu responden meninggalkan halaman di
tengah-tengah — tesnya konservatif dan hanya menyala untuk kiriman yang selesai hampir seketika. Angka
sepertiganya sengaja longgar dan ada di `TOO_FAST_PACE_PERCENT` (`src/service/participation.ts`) untuk
disetel. Yang perlu dilakukan pada kiriman bertanda adalah **membaca jawabannya**, bukan menolaknya.

Kalau nanti penanda ini perlu disaring atau ditindaklanjuti, tempatnya adalah `QualityCheck.signalFlags`
(`SPEEDING`, `STRAIGHT_LINING`) — belum dipakai, lihat catatan di bawah.

---

## Payment & wallet

Saldo dinyatakan dalam **token**, dengan harga per token yang diatur lewat env `TOKEN_PRICE_IDR`
(default `1000`, jadi Rp1.000/token) — nilai yang sama ditampilkan halaman wallet (halaman server
mengoper nilainya ke komponen client). Semua endpoint di bagian ini butuh login, kecuali webhook.

### `GET /api/payment`

Daftar payment milik pemanggil, terbaru dulu (default 20 baris).

**Query**

| Param    | Aturan                                                              |
| -------- | ------------------------------------------------------------------- |
| `status` | opsional, salah satu `PENDING`/`PAID`/`FAILED`/`EXPIRED`/`REFUNDED` |
| `take`   | opsional, bilangan bulat 1–100 (default 20)                         |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Payments",
    "data": {
        "payments": [
            {
                "id": "…",
                "type": "TOKEN_TOPUP",
                "provider": "midtrans",
                "providerRef": "topup-…",
                "amountIdr": 50000,
                "tokenAmount": 50,
                "status": "PENDING",
                "createdAt": "…",
                "updatedAt": "…"
            }
        ]
    }
}
```

Query yang tidak valid dijawab `422` dengan key `status`/`take`, sama seperti body yang salah.

**Error:** `401` · `422`.

---

### `POST /api/payment/topup`

Membuka order top-up lewat **Midtrans Snap**. **Belum ada token yang masuk di langkah ini** — saldo baru
bertambah setelah Midtrans melaporkan pembayarannya lunas (lihat webhook di bawah).

Kalau `MIDTRANS_SERVER_KEY` terisi, order didaftarkan ke Snap dan response ikut membawa halaman
pembayaran yang harus dibuka client: `token` (Snap token) dan `redirectUrl`. Kalau tidak terisi, order
hanya dicatat lokal dengan `provider: "manual"` dan kedua field itu bernilai `null` — supaya environment
tanpa kredensial tetap bisa memanggil endpoint ini.

**Request**

```json
{ "tokenAmount": 50 }
```

| Field         | Aturan                             |
| ------------- | ---------------------------------- |
| `tokenAmount` | wajib, bilangan bulat, 1–1.000.000 |

**Response `201`**

```json
{
    "ok": true,
    "statusCode": 201,
    "message": "Top-up created",
    "data": {
        "payment": {
            "id": "…",
            "type": "TOKEN_TOPUP",
            "provider": "midtrans",
            "providerRef": "topup-…",
            "amountIdr": 50000,
            "tokenAmount": 50,
            "status": "PENDING",
            "createdAt": "…",
            "updatedAt": "…"
        },
        "token": "…",
        "redirectUrl": "https://app.sandbox.midtrans.com/snap/v4/redirection/…"
    }
}
```

`providerRef` inilah `order_id` yang dipakai Midtrans. Kalau Snap menolak, ordernya langsung ditandai
`FAILED` (tidak menggantung `PENDING`) dan endpoint menjawab `502`.

**Error:** `401` · `422` validasi · `502` Snap menolak atau menjawab tanpa token.

---

### `POST /api/payment/webhook`

Notification dari Midtrans. Ini **bukan** endpoint session — Midtrans tidak punya cookie — jadi
diamankan dengan `signature_key` yang ditandatangani Midtrans di tiap notification:
`sha512(order_id + status_code + gross_amount + server_key)`. Verifikasinya butuh
`MIDTRANS_SERVER_KEY`, jadi selama key itu belum diisi endpoint ini menolak **semua** panggilan (`503`)
alih-alih menerimanya terbuka.

Field yang dipakai: `order_id`, `status_code`, `gross_amount`, `transaction_status`, `signature_key`
(dan `fraud_status` bila ada). Field lain di payload Midtrans diabaikan, bukan ditolak.

| `transaction_status`             | Jadi       | Efek                                 |
| -------------------------------- | ---------- | ------------------------------------ |
| `settlement`                     | `PAID`     | saldo bertambah                      |
| `capture` (fraud `accept`)       | `PAID`     | saldo bertambah                      |
| `capture` (fraud tidak `accept`) | `PENDING`  | belum ada efek                       |
| `pending`                        | `PENDING`  | belum ada efek                       |
| `deny`, `cancel`                 | `FAILED`   | order ditutup (hanya dari `PENDING`) |
| `expire`                         | `EXPIRED`  | order ditutup (hanya dari `PENDING`) |
| `refund`, `partial_refund`       | `REFUNDED` | diakui tapi **tidak** diterapkan     |

**Request** (bentuk yang dikirim Midtrans)

```json
{
    "order_id": "topup-…",
    "status_code": "200",
    "gross_amount": "50000.00",
    "transaction_status": "settlement",
    "signature_key": "…"
}
```

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Payment settled and wallet credited",
    "data": { "id": "…", "status": "PAID", "credited": true, "ignored": false }
}
```

Idempoten: order yang sudah `PAID` dijawab `credited: false`, dan saldo tidak bertambah lagi.

**Refund belum diterapkan.** Notification refund dijawab `200` dengan `ignored: true` dan barisnya
**tidak** diubah — membalik kredit adalah alur tersendiri, dan menandai `REFUNDED` tanpa menarik tokennya
kembali akan membuat saldo berbohong. Sampai alur itu ada, balik manual lewat baris `REFUND` di ledger.

**Error:** `401` signature tidak sah · `404` `order_id` tidak dikenal · `422` payload atau
`transaction_status` yang tidak dikenal · `503` gateway belum dikonfigurasi.

---

### `GET /api/payment/wallet`

Saldo pemanggil beserta mutasi terakhirnya (maksimal 50 baris).

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Wallet",
    "data": {
        "wallet": {
            "balance": 950,
            "balanceIdr": 950000,
            "transactions": [{ "id": "…", "type": "RESERVE", "amount": -50, "researchId": "…", "participationId": null, "createdAt": "…" }]
        }
    }
}
```

`amount` bertanda: kredit positif (`TOPUP`), debit negatif (`RESERVE`). Akun lama yang belum punya wallet
dibaca sebagai saldo 0.

**Error:** `401`.

---

### `GET /api/payment/{id}`

Status satu payment milik pemanggil — dipakai untuk memeriksa hasil top-up sebelum saldonya masuk.

**Error:** `401` · `404`.

---

## Support

Tiket bantuan dari halaman **Pusat Bantuan**. Semua endpoint di bagian ini butuh login; tidak ada role
khusus, karena tiap user boleh membuka tiket atas namanya sendiri.

### `POST /api/ticket`

Membuka tiket bantuan untuk pemanggil. Tiket selalu lahir `REVIEW` — `status` tidak diambil dari client,
hanya peninjauan admin yang mengubahnya.

**Request**

```json
{
    "category": "DISPUTE",
    "subject": "Permohonan Banding Penolakan Respon Survei Retail",
    "description": "Pengisian kuesioner telah selesai dengan cermat sesuai instruksi, mohon review manual."
}
```

| Field         | Aturan                                                           |
| ------------- | ---------------------------------------------------------------- |
| `category`    | wajib, enum `DISPUTE`/`RESEARCH`/`TRANSACTION`/`ACCOUNT`/`OTHER` |
| `subject`     | wajib, 3–150 karakter (spasi tepi dirapikan)                     |
| `description` | wajib, 20–5000 karakter (spasi tepi dirapikan)                   |

**Response `201`**

```json
{
    "ok": true,
    "statusCode": 201,
    "message": "Ticket created",
    "data": {
        "ticket": {
            "id": "…",
            "category": "DISPUTE",
            "subject": "Permohonan Banding Penolakan Respon Survei Retail",
            "description": "Pengisian kuesioner telah selesai dengan cermat sesuai instruksi, mohon review manual.",
            "status": "REVIEW",
            "createdAt": "…",
            "updatedAt": "…"
        }
    }
}
```

**Error:** `401` · `422`.

---

### `GET /api/ticket`

Riwayat tiket milik pemanggil, terbaru dulu (default 50 baris). Hanya tiket milik pemanggil yang tampil —
riwayat satu akun tidak pernah terlihat akun lain.

**Query**

| Param    | Aturan                                              |
| -------- | --------------------------------------------------- |
| `status` | opsional, salah satu `REVIEW`/`RESOLVED`/`REJECTED` |
| `take`   | opsional, bilangan bulat 1–100 (default 50)         |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Tickets",
    "data": {
        "tickets": [
            {
                "id": "…",
                "category": "DISPUTE",
                "subject": "Permohonan Banding Penolakan Respon Survei Retail",
                "description": "Pengisian kuesioner telah selesai dengan cermat sesuai instruksi, mohon review manual.",
                "status": "REVIEW",
                "createdAt": "…",
                "updatedAt": "…"
            }
        ]
    }
}
```

**Error:** `401` · `422` query yang tidak valid.

---

## Catatan & yang belum ada

**Yang sudah berjalan:** register/login/confirm/logout/me, profil demografi (dengan aturan consent
UU PDP) + unggah foto profil ke Cloudinary, preferensi Account Settings (umum, notifikasi, privasi &
keamanan) + sesi aktif, draft riset + detail + update + criteria + kuesioner + publish + close +
delete, alur responden (ikut riset + screening kriteria + jawab + kirim + dibayar), tiket bantuan
(pusat bantuan), serta wallet token (top-up, reserve, bayar responden, dan release).

**Yang belum ada:**

- **Lokasi & “terakhir aktif” pada sesi** — daftar sesi menampilkan `userAgent`, IP, `createdAt`, dan
  `expiresAt` saja. Lokasi perangkat butuh geolokasi dari IP, dan “terakhir aktif” butuh pencatatan
  last-seen per request yang belum ada — jadi yang ditampilkan adalah IP apa adanya dan kapan sesinya
  dimulai, bukan tebakan.
- **Preferensi akun belum dipakai ke mana-mana** — nilai yang disimpan lewat `PATCH /api/user/settings`
  baru sebatas tersimpan: bahasa, tema, dan mode ringkas belum benar-benar mengubah tampilan, dan
  `securityTwoFactorAuth` belum menjadi alur login 2FA.
- **Peninjauan tiket oleh admin** — tiket selalu lahir `REVIEW` dan kolom peninjauannya (`reviewedBy`,
  `reviewedAt`, `resolutionNote`) sudah ada di schema, tapi belum ada endpoint untuk memindahkannya ke
  `RESOLVED`/`REJECTED`. Saat ini status hanya bisa diubah manual lewat database.

- **Verifikasi nomor telepon (`PHONE_VERIFICATION`)** — sudah ada di enum `VerificationType`, dan
  nomornya kini tersimpan di `UserProfile.phoneNumber` (bisa diubah lewat `PATCH /api/user/profile`),
  tapi belum ada endpoint verifikasinya karena belum ada penyedia SMS/WhatsApp (baru Resend untuk
  email).
- **Endpoint untuk mengubah `roles`** (promote ke admin) — masih manual lewat database.
- **Sisa alur token** — top-up (`TOPUP`), reserve (`RESERVE`), pembayaran responden (`REWARD`), dan
  pelepasan sisa reservasi (`RELEASE`, lewat `close` maupun archive) sudah jalan. Yang belum: `CONSUME`,
  `WITHDRAW`, `FEE`, dan `REFUND` — penarikan saldo dan pembalikan kredit belum ada.
- **Pembagian reward peneliti vs platform** — `REWARD_SPLIT_RESPONDENT_PERCENT` dan
  `REWARD_SPLIT_PLATFORM_PERCENT` **belum dipakai**: responden menerima `tokenPerRespondent` penuh dan
  `Reward.platformTokenAmount` diisi `0`. Itu pilihan yang menjaga dua hal yang sudah terlanjur rilis —
  komentar schema menyebut `tokenPerRespondent` sebagai token yang diterima responden, dan feed responden
  menampilkan `rewardIdr` sebesar nilai itu — sekaligus menjaga ledger: potongan platform tidak punya
  wallet tujuan, jadi menerapkannya akan membuat token keluar dari pembukuan tanpa jejak. Perlu keputusan
  produk: potong dari `tokenPerRespondent` (dan perbaiki `rewardIdr`), atau tagih di atasnya saat publish.
- **Auto-screening kualitas jawaban** — kolom `QualityCheck`, `signalFlags` (`SPEEDING`,
  `STRAIGHT_LINING`), dan `autoScore` belum diisi, dan belum ada endpoint yang membuatnya. Yang sudah ada
  hanya blok `timing` pada response partisipasi: `tooFast` dihitung saat dibaca dari dua timestamp yang
  sudah tersimpan, jadi tidak perlu ditulis ke kolom mana pun. Kalau nanti perlu disaring atau
  ditindaklanjuti, `signalFlags` adalah tempatnya. `screeningScore`/`screeningResult` yang terisi berasal
  dari kriteria saat join, bukan dari mutu jawaban.
- **Penahanan reward dan alur review** — `Reward` selalu `PAID` begitu dikirim; `PENDING`/`HELD`,
  `QUALITY_HOLD_RELEASE_HOURS`, serta `ParticipationStatus.UNDER_REVIEW`/`APPROVED`/`REJECTED` dengan
  `adminReviewedBy`/`holdReleaseAt` belum dipakai. Belum ada cara menolak jawaban atau membalik bayaran.
- **Feed responden belum menyaring kriteria** — `GET /api/research/available` masih menampilkan riset
  yang kriterianya tidak dipenuhi profil; responden baru tahu saat mencoba ikut (`422`). Menyaring di
  feed butuh `age` dan `region` yang belum tersimpan.
- **Midtrans** — gateway pembayaran sudah terpasang: `POST /api/payment/topup` mendaftarkan order ke
  Snap, dan webhook memverifikasi signature Midtrans. Env yang dipakai: `MIDTRANS_SERVER_KEY` (wajib
  untuk mengaktifkan), `MIDTRANS_IS_PRODUCTION` (default `false` = sandbox), dan `MIDTRANS_SNAP_BASE_URL`
  (opsional, untuk mengarahkan Snap ke proxy/stub). Snap.js di browser (`client_key`) belum dipasang —
  UI masih mock. **Penarikan** (`WITHDRAWAL`) dan **refund** juga belum ada.
- **Aturan ekonomi lewat env** — selain `TOKEN_PRICE_IDR`: `REWARD_SPLIT_PLATFORM_PERCENT` +
  `REWARD_SPLIT_RESPONDENT_PERCENT` (harus berjumlah 100), `WITHDRAWAL_FEE_PERCENT`,
  `TOKEN_EXPIRY_IDLE_MONTHS`, `MIN_RESPONDENT_PER_RESEARCH`, `ADMIN_REVIEW_SLA_HOURS`,
  `CONTENT_REPORT_SLA_HOURS`, dan `QUALITY_HOLD_RELEASE_HOURS` — nilainya sudah terpusat, tapi belum
  ada alur yang memakainya.
- **Unpublish riset** yang sudah `PUBLISHED` belum ada — yang tersedia baru `close` dan archive.
- **Akun yang belum bisa diubah dari UI profil** — belum ada endpoint untuk mengganti `User.name`
  maupun mengganti kata sandi (walau `PASSWORD_RESET` sudah ada di enum), dan ekspor/hapus akun untuk
  UU PDP juga belum ada. Foto profil (`User.image`) sudah bisa diunggah lewat
  `POST /api/user/avatar`, begitu juga email dan nomor telepon.
- **Sampah asset Cloudinary** — unggahan ulang foto profil menimpa asset yang sama, jadi tidak menumpuk
  sampah. Yang belum ada: menghapus gambar dari Cloudinary saat akun dihapus, dan menghapus foto dari
  profil (`DELETE`). Utility baca-satu-asset (`getSingleAsset`) sudah ada di
  `src/lib/server/cloudinary.ts` tapi belum dipakai endpoint mana pun.
- **UI untuk tipe pertanyaan `NUMBER`** — sudah valid di schema dan API, tapi editor belum
  menawarkannya (baru 4 tipe: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TEXT`, `SCALE`), dan halaman
  responden belum merender input angkanya.
- **Skor “cocok” dan institusi peneliti** — kartu survei di feed responden versi awal menampilkan
  badge “99% cocok” dan nama institusi; keduanya belum ada datanya. Kecocokan sekarang hanya dihitung
  saat **join** (`screeningScore`), bukan di feed — dan `age`/`region` yang dipakai editor masih belum
  bisa diputuskan karena profilnya belum menyimpannya. Institusi juga belum punya kolom, jadi yang tampil
  nama peneliti. Halaman detail riset juga tidak lagi menampilkan badge “Riset Terverifikasi” dan blok
  “uji perhatian” beserta tombol kirimnya: status verifikasi tidak punya datanya, dan pengiriman jawaban
  sekarang hanya terjadi di halaman kuesioner — jadi tidak ada lagi jalur kirim palsu yang mengira
  jawaban sudah terkirim padahal belum dijawab.

**Perilaku yang mudah bikin bingung:**

- Validasi gagal selalu `422`, bukan `400`.
- Key body yang tidak dikenal dibuang tanpa error.
- Untuk semua endpoint research, guard session + role jalan **sebelum** routing, jadi request tanpa
  login ke path yang tidak dikenal tetap `401` (bukan `404`) — supaya nama route tidak bocor.
  Pengecualiannya `GET /api/research/available`, `GET /api/research/available/{id}`, dan
  `POST /api/research/{id}/participate`, yang memang bukan milik peneliti dan diperiksa dengan role
  `respondent` sebelum guard itu.
- `POST /api/participation/{id}/submit` boleh tanpa body sama sekali; body `{}` dan body kosong sama
  artinya, yaitu "tidak ada jawaban baru, kirim yang sudah tersimpan".
- Deadline riset diperiksa **dua kali**: saat join dan saat submit. Yang kedua itu yang menutup celah
  responden yang join sebelum deadline lalu mengirim setelahnya.

---

## Smoke test

`scripts/api-smoke.sh` menjalankan semua endpoint di atas dengan curl terhadap dev server
(`bun run dev`) dan mencetak satu baris per request: method, path, status HTTP, dan cuplikan response.
Alur responden (ikut → jawab → kirim → dibayar) dijalankan dengan **akun kedua**, karena satu akun tidak
bisa menjadi dua sisi sekaligus.

```sh
MIDTRANS_SERVER_KEY=local-dev-midtrans-server-key \
  MIDTRANS_SNAP_BASE_URL=http://127.0.0.1:4566 \
  bun run dev                 # di terminal lain
sh scripts/api-smoke.sh     # dari root project
```

Skrip ini mendaftarkan akun sekali pakai, membuat riset, dan membaca kode OTP langsung dari database
(`scripts/db-peek.ts`). Ia juga menyalakan **stub Snap** di `127.0.0.1:4566`, jadi dev server harus
dijalankan dengan `MIDTRANS_SNAP_BASE_URL` seperti di atas — kalau tidak, `topup` akan memanggil Midtrans
sungguhan dan ditolak dengan `502`. **Hanya untuk database development.**

Dua seeder untuk alur yang belum punya endpoint-nya sendiri, juga development-only:

```sh
bun run scripts/credit-wallet.ts <email> <amount>          # isi saldo token
bun run scripts/seed-participations.ts <email> <count>     # isi partisipasi yang sudah dikirim
```

Keduanya menulis baris turunannya sekalian (ledger token / partisipasi), jadi datanya tetap bisa
dijelaskan. Bersihkan dengan `bun run scripts/db-peek.ts purge <pola-email>`.
