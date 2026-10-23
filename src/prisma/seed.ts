import { RELIGIONS, type Education, type Gender, type Religion } from "@/lib/profile-vocabulary"
import type { ResearchCategory } from "@/lib/research-category"
import type { Role } from "@/lib/roles"
import { hashPassword } from "@/lib/server/crypto"
import { QuestionType, TokenTransactionType } from "@/prisma/generated/prisma/enums"
import { prisma } from "@/prisma/prisma"
import {
    createResearchDraftService,
    publishResearchService,
    type ResearchCriterionInput,
    type ResearchQuestionInput,
    replaceResearchQuestionsService,
    updateResearchService,
} from "@/service/research"
import { updateUserProfileService } from "@/service/user"

/**
 * LOCAL DEVELOPMENT ONLY — seeds fifteen researchers, an admin, ten respondents, and fifteen
 * published researches (one per researcher).
 *
 *   bun run src/prisma/seed.ts
 *
 * The accounts cover the three sides of the app:
 *
 *   1. Alip Peneliti 1–15  — role `researcher`; each owns one of the seeded researches
 *   2. Alip Admin          — role `admin`, can open `/admin`
 *   3. Alip Responden 1–10 — role `respondent`, spread across the criteria, so several of them
 *                            can take the seeded researches
 *
 * They all share the password below and are marked verified, so they can be signed into
 * without going through the OTP flow. Each also carries a filled-in demographic profile, so
 * the researches' screening criteria can actually be decided against it.
 *
 * Idempotent: re-running it resets the accounts and their profiles, credits a wallet once,
 * and leaves a research alone once it exists. The researches are built through the real
 * services, so their token reservations and ledger rows are written exactly the way the app
 * writes them.
 */

/* ========== Konstanta ========== */

/** Shared by all three accounts. Development only — never use this anywhere real. */
const SEED_PASSWORD = "password123"

/** Provider id used for email + password accounts, mirroring `registerService`. */
const CREDENTIALS_PROVIDER_ID = "credentials"

/** Enough to cover the seeded research's reservation with room to spare. */
const RESEARCHER_TOKENS = 1_000

const SEED_RESEARCH_TITLE = "Survei Kebiasaan Transaksi Nontunai & Dompet Digital 2026"

const SEED_RESEARCH_DESCRIPTION =
    "Riset ini memetakan kebiasaan transaksi nontunai dan preferensi dompet digital di Indonesia: " +
    "aplikasi yang dipakai, frekuensi transaksi, fitur yang menentukan pilihan, serta kendala yang " +
    "dihadapi pengguna. Jawaban Anda dipakai untuk menyusun rekomendasi produk, bukan untuk pemasaran."

/** Likert scale the editor uses for `SCALE` questions, so the seed matches what it writes. */
const LIKERT_LABELS = ["Sangat Tidak Setuju", "Tidak Setuju", "Netral", "Setuju", "Sangat Setuju"]

/** Turns a list of choice texts into the `{ pos, n, choiceText }` shape the API stores. */
function choices(texts: string[]) {
    return texts.map((choiceText, index) => ({
        pos: index + 1,
        n: String.fromCharCode(97 + index),
        choiceText,
    }))
}

/* ========== Akun ========== */

/**
 * The demographics a seeded account carries.
 *
 * Every column the profile marks NOT NULL is here, because the first write has to be
 * complete. `religion` is stored with explicit consent, which is the only way the profile
 * accepts it.
 */
type SeedProfile = {
    gender: Gender
    education: Education
    province: string
    city: string
    latitude: number
    longitude: number
    occupation: string
    phoneNumber: string
    religion: Religion
}

type SeedAccount = {
    name: string
    email: string
    roles: Role[]
    /** Tokens the wallet is credited with, once, on the run that creates it. */
    tokens: number
    profile: SeedProfile
}

/**
 * Where the fifteen seeded researchers are based, spread well beyond the researches' own
 * criteria so the researcher list is not all one city.
 */
const RESEARCHER_PLACES = [
    { province: "DKI Jakarta", city: "Jakarta Selatan", latitude: -6.2615, longitude: 106.8106 },
    { province: "DKI Jakarta", city: "Jakarta Pusat", latitude: -6.1805, longitude: 106.8284 },
    { province: "Jawa Barat", city: "Bandung", latitude: -6.9175, longitude: 107.6191 },
    { province: "DI Yogyakarta", city: "Yogyakarta", latitude: -7.7956, longitude: 110.3695 },
    { province: "Jawa Tengah", city: "Semarang", latitude: -6.9932, longitude: 110.4203 },
    { province: "Jawa Timur", city: "Surabaya", latitude: -7.2575, longitude: 112.7521 },
    { province: "Banten", city: "Tangerang", latitude: -6.1783, longitude: 106.6319 },
    { province: "Bali", city: "Denpasar", latitude: -8.6705, longitude: 115.2126 },
    { province: "Sumatera Utara", city: "Medan", latitude: 3.5952, longitude: 98.6722 },
    { province: "Sulawesi Selatan", city: "Makassar", latitude: -5.1477, longitude: 119.4327 },
    { province: "Aceh", city: "Banda Aceh", latitude: 5.5483, longitude: 95.3238 },
    { province: "Riau", city: "Pekanbaru", latitude: 0.5071, longitude: 101.4478 },
    { province: "Kalimantan Timur", city: "Balikpapan", latitude: -1.2379, longitude: 116.8529 },
    { province: "Nusa Tenggara Barat", city: "Mataram", latitude: -8.5833, longitude: 116.1167 },
    { province: "Papua", city: "Jayapura", latitude: -2.5916, longitude: 140.669 },
]

const RESEARCHER_OCCUPATIONS = [
    "Peneliti Pasar",
    "Dosen",
    "Analis Riset",
    "Konsultan Riset",
    "Data Scientist",
    "Manajer Produk",
    "Peneliti Senior",
    "Statistisi",
    "Sosiolog",
    "Akademisi",
    "Ekonom",
    "Psikolog",
    "Antropolog",
    "Jurnalis Data",
    "Guru Besar",
]

/** The three education levels the seeded research screens for, used by every seeded profile. */
const SEED_EDUCATIONS: Education[] = ["bachelor", "master", "doctorate"]

/** Fifteen researchers, each its own account, so the researches each have a distinct owner. */
const RESEARCHERS: SeedAccount[] = RESEARCHER_PLACES.map((place, index) => {
    const n = index + 1

    return {
        name: `Alip Peneliti ${n}`,
        // The first keeps the original address, so the already-seeded research stays its own
        // rather than a second copy being created under a new owner.
        email: n === 1 ? "alip-peneliti@example.com" : `alip-peneliti-${n}@example.com`,
        roles: ["researcher"],
        tokens: RESEARCHER_TOKENS,
        profile: {
            gender: n % 2 === 0 ? "female" : "male",
            education: SEED_EDUCATIONS[index % SEED_EDUCATIONS.length],
            province: place.province,
            city: place.city,
            latitude: place.latitude,
            longitude: place.longitude,
            occupation: RESEARCHER_OCCUPATIONS[index % RESEARCHER_OCCUPATIONS.length],
            phoneNumber: `+6281200000${String(n + 20).padStart(2, "0")}`,
            religion: RELIGIONS[index % RELIGIONS.length],
        },
    }
})

const ADMIN: SeedAccount = {
    name: "Alip Admin",
    email: "alip-admin@example.com",
    roles: ["researcher", "respondent", "admin"],
    tokens: 0,
    profile: {
        gender: "female",
        education: "bachelor",
        province: "DKI Jakarta",
        city: "Jakarta Pusat",
        latitude: -6.1805,
        longitude: 106.8284,
        occupation: "Manajer Operasional",
        phoneNumber: "+6281200000002",
        religion: "protestant",
    },
}

/**
 * Where the ten seeded respondents live.
 *
 * Every place is inside the seeded research's criteria — a province it screens for — so each
 * respondent can actually join it once signed in, instead of being turned away by screening.
 */
const RESPONDENT_PLACES = [
    { province: "DKI Jakarta", city: "Jakarta Pusat", latitude: -6.1805, longitude: 106.8284 },
    { province: "DKI Jakarta", city: "Jakarta Selatan", latitude: -6.2615, longitude: 106.8106 },
    { province: "DKI Jakarta", city: "Jakarta Barat", latitude: -6.1683, longitude: 106.7588 },
    { province: "DKI Jakarta", city: "Jakarta Timur", latitude: -6.225, longitude: 106.9004 },
    { province: "Jawa Barat", city: "Bandung", latitude: -6.9175, longitude: 107.6191 },
    { province: "Jawa Barat", city: "Bekasi", latitude: -6.2383, longitude: 106.9756 },
    { province: "Jawa Barat", city: "Bogor", latitude: -6.5944, longitude: 106.7892 },
    { province: "Banten", city: "Tangerang", latitude: -6.1783, longitude: 106.6319 },
    { province: "Banten", city: "Tangerang Selatan", latitude: -6.2884, longitude: 106.7179 },
    { province: "Banten", city: "Serang", latitude: -6.1104, longitude: 106.1503 },
]

const RESPONDENT_OCCUPATIONS = [
    "Desainer Grafis Lepas",
    "Karyawan Swasta",
    "Guru",
    "Analis Data",
    "Wirausaha",
    "Mahasiswa",
    "Perawat",
    "Akuntan",
    "Konsultan Pajak",
    "Pegawai Negeri",
]

/** Ten respondents, varied just enough that lists and filters have something to show. */
const RESPONDENTS: SeedAccount[] = RESPONDENT_PLACES.map((place, index) => {
    const n = index + 1

    return {
        name: `Alip Responden ${n}`,
        email: `alip-responden-${n}@example.com`,
        roles: ["respondent"],
        tokens: 0,
        profile: {
            gender: n % 2 === 0 ? "female" : "male",
            education: SEED_EDUCATIONS[index % SEED_EDUCATIONS.length],
            province: place.province,
            city: place.city,
            latitude: place.latitude,
            longitude: place.longitude,
            occupation: RESPONDENT_OCCUPATIONS[index % RESPONDENT_OCCUPATIONS.length],
            phoneNumber: `+6281200000${String(n).padStart(2, "0")}`,
            religion: RELIGIONS[index % RELIGIONS.length],
        },
    }
})

/**
 * Creates or resets one account, with the profile, credentials account, and wallet it needs
 * to sign in, be screened, and spend.
 *
 * The wallet is credited once, on the run that first seeds the account, and the ledger row
 * goes in with the credit so the wallet's history still adds up to its balance.
 */
async function seedAccount({ name, email, roles, tokens, profile }: SeedAccount) {
    const password = await hashPassword(SEED_PASSWORD)

    const user = await prisma.user.upsert({
        where: { email },
        create: { name, email, roles, verifiedAt: new Date() },
        update: { name, roles, verifiedAt: new Date(), deletedAt: null },
        select: { id: true },
    })

    // Through the service, so the religion-consent rule is applied the same way the profile
    // page applies it rather than bypassed.
    await updateUserProfileService({
        userId: user.id,
        gender: profile.gender,
        education: profile.education,
        province: profile.province,
        city: profile.city,
        latitude: profile.latitude,
        longitude: profile.longitude,
        occupation: profile.occupation,
        phoneNumber: profile.phoneNumber,
        religion: profile.religion,
        religionConsent: true,
    })

    await prisma.account.upsert({
        where: { providerId_accountId: { providerId: CREDENTIALS_PROVIDER_ID, accountId: email } },
        create: {
            userId: user.id,
            providerId: CREDENTIALS_PROVIDER_ID,
            accountId: email,
            password,
        },
        update: { password, deletedAt: null },
    })

    const wallet = await prisma.tokenWallet.upsert({
        where: { userId: user.id },
        create: { userId: user.id, balance: 0 },
        update: {},
        select: { id: true },
    })

    // Credited once, keyed on the account. A re-run must not hand back the tokens the
    // research already reserved — that would leave the reservation unfunded. Later top-ups
    // are `scripts/credit-wallet.ts`'s job.
    const topupKey = `seed-topup:${user.id}`
    const alreadyCredited = await prisma.tokenTransaction.findUnique({
        where: { idempotencyKey: topupKey },
        select: { id: true },
    })

    if (alreadyCredited === null && tokens > 0) {
        await prisma.tokenWallet.update({
            where: { id: wallet.id },
            data: { balance: { increment: tokens } },
        })

        await prisma.tokenTransaction.create({
            data: {
                walletId: wallet.id,
                type: TokenTransactionType.TOPUP,
                amount: tokens,
                idempotencyKey: topupKey,
            },
        })
    }

    console.log(`  ${email}  (${roles.join(", ")})`)
    return user
}

/* ========== Riset ========== */

/**
 * Screening rules the research applies before anybody can join.
 *
 * Both fields are ones the profile actually stores, so a filled-in profile is decided
 * against them rather than coming back undecided. `province` is free text on the profile, so
 * its values have to match what a respondent typed. The editor also offers `age` and
 * `region`, which nothing stores yet — a rule about either would always come back undecided.
 */
const CRITERIA: ResearchCriterionInput[] = [
    { field: "education", operator: "IN", value: "bachelor,master,doctorate" },
    { field: "province", operator: "IN", value: "DKI Jakarta,Jawa Barat,Banten" },
]

/**
 * The seeded questionnaire: ten questions covering every type the respondent page can
 * render — single choice, multiple choice, Likert scale, and free text.
 *
 * `NUMBER` is left out on purpose: the API accepts it, but the respondent page has no input
 * for it yet, so a seeded one could not be answered.
 */
const QUESTIONS: ResearchQuestionInput[] = [
    {
        pos: 1,
        question: "Berapa usia Anda saat ini?",
        questionType: QuestionType.SINGLE_CHOICE,
        choices: choices(["17–24 tahun", "25–34 tahun", "35–44 tahun", "45 tahun ke atas"]),
    },
    {
        pos: 2,
        question: "Apa jenis kelamin Anda?",
        questionType: QuestionType.SINGLE_CHOICE,
        choices: choices(["Laki-laki", "Perempuan"]),
    },
    {
        pos: 3,
        question: "Apa pendidikan terakhir yang Anda selesaikan?",
        questionType: QuestionType.SINGLE_CHOICE,
        choices: choices(["SMA/SMK", "Diploma", "Sarjana", "Magister atau lebih"]),
    },
    {
        pos: 4,
        question: "Aplikasi dompet digital apa saja yang Anda gunakan dalam 3 bulan terakhir?",
        questionType: QuestionType.MULTIPLE_CHOICE,
        choices: choices(["GoPay", "OVO", "DANA", "ShopeePay", "Lainnya"]),
    },
    {
        pos: 5,
        question: "Seberapa sering Anda bertransaksi nontunai dalam sehari?",
        questionType: QuestionType.SINGLE_CHOICE,
        choices: choices(["Tidak pernah", "1–2 kali", "3–5 kali", "Lebih dari 5 kali"]),
    },
    {
        pos: 6,
        question: "Seberapa setuju Anda bahwa dompet digital membuat transaksi harian lebih mudah?",
        questionType: QuestionType.SCALE,
        choices: choices(LIKERT_LABELS),
    },
    {
        pos: 7,
        question: "Fitur apa yang paling menentukan pilihan Anda terhadap sebuah dompet digital?",
        questionType: QuestionType.MULTIPLE_CHOICE,
        choices: choices(["Biaya admin rendah", "Banyak promo dan cashback", "Diterima di banyak merchant", "Keamanan dan keandalan"]),
    },
    {
        pos: 8,
        question: "Seberapa setuju Anda bahwa keamanan data menjadi kekhawatiran utama saat bertransaksi nontunai?",
        questionType: QuestionType.SCALE,
        choices: choices(LIKERT_LABELS),
    },
    {
        pos: 9,
        question: "Apa kendala utama yang Anda alami saat bertransaksi nontunai?",
        questionType: QuestionType.TEXT,
    },
    {
        pos: 10,
        question: "Saran apa yang Anda berikan untuk meningkatkan layanan dompet digital di Indonesia?",
        questionType: QuestionType.TEXT,
    },
]

/**
 * The one question each of the lighter seeded researches carries.
 *
 * A research cannot be published with an empty questionnaire — the publish step refuses one —
 * so every seeded research has at least this. The fourteen besides the first are otherwise
 * about their header, not their content.
 */
const MINIMAL_QUESTIONS: ResearchQuestionInput[] = [
    {
        pos: 1,
        question: "Seberapa besar minat Anda pada topik riset ini?",
        questionType: QuestionType.SCALE,
        choices: choices(LIKERT_LABELS),
    },
]

/** One seeded research: its header, and everything the services need to publish it. */
type SeedResearchDefinition = {
    title: string
    description: string
    category: ResearchCategory
    /** Domicile region the research targets, as the editor's key. Omitted means everyone. */
    region?: string
    target: number
    tokens: number
    minutes: number
    /** The questionnaire; omitted falls back to the shared minimal one. */
    questions?: ResearchQuestionInput[]
}

/**
 * The fifteen seeded researches, one per researcher.
 *
 * The first is the full survey — ten questions covering every type the respondent page can
 * render — and keeps the title it was first seeded under, so an existing copy is reused
 * instead of a second one being created. The rest are headers with a single question each,
 * which is all a published research strictly needs.
 */
const SEED_RESEARCHES: SeedResearchDefinition[] = [
    {
        title: SEED_RESEARCH_TITLE,
        description: SEED_RESEARCH_DESCRIPTION,
        category: "fintech",
        target: 20,
        tokens: 2,
        minutes: 8,
        questions: QUESTIONS,
    },
    {
        title: "Preferensi Belanja Online di Marketplace 2026",
        description: "Perilaku belanja daring: alasan memilih marketplace, metode pembayaran, dan pengalaman pengiriman.",
        category: "retail",
        region: "jabodetabek",
        target: 25,
        tokens: 2,
        minutes: 6,
    },
    {
        title: "Efektivitas Pembelajaran Daring di Perguruan Tinggi",
        description: "Pengalaman mahasiswa dengan kelas daring: kualitas materi, interaksi, dan kendala teknis.",
        category: "education",
        region: "jawa-lainnya",
        target: 30,
        tokens: 2,
        minutes: 7,
    },
    {
        title: "Kebiasaan Olahraga dan Pola Tidur Warga Kota",
        description: "Rutinitas olahraga, durasi tidur, dan keluhan kesehatan ringan pada pekerja perkotaan.",
        category: "health",
        region: "jabodetabek",
        target: 20,
        tokens: 2,
        minutes: 5,
    },
    {
        title: "Adopsi AI Generatif di Tempat Kerja",
        description: "Bagaimana karyawan memakai alat AI generatif untuk pekerjaan sehari-hari, dan kendalanya.",
        category: "technology",
        target: 25,
        tokens: 3,
        minutes: 8,
    },
    {
        title: "Kepuasan Layanan Transportasi Umum",
        description: "Persepsi penumpang terhadap ketepatan, kenyamanan, dan keterjangkauan transportasi umum.",
        category: "retail",
        region: "jawa-lainnya",
        target: 20,
        tokens: 2,
        minutes: 6,
    },
    {
        title: "Minat Investasi Reksa Dana Generasi Milenial",
        description: "Pemahaman, preferensi produk, dan faktor pendorong keputusan investasi generasi milenial.",
        category: "fintech",
        region: "luar-jawa",
        target: 20,
        tokens: 3,
        minutes: 7,
    },
    {
        title: "Pengalaman Belanja Kebutuhan Harian",
        description: "Kebiasaan berbelanja kebutuhan rumah tangga, dari pasar tradisional sampai ritel modern.",
        category: "retail",
        region: "jabodetabek",
        target: 25,
        tokens: 2,
        minutes: 5,
    },
    {
        title: "Literasi Kesehatan Mental di Kalangan Pekerja",
        description: "Tingkat pemahaman, keterbukaan, dan akses dukungan kesehatan mental di lingkungan kerja.",
        category: "health",
        target: 30,
        tokens: 2,
        minutes: 7,
    },
    {
        title: "Penggunaan Aplikasi Produktivitas Harian",
        description: "Aplikasi apa yang dipakai untuk mengelola tugas dan waktu, serta seberapa besar manfaatnya.",
        category: "technology",
        region: "luar-jawa",
        target: 20,
        tokens: 2,
        minutes: 6,
    },
    {
        title: "Persepsi Orang Tua terhadap Pendidikan Karakter",
        description: "Pandangan orang tua tentang penanaman karakter di sekolah dan perannya di rumah.",
        category: "education",
        region: "jawa-lainnya",
        target: 25,
        tokens: 2,
        minutes: 6,
    },
    {
        title: "Kebiasaan Menabung dan Perencanaan Keuangan",
        description: "Cara rumah tangga mengatur tabungan, dana darurat, dan tujuan keuangan jangka panjang.",
        category: "fintech",
        region: "jabodetabek",
        target: 30,
        tokens: 2,
        minutes: 7,
    },
    {
        title: "Preferensi Konten Hiburan Digital",
        description: "Jenis konten yang paling sering ditonton, platform favorit, dan kebiasaan berlangganan.",
        category: "technology",
        target: 20,
        tokens: 2,
        minutes: 5,
    },
    {
        title: "Kualitas Layanan Kesehatan Primer",
        description: "Pengalaman pasien di puskesmas dan klinik: waktu tunggu, mutu layanan, dan biaya.",
        category: "health",
        region: "luar-jawa",
        target: 25,
        tokens: 3,
        minutes: 7,
    },
    {
        title: "Pemilihan Kampus dan Jurusan Kuliah",
        description: "Faktor yang menentukan pilihan kampus dan jurusan pada calon mahasiswa.",
        category: "education",
        region: "jawa-lainnya",
        target: 20,
        tokens: 2,
        minutes: 6,
    },
]

/** The research's screening rules: the shared ones, plus a domicile rule when it targets one. */
function criteriaFor(definition: SeedResearchDefinition): ResearchCriterionInput[] {
    if (definition.region === undefined) return CRITERIA

    return [...CRITERIA, { field: "region", operator: "EQ", value: definition.region }]
}

/**
 * Creates one seeded research and publishes it, or leaves the one already there alone.
 *
 * Publishing is what reserves the reward budget, so it goes through `publishResearchService`
 * rather than writing the status directly — the reservation, its ledger row, and the status
 * change then land exactly as they would from the app. A published research's criteria and
 * questionnaire can no longer be changed, so an existing one is never touched.
 */
async function seedResearch(researcherId: string, definition: SeedResearchDefinition) {
    const existing = await prisma.research.findFirst({
        where: { researcherId, title: definition.title, deletedAt: null },
        select: { id: true },
    })

    if (existing !== null) {
        console.log(`  "${definition.title}" already seeded (${existing.id})`)
        return
    }

    const draft = await createResearchDraftService({ researcherId })

    await updateResearchService({
        id: draft.id,
        researcherId,
        title: definition.title,
        description: definition.description,
        category: definition.category,
        targetRespondentCount: definition.target,
        tokenPerRespondent: definition.tokens,
        estimatedDurationMinutes: definition.minutes,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        criteria: criteriaFor(definition),
    })

    await replaceResearchQuestionsService({ id: draft.id, researcherId, questions: definition.questions ?? MINIMAL_QUESTIONS })

    await publishResearchService({ id: draft.id, researcherId })

    console.log(`  "${definition.title}" published (${draft.id})`)
}

/* ========== Jalan ========== */

console.log("Seeding accounts…")
const researchers = await Promise.all(RESEARCHERS.map((account) => seedAccount(account)))
await Promise.all([ADMIN, ...RESPONDENTS].map((account) => seedAccount(account)))

console.log("Seeding researches…")
// One research per researcher, in order — fifteen researches, each with its own owner.
for (const [index, definition] of SEED_RESEARCHES.entries()) {
    await seedResearch(researchers[index].id, definition)
}

console.log(`\nDone. Sign in with any of the accounts above, password: ${SEED_PASSWORD}`)

await prisma.$disconnect()
