import ResearchDetailView, { type ResearchDetail } from "@/components/research/research-detail";
import { notFound } from "next/navigation";

async function getResearch(researchId: string): Promise<ResearchDetail | null> {
    if (!researchId) return null;

    return {
        id: researchId,
        title: "Evaluasi Dampak Regulasi AI pada Pengambilan Keputusan Klinis",
        researcher: "Dr. Sari Peneliti, Ph.D",
        institution: "Pusat Studi Informatika Medis Universitas Indonesia",
        description:
            "Penelitian independen untuk memetakan kesiapan tenaga kesehatan dan akademisi dalam memanfaatkan algoritma asistensi diagnostik di fasilitas layanan primer dan rujukan.",
        estimatedMinutes: 10,
        rewardToken: 15,
        tokenValueRupiah: 1000,
        criteria: "Berumur 18+ tahun, berdomisili di Indonesia, memiliki pemahaman dasar tentang teknologi medis.",
        questionnaireUrl: "https://forms.gle/contoh",
        verified: true,
    };
}

export default async function Page({ params }: { params: Promise<{ researchId: string }> }) {
    const { researchId } = await params;
    const research = await getResearch(researchId);

    if (!research) notFound();
    return <ResearchDetailView research={research} />;
}
