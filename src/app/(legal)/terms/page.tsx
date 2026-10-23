import type { Metadata } from "next"
import { LegalList, LegalPage, LegalSection, LegalTerms } from "@/components/legal/legal-page"

/**
 * Syarat & Ketentuan.
 *
 * PLACEHOLDER WORDING — written to match how the product actually behaves (tokens, escrow,
 * submission review, consent), but it is not legal advice. Have it reviewed by counsel before
 * launch, and keep the `Terakhir diperbarui` date in step with any change.
 */

export const metadata: Metadata = {
    title: "Syarat & Ketentuan — Responku",
    description: "Ketentuan penggunaan layanan riset dan survei Responku bagi peneliti dan responden.",
}

export default function TermsPage() {
    return (
        <LegalPage title="Syarat & Ketentuan" updatedAt="24 Oktober 2026">
            <LegalSection heading="1. Penerimaan Ketentuan">
                <p>
                    Dengan membuat akun atau menggunakan layanan Responku, Anda menyetujui ketentuan ini. Bila Anda tidak menyetujuinya, mohon untuk
                    tidak menggunakan layanan.
                </p>
            </LegalSection>

            <LegalSection heading="2. Definisi">
                <LegalTerms
                    items={[
                        { term: "Peneliti", definition: "akun yang membuat dan menyebarkan riset." },
                        { term: "Responden", definition: "akun yang mengisi kuesioner dan menerima reward." },
                        { term: "Token", definition: "satuan saldo di dalam platform yang dipakai untuk membiayai dan menerima reward riset." },
                        { term: "Riset", definition: "satu kuesioner beserta kriteria responden, target, dan reward-nya." },
                    ]}
                />
            </LegalSection>

            <LegalSection heading="3. Akun dan Keamanan">
                <p>
                    Anda wajib memberikan data yang benar saat mendaftar dan menjaga kerahasiaan kredensial Anda. Satu orang sebaiknya hanya memiliki
                    satu akun. Anda bertanggung jawab atas seluruh aktivitas yang terjadi melalui akun Anda.
                </p>
            </LegalSection>

            <LegalSection heading="4. Kewajiban Peneliti">
                <LegalList
                    items={[
                        "Menyusun riset untuk tujuan yang sah dan tidak menyesatkan.",
                        "Menggunakan data responden hanya untuk kepentingan riset yang dinyatakan.",
                        "Tidak mengumpulkan data pribadi yang tidak diperlukan atau di luar tujuan riset.",
                        "Menyediakan reward sesuai jumlah token yang dijanjikan pada riset.",
                    ]}
                />
            </LegalSection>

            <LegalSection heading="5. Kewajiban Responden">
                <LegalList
                    items={[
                        "Menjawab dengan jujur dan sesuai keadaan Anda yang sebenarnya.",
                        "Hanya mengirim satu jawaban untuk setiap riset.",
                        "Tidak menggunakan bot, skrip, atau cara otomatis lain untuk mengisi kuesioner.",
                        "Tidak mengisi sekadar untuk mempercepat tanpa membaca pertanyaan.",
                    ]}
                />
            </LegalSection>

            <LegalSection heading="6. Token dan Pembayaran">
                <p>
                    Token bukan mata uang dan tidak berbunga. Saat sebuah riset dipublikasikan, budget reward-nya direservasi sebagai escrow dan
                    dicairkan kepada responden setelah jawaban divalidasi. Penarikan saldo diproses melalui penyedia pembayaran pihak ketiga dan dapat
                    dikenakan biaya layanan.
                </p>
            </LegalSection>

            <LegalSection heading="7. Kualitas Data dan Peninjauan">
                <p>
                    Setiap kiriman dapat ditinjau, baik secara otomatis maupun oleh admin. Kiriman yang terindikasi tidak wajar — misalnya dikerjakan
                    jauh lebih cepat dari estimasi atau dijawab asal-asalan — dapat ditolak, dan reward untuk kiriman tersebut tidak diberikan.
                </p>
            </LegalSection>

            <LegalSection heading="8. Konten dan Kekayaan Intelektual">
                <p>
                    Anda tetap memiliki hak atas konten yang Anda unggah. Dengan mengunggahnya, Anda memberi Responku izin untuk menyimpan dan
                    memproses konten tersebut sebatas yang diperlukan untuk menjalankan layanan.
                </p>
            </LegalSection>

            <LegalSection heading="9. Penangguhan dan Penghentian">
                <p>
                    Kami dapat menangguhkan atau menutup akun yang melanggar ketentuan ini, memanipulasi reward, atau merugikan pengguna lain. Anda
                    dapat berhenti menggunakan layanan kapan saja.
                </p>
            </LegalSection>

            <LegalSection heading="10. Batasan Tanggung Jawab">
                <p>
                    Layanan disediakan sebagaimana adanya. Sejauh diizinkan hukum, Responku tidak bertanggung jawab atas kerugian tidak langsung yang
                    timbul dari penggunaan layanan, termasuk mutu atau hasil riset yang dijalankan peneliti.
                </p>
            </LegalSection>

            <LegalSection heading="11. Perubahan Ketentuan">
                <p>
                    Kami dapat memperbarui ketentuan ini dari waktu ke waktu. Perubahan berlaku sejak dipublikasikan di halaman ini, dan penggunaan
                    layanan setelahnya dianggap sebagai persetujuan Anda.
                </p>
            </LegalSection>

            <LegalSection heading="12. Hukum yang Berlaku">
                <p>Ketentuan ini tunduk pada hukum Republik Indonesia.</p>
            </LegalSection>

            <LegalSection heading="13. Kontak">
                <p>
                    Pertanyaan mengenai ketentuan ini dapat disampaikan melalui{" "}
                    <a href="/help-center" className="font-medium text-foreground underline underline-offset-4">
                        Pusat Bantuan
                    </a>
                    .
                </p>
            </LegalSection>
        </LegalPage>
    )
}
