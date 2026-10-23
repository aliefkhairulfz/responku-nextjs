# Concern

Catatan hal-hal yang perlu dijelaskan, dipertanyakan, atau ditindaklanjuti. Bukan dokumentasi
endpoint — itu ada di `API.md`.

---

## `screeningScore` dan `autoScreeningResult` pada partisipasi

**Pertanyaan:** kenapa baris partisipasi langsung berisi `"screeningScore": 100` dan
`"autoScreeningResult": "PASS"` begitu responden join?

**Jawaban:** itu hasil **auto-screening** — pencocokan profil responden terhadap `criteria` yang
dipasang peneliti, dihitung **saat join**. Ini bukan penilaian kualitas jawaban.

### Kapan dan bagaimana dihitung

`joinResearchService` (`src/service/participation.ts`):

```ts
const screening = screenCriteria(research.criteria, await readScreenableProfile(respondentId))

if (screening.failed.length > 0) {
    throw new BadRequestException("This research's criteria are not met", ...) // join DITOLAK 422
}

const screeningResult =
    research.criteria.length === 0
        ? null
        : screening.undecided.length > 0
          ? AutoScreeningResult.NEEDS_REVIEW
          : AutoScreeningResult.PASS
```

### Arti tiap nilai

| Nilai          | Artinya                                                                | Join?            |
| -------------- | ---------------------------------------------------------------------- | ---------------- |
| `null`         | Riset tidak punya criteria — terbuka untuk siapa saja                  | ✅               |
| `PASS`         | Ada criteria, semuanya bisa diputuskan dan terpenuhi                   | ✅               |
| `NEEDS_REVIEW` | Ada criteria, ada yang tidak bisa diputuskan (mis. profil belum diisi) | ✅ tapi ditandai |
| _(tidak ada)_  | Ada rule yang gagal → join ditolak `422`, bukan dicatat sebagai hasil  | ❌               |

`AutoScreeningResult.FAIL` ada di enum tapi **tidak pernah ditulis**: kegagalan memblokir join,
bukan menjadi hasil.

### `screeningScore`

Persentase rule yang terpenuhi. Rule yang _undecided_ dihitung **tidak terpenuhi**, jadi angkanya
tidak pernah menyanjung. Riset tanpa criteria → `null`.

### Kenapa di seeder hasilnya 100 / PASS

Riset yang di-seed punya 2 criteria:

```
education IN "bachelor,master,doctorate"
province  IN "DKI Jakarta,Jawa Barat,Banten"
```

Profil Alip Freelancer sengaja dibuat cocok (`education = bachelor`, `province = DKI Jakarta`), jadi
kedua rule terpenuhi → `failed = []`, `undecided = []`, `score = 100`, `PASS`.

### Dua hal yang mudah salah dibaca

1. **Dihitung sekali saat join, lalu disimpan.** Mengubah profil setelahnya tidak mengubah nilai di
   baris partisipasi itu.
2. **Bukan quality check.** Screening menilai _siapa_ respondennya (profil vs criteria); quality
   check menilai _bagaimana_ dia menjawab (`SPEEDING`, `STRAIGHT_LINING`), dan baru dihitung saat
   submit.

|         | Screening                               | Quality check              |
| ------- | --------------------------------------- | -------------------------- |
| Menilai | siapa respondennya                      | bagaimana dia menjawab     |
| Kapan   | saat join                               | saat submit                |
| Field   | `screeningScore`, `autoScreeningResult` | `signalFlags`, `autoScore` |

Jadi `PASS` berarti "profil responden cocok dengan yang diminta peneliti", bukan "jawabannya bagus".

<!--// mulai kuesioner
respondent_participation {
  "id": "cmvkustv80003gygok69fw13k",
  "researchId": "cmvkugy2b000dfxgo4z1v04z0",
  "respondentId": "cmvkugy210006fxgowqt7u9dj",
  "status": "JOINED",
  "screeningScore": 100,
  "autoScreeningResult": "PASS",
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
  "screeningScore": 100,
  "autoScreeningResult": "PASS",
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
  "screeningScore": 100,
  "autoScreeningResult": "PASS",
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
  "screeningScore": 100,
  "autoScreeningResult": "PASS",
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
