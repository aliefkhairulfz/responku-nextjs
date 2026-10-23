import type { Education, Gender, Religion } from "@/lib/profile-vocabulary"
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
 * LOCAL DEVELOPMENT ONLY — seeds three accounts and one published research.
 *
 *   bun run src/prisma/seed.ts
 *
 * The three accounts cover the three sides of the app:
 *
 *   1. Alip Peneliti   — role `researcher`, owns the seeded research
 *   2. Alip Admin      — role `admin`, can open `/admin`
 *   3. Alip Freelancer — role `respondent`, can take the seeded research
 *
 * All three share the password below and are marked verified, so they can be signed into
 * without going through the OTP flow. Each also carries a filled-in demographic profile, so
 * the research's screening criteria can actually be decided against it.
 *
 * Idempotent: re-running it resets the accounts and their profiles, credits a wallet once,
 * and leaves the research alone once it exists. The research is built through the real
 * services, so its token reservation and ledger row are written exactly the way the app
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

const PENELITI: SeedAccount = {
    name: "Alip Peneliti",
    email: "alip-peneliti@example.com",
    roles: ["researcher"],
    tokens: RESEARCHER_TOKENS,
    profile: {
        gender: "male",
        education: "master",
        province: "DKI Jakarta",
        city: "Jakarta Selatan",
        latitude: -6.2615,
        longitude: 106.8106,
        occupation: "Peneliti Pasar",
        phoneNumber: "+6281200000001",
        religion: "islam",
    },
}

const OTHER_ACCOUNTS: SeedAccount[] = [
    {
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
    },
    {
        name: "Alip Freelancer",
        email: "alip-freelancer@example.com",
        roles: ["respondent"],
        tokens: 0,
        // Deliberately matches the seeded research's criteria: `bachelor` is in the
        // education list, and `DKI Jakarta` is in the province list.
        profile: {
            gender: "female",
            education: "bachelor",
            province: "DKI Jakarta",
            city: "Jakarta Barat",
            latitude: -6.1683,
            longitude: 106.7588,
            occupation: "Desainer Grafis Lepas",
            phoneNumber: "+6281200000003",
            religion: "islam",
        },
    },
]

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
 * Creates the seeded research and publishes it, or returns the one already there.
 *
 * Publishing is what reserves the reward budget, so it is done through
 * `publishResearchService` rather than by writing the status directly — the reservation, its
 * ledger row, and the status change then land exactly as they would from the app.
 */
async function seedResearch(researcherId: string) {
    const existing = await prisma.research.findFirst({
        where: { researcherId, title: SEED_RESEARCH_TITLE, deletedAt: null },
        select: { id: true },
    })

    if (existing !== null) {
        console.log(`  research already seeded (${existing.id})`)
        return existing.id
    }

    const draft = await createResearchDraftService({ researcherId })

    await updateResearchService({
        id: draft.id,
        researcherId,
        title: SEED_RESEARCH_TITLE,
        description: SEED_RESEARCH_DESCRIPTION,
        category: "fintech",
        targetRespondentCount: 20,
        tokenPerRespondent: 2,
        estimatedDurationMinutes: 8,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        criteria: CRITERIA,
    })

    await replaceResearchQuestionsService({ id: draft.id, researcherId, questions: QUESTIONS })

    await publishResearchService({ id: draft.id, researcherId })

    console.log(`  "${SEED_RESEARCH_TITLE}" published with ${QUESTIONS.length} questions (${draft.id})`)
    return draft.id
}

/* ========== Jalan ========== */

console.log("Seeding accounts…")
const peneliti = await seedAccount(PENELITI)
await Promise.all(OTHER_ACCOUNTS.map(seedAccount))

console.log("Seeding research…")
await seedResearch(peneliti.id)

console.log(`\nDone. Sign in with any of the accounts above, password: ${SEED_PASSWORD}`)

await prisma.$disconnect()
