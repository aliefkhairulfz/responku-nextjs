# Concern

Catatan hal-hal yang perlu dijelaskan, dipertanyakan, atau ditindaklanjuti. Bukan dokumentasi
endpoint — itu ada di `API.md`.

---

## `screeningScore` dan `autoScreeningResult` pada partisipasi

**Pertanyaan:** dari mana `screeningScore` dan `autoScreeningResult` pada partisipasi, dan kapan diisi?

**Jawaban:** keduanya adalah **screening kualitas** — ringkasan sinyal kualitas jawaban otomatis
(`SPEEDING`, `STRAIGHT_LINING`) — dihitung **sekali saat kirim**, bukan saat join. Keduanya tetap `null`
selama partisipasinya masih berjalan. Kecocokan profil vs kriteria riset adalah gerbang **join** yang
terpisah dan tidak disimpan (lihat bagian berikutnya).

### Kapan dan bagaimana dihitung

Sinyalnya dihitung di satu tempat, `screenSubmission` (`src/lib/server/quality.ts`), lalu disimpan ke
`QualityCheck` (`signalFlags`, `autoScore`). Partisipasinya **tidak menghitung ulang** — ia membaca kembali
nilai yang sama dan menurunkannya (`submitParticipationService`, `src/service/participation.ts`):

```ts
const check = await createQualityCheckService(tx, { ... }) // menghitung & menyimpan sinyalnya

const screening = screeningVerdict(check.signalFlags, check.autoScore)
// screening.result: "CLEAN" | "FLAGGED";  screening.score: round(autoScore * 100)
```

### Arti tiap nilai

| Nilai     | Artinya                                |
| --------- | -------------------------------------- |
| `null`    | Belum dikirim                          |
| `CLEAN`   | Tidak ada sinyal kualitas yang menyala |
| `FLAGGED` | Minimal satu sinyal menyala            |

Screening kualitas **tidak menolak** apa pun: hasilnya hanya penanda di antrean quality check. Admin yang
memutuskan.

### `screeningScore`

`autoScore` (0–1, disimpan di `QualityCheck`) dibaca sebagai persen, jadi 0–100. `autoScore` sendiri =
`1 − (jumlah sinyal / jumlah sinyal yang mungkin)`: tanpa sinyal → `1` → skor `100`; satu sinyal → `0,5` →
`50`; dua sinyal → `0` → `0`. Skornya hanya ringkasan sinyal — yang dibaca admin adalah sinyalnya.

### Kenapa contoh kiriman `SPEEDING` skornya 50 / FLAGGED

Kiriman yang selesai jauh lebih cepat dari estimasi memicu `SPEEDING` (dan sering `STRAIGHT_LINING` juga
kalau posisi pilihannya seragam). Satu sinyal → `autoScore = 0,5` → `screeningScore = 50` / `FLAGGED`.
Kiriman tanpa sinyal → `100` / `CLEAN`.

### Tiga hal yang mudah salah dibaca

1. **Dihitung sekali saat kirim, lalu disimpan.** Setelah dikirim, jawaban tidak bisa berubah, jadi
   sinyalnya pun final.
2. **Bukan keputusan.** `CLEAN`/`FLAGGED` hanya penanda untuk membaca; admin yang memutuskan lewat quality
   check.
3. **Bukan kelayakan.** Kecocokan profil vs kriteria adalah gerbang join yang terpisah.

Jadi `CLEAN` berarti "tidak ada sinyal kualitas yang menyala", bukan "diterima" — keputusannya tetap ada
pada admin.

---

## Satu keputusan: quality check adalah tempatnya

**Keputusan:** sebuah kiriman diputuskan **hanya** lewat `POST /api/quality-check/{id}/review`. Sebelumnya
ada dua jalur yang saling mengunci (quality check dulu, baru keputusan reward di
`POST /api/participation/{id}/review`), dan itu memisahkan dua hal yang seharusnya satu.

**Sekarang:**

- Setiap submission membuat satu quality check `PENDING` saat dikirim, jadi **semua** kiriman masuk antrean —
  hasil auto-screening `clean` maupun `flagged`. Antrean tidak pernah disaring berdasarkan sinyal.
- `screeningScore` dan `autoScreeningResult` hanya **informasi pendukung**.
- `APPROVED` dan `REJECTED` di quality check adalah keputusan final untuk kiriman itu, dan keduanya
  menggerakkan quality check + partisipasi + reward dalam **satu transaksi**.
- `POST /api/participation/{id}/review` **dihapus**; tab Partisipasi di panel admin jadi pemantauan saja.

**Kenapa aman dari bayar dua kali:** check-nya diklaim lebih dulu dengan update bersyarat
(`decision = PENDING`), jadi keputusan kedua — termasuk dua permintaan serentak — tidak menemukan baris dan
dijawab `409`. Baris ledger `REWARD` berkunci pada partisipasi sebagai kunci kedua.

**Yang dihapus:** mekanisme tahan reward (`RewardStatus.HELD`, `Participation.holdReleaseAt`, env
`QUALITY_HOLD_RELEASE_HOURS`). Tidak pernah ada scheduler yang memakainya — semua keputusan wajib dilakukan
admin — jadi ketiganya hanya menyisakan kolom dan nilai mati. Dihapus dari schema dan env; kolomnya kosong,
jadi tidak ada data yang hilang.

**Yang belum ada:** membalik bayaran yang sudah terjadi. Menolak sebelum dibayar sudah bisa (`REJECTED`),
tapi setelah `PAID` tidak ada jalur pembalikan.

---

## Tiga hal yang terpisah: kelayakan (join), sinyal kualitas, keputusan

Tiga hal, jangan dicampur:

|               | Eligibility (demographic)                      | Sinyal kualitas                                                     | Keputusan       |
| ------------- | ---------------------------------------------- | ------------------------------------------------------------------- | --------------- |
| Kapan         | saat **join**                                  | saat **submit**                                                     | setelah submit  |
| Menilai       | profil vs kriteria riset                       | kualitas jawaban                                                    | —               |
| Field         | _(tidak disimpan)_                             | `screeningScore`, `autoScreeningResult`, `signalFlags`, `autoScore` | `decision`      |
| Bisa menolak? | ya — join `422` kalau kriteria tidak terpenuhi | tidak                                                               | ya, hanya admin |

Kelayakan demografis hanya gerbang join: `screenCriteria` (`src/lib/server/screening.ts`) menolak `422` bila
ada aturan yang gagal, dan hasilnya tidak disimpan. Sinyal kualitas — beserta turunannya `CLEAN`/`FLAGGED`
plus skor — dibawa ke antrean quality check sebagai **informasi pendukung**, bukan penentu approval.

### Sinyal yang tersedia, dan yang tidak

`QualityCheck.signalFlags` adalah JSON array, jadi menambah sinyal tidak butuh migrasi. Yang **sudah** ada:

| Sinyal            | Arti                                                        |
| ----------------- | ----------------------------------------------------------- |
| `SPEEDING`        | selesai jauh lebih cepat dari estimasi (padanan `too_fast`) |
| `STRAIGHT_LINING` | posisi pilihan yang sama untuk semua soal pilihan           |

Dua sinyal yang disebut di requirement **tidak diimplementasikan**, karena datanya tidak ada di schema:

- **`attention_check_failed`** — tidak ada tipe soal _attention check_ di `QuestionType`, dan editor riset
  tidak menawarkannya. Menambahkannya berarti menambah tipe soal + UI editor + render responden.
- **`duplicate_submission`** — `RespondentParticipation` sudah unik pada `(researchId, respondentId)`, jadi
  satu responden tidak bisa mengirim dua kali untuk riset yang sama. Deteksi "jawaban identik antar
  responden" butuh perbandingan antar-baris yang belum ada.

Keduanya sengaja tidak dikarang-karang: sinyal palsu lebih buruk daripada tidak ada sinyal.

<!--// mulai kuesioner
respondent_participation {
  "id": "cmvkustv80003gygok69fw13k",
  "researchId": "cmvkugy2b000dfxgo4z1v04z0",
  "respondentId": "cmvkugy210006fxgowqt7u9dj",
  "status": "JOINED",
  "screeningScore": null,
  "autoScreeningResult": null,
  "startedAt": "2026-10-23 10:55:19.599",
  "submittedAt": null,
  "adminReviewedBy": null,
  "adminReviewedAt": null,
  "holdReleaseAt": null,
  "rewardedAt": null,
  "createdAt": "2026-10-23 10:55:19.604",
  "updatedAt": "2026-10-23 10:55:19.604",
  "deletedAt": null
}

// setelah submit
respondent_participation {
  "id": "cmvkustv80003gygok69fw13k",
  "researchId": "cmvkugy2b000dfxgo4z1v04z0",
  "respondentId": "cmvkugy210006fxgowqt7u9dj",
  "status": "SUBMITTED",
  "screeningScore": 50,
  "autoScreeningResult": "FLAGGED",
  "startedAt": "2026-10-23 10:55:19.599",
  "submittedAt": "2026-10-23 10:57:16.819",
  "adminReviewedBy": null,
  "adminReviewedAt": null,
  "holdReleaseAt": null,
  "rewardedAt": null,
  "createdAt": "2026-10-23 10:55:19.604",
  "updatedAt": "2026-10-23 10:57:16.823",
  "deletedAt": null
}

quality_check: {
  "id": "cmvkuvcb9000qgygoqwkev088",
  "participationId": "cmvkustv80003gygok69fw13k",
  "signalFlags": "[\"SPEEDING\"]",
  "autoScore": 0.5000,
  "reviewedBy": null,
  "decision": "PENDING",
  "createdAt": "2026-10-23 10:57:16.821",
  "updatedAt": "2026-10-23 10:57:16.821",
  "deletedAt": null
}

// setelah quality check
// apa yang terjadi untuk freelancer :: bugs di dashboard saldo token harusnya update kalau udah dapet reward
// apa yang terjadi di table respondent_participation
// apa yang terjadi di table quality_check
// apa yang terjadi di table token_transaction
// apa yang terjadi di table rewards
respondent_participation:  {
  "id": "cmvkustv80003gygok69fw13k",
  "researchId": "cmvkugy2b000dfxgo4z1v04z0",
  "respondentId": "cmvkugy210006fxgowqt7u9dj",
  "status": "SUBMITTED",
  "screeningScore": 50,
  "autoScreeningResult": "FLAGGED",
  "startedAt": "2026-10-23 10:55:19.599",
  "submittedAt": "2026-10-23 10:57:16.819",
  "adminReviewedBy": null,
  "adminReviewedAt": null,
  "holdReleaseAt": null,
  "rewardedAt": null,
  "createdAt": "2026-10-23 10:55:19.604",
  "updatedAt": "2026-10-23 10:57:16.823",
  "deletedAt": null
}

quality_check: {
  "id": "cmvkuvcb9000qgygoqwkev088",
  "participationId": "cmvkustv80003gygok69fw13k",
  "signalFlags": "[\"SPEEDING\"]",
  "autoScore": 0.5000,
  "reviewedBy": "cmvkugy210005fxgoiwy1i87x",
  "decision": "APPROVED",
  "createdAt": "2026-10-23 10:57:16.821",
  "updatedAt": "2026-10-23 11:03:48.828",
  "deletedAt": null
}

// setelah setuju dan bayarkan
respondent_participation:   {
  "id": "cmvkustv80003gygok69fw13k",
  "researchId": "cmvkugy2b000dfxgo4z1v04z0",
  "respondentId": "cmvkugy210006fxgowqt7u9dj",
  "status": "APPROVED",
  "screeningScore": 50,
  "autoScreeningResult": "FLAGGED",
  "startedAt": "2026-10-23 10:55:19.599",
  "submittedAt": "2026-10-23 10:57:16.819",
  "adminReviewedBy": "cmvkugy210005fxgoiwy1i87x",
  "adminReviewedAt": "2026-10-23 11:05:51.860",
  "holdReleaseAt": null,
  "rewardedAt": "2026-10-23 11:05:51.860",
  "createdAt": "2026-10-23 10:55:19.604",
  "updatedAt": "2026-10-23 11:05:51.870",
  "deletedAt": null
}

quality_check:   {
  "id": "cmvkuvcb9000qgygoqwkev088",
  "participationId": "cmvkustv80003gygok69fw13k",
  "signalFlags": "[\"SPEEDING\"]",
  "autoScore": 0.5000,
  "reviewedBy": "cmvkugy210005fxgoiwy1i87x",
  "decision": "APPROVED",
  "createdAt": "2026-10-23 10:57:16.821",
  "updatedAt": "2026-10-23 11:03:48.828",
  "deletedAt": null
}-->
