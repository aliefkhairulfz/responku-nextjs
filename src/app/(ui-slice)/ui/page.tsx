import BrowseSurveyCard from "@/components/shared/browse-survey-card"
import WorkOnSurveyCard from "@/components/shared/work-on-survey-card"
import YourWalletBalanceCard from "@/components/shared/your-wallet-balance-card"
import DistributeQuestionnaireCard from "@/components/shared/distribute-questionnaire-card"
import BasicStatisticsCard from "@/components/shared/basic-statistics-card"
import MySurveysCard from "@/components/shared/my-surveys-card"
import type { AvailableResearch, ResearchSummary } from "@/lib/api-types"

/** Sample data for the gallery — real rows come from `GET /api/research`. */
const sampleResearch: ResearchSummary = {
    id: "sample",
    title: "Survei Preferensi Penggunaan E-Wallet di Jabodetabek",
    status: "PUBLISHED",
    questionCount: 12,
    targetRespondentCount: 100,
    tokensReserved: 100,
    tokensConsumed: 68,
    respondentCount: 68,
    updatedAt: "2026-09-02T00:00:00.000Z",
}

/** Sample data for the gallery — real rows come from `GET /api/research/available`. */
const sampleAvailable: AvailableResearch = {
    id: "sample-available",
    title: "Survei Preferensi Penggunaan Aplikasi Finansial & Dompet Digital 2026",
    description: "Riset pola transaksi nontunai, fitur transfer instan, dan kebiasaan menabung generasi muda Indonesia.",
    category: "fintech",
    researcherName: "Fakultas Ekonomi UI",
    tokenPerRespondent: 2,
    rewardIdr: 2000,
    estimatedDurationMinutes: 8,
    deadline: "2026-12-31T00:00:00.000Z",
    respondentCount: 82,
    targetRespondentCount: 100,
}

export default function UiPage() {
    return (
        <div className="flex flex-col space-y-4">
            <BrowseSurveyCard research={sampleAvailable} />
            <MySurveysCard research={sampleResearch} />
            <YourWalletBalanceCard balance={100} balanceIdr={100_000} />
            <DistributeQuestionnaireCard />
            <WorkOnSurveyCard />
            <BasicStatisticsCard title="hello" statsNumber={4} footerTextContent="world" />
        </div>
    )
}
