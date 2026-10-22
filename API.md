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

| Field                 | Nilai                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| `roles`               | `researcher`, `respondent`, `admin`                                                    |
| `gender`              | `male`, `female`                                                                       |
| `education`           | `high_school`, `diploma`, `bachelor`, `master`, `doctorate`                            |
| `religion`            | `islam`, `protestant`, `catholic`, `hindu`, `buddhist`, `confucian`                    |
| `category` (research) | `fintech`, `retail`, `education`, `health`, `technology`                               |
| `operator` (criteria) | `EQ`, `NEQ`, `IN`, `NOT_IN`, `GT`, `GTE`, `LT`, `LTE`, `BETWEEN`                       |
| `questionType`        | `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TEXT`, `NUMBER`, `SCALE`                          |
| `status` (research)   | `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `CLOSED`, `COMPLETED`, `REJECTED`, `CANCELLED` |

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

### `PATCH /api/user/profile`

Membuat atau memperbarui profil demografi milik user yang login.

- Profil dibuat saat penulisan **pertama** (registrasi tidak membuat profil).
- Kolom demografi bersifat NOT NULL, jadi **penulisan pertama harus lengkap**; setelah itu boleh sebagian.
- Field yang tidak dikirim tidak diubah. Hanya `religion` yang boleh `null` (untuk mengosongkan).

**Request**

| Field             | Aturan                             |
| ----------------- | ---------------------------------- |
| `gender`          | opsional, enum                     |
| `education`       | opsional, enum                     |
| `province`        | opsional, 1–100 karakter (di-trim) |
| `city`            | opsional, 1–100 karakter           |
| `latitude`        | opsional, −90 s/d 90               |
| `longitude`       | opsional, −180 s/d 180             |
| `occupation`      | opsional, 1–100 karakter           |
| `religion`        | opsional, enum **atau** `null`     |
| `religionConsent` | opsional, boolean                  |

```json
{
    "gender": "female",
    "education": "bachelor",
    "province": "DKI Jakarta",
    "city": "Jakarta Selatan",
    "latitude": -6.261493,
    "longitude": 106.8106,
    "occupation": "Researcher",
    "religion": "islam",
    "religionConsent": true
}
```

**Membuat profil (belum punya profil):** wajib mengirim `gender`, `education`, `province`, `city`,
`latitude`, `longitude`, dan `occupation` sekaligus. Kalau tidak, `422` dengan error per-field yang
menyebut field mana yang kurang.

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

## Research

Semua endpoint research butuh **login** dan role **`researcher`** — kalau tidak, `401`/`403`.

Riset diidentifikasi lewat `{id}` di URL. Nama aksi (`create`) tidak pernah dianggap sebagai id.

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

**Response `200`** — bentuknya sama dengan `GET /api/research/{id}`, dengan `status: "PUBLISHED"` dan
`publishedAt` terisi.

`publishedAt` inilah yang nanti membekukan kuesioner dan mengubah delete menjadi archive.

**Error:** `404` · `409` bila bukan draft · `422` bila belum lengkap.

---

### `DELETE /api/research/{id}`

Menghapus riset. Tidak butuh body.

| Kondisi                | Yang terjadi                                                                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Belum pernah dipublish | **dihapus permanen**, criteria & soal ikut terhapus                                                                 |
| Sudah pernah dipublish | **di-archive** (`deletedAt` diisi), baris tetap ada agar data partisipasi, jawaban, dan transaksi token tidak putus |

**Response `200`**

```json
{
    "ok": true,
    "statusCode": 200,
    "message": "Research deleted",
    "data": { "id": "…", "softDeleted": false }
}
```

`message` bernilai `"Research archived"` dan `softDeleted: true` untuk kasus archive.

Riset yang sudah di-archive akan terlihat seperti tidak ada (`404`) di semua endpoint.

**Error:** `404` · `401`/`403`.

---

## Catatan & yang belum ada

**Yang sudah berjalan:** register/login/confirm/logout/me, profil demografi (dengan aturan consent
UU PDP), draft riset + detail + update + criteria + kuesioner + publish + delete.

**Yang belum ada:**

- **Verifikasi nomor telepon (`PHONE_VERIFICATION`)** — sudah ada di enum `VerificationType`, tapi belum
  ada endpoint-nya, karena dua hal belum tersedia: kolom nomor telepon di schema (tidak ada sama
  sekali) dan penyedia SMS/WhatsApp (baru Resend untuk email).
- **Endpoint untuk mengubah `roles`** (promote ke admin) — masih manual lewat database.
- **Token wallet** — `TokenWallet` belum dibuat saat registrasi, dan publish belum mereservasi token;
  ledger token punya alurnya sendiri.
- **List riset** (`GET /api/research`) dan **unpublish/close** belum ada.
- **UI untuk tipe pertanyaan `NUMBER`** — sudah valid di schema dan API, tapi editor belum
  menawarkannya (baru 4 tipe: `SINGLE_CHOICE`, `MULTIPLE_CHOICE`, `TEXT`, `SCALE`), dan halaman
  responden belum merender input angkanya.

**Perilaku yang mudah bikin bingung:**

- Validasi gagal selalu `422`, bukan `400`.
- Key body yang tidak dikenal dibuang tanpa error.
- Untuk semua endpoint research, guard session + role jalan **sebelum** routing, jadi request tanpa
  login ke path yang tidak dikenal tetap `401` (bukan `404`) — supaya nama route tidak bocor.

---

## Smoke test

`scripts/api-smoke.sh` menjalankan semua endpoint di atas dengan curl terhadap dev server
(`bun run dev`) dan mencetak satu baris per request: method, path, status HTTP, dan cuplikan response.

```sh
bun run dev                 # di terminal lain
sh scripts/api-smoke.sh     # dari root project
```

Skrip ini mendaftarkan akun sekali pakai, membuat riset, dan membaca kode OTP langsung dari database
(`scripts/db-peek.ts`) — jadi **hanya untuk database development**.
