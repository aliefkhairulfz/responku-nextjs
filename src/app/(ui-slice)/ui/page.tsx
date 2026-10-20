import JelajahSurveiCard from '@/components/shared/jelajah-survei-card'
import KerjakanSurveiCard from '@/components/shared/kerjakan-survei-card'
import SaldoDompetAnda from '@/components/shared/saldo-dompet-anda-card'
import SebarKuesionerCard from '@/components/shared/sebar-kuesioner-card'
import StatistikBasicCard from '@/components/shared/statistik-basic-card'
import SurveiSayaCard from '@/components/shared/survei-saya-card'

export default function UiPage() {
    return (
        <div className="flex flex-col space-y-4">
            <JelajahSurveiCard />
            <SurveiSayaCard />
            <SaldoDompetAnda />
            <SebarKuesionerCard />
            <KerjakanSurveiCard />
            <StatistikBasicCard title="hello" statsNumber={4} footerTextContent="world" />
        </div>
    )
}
