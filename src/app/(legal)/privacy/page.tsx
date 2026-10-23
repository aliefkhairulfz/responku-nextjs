import type { Metadata } from "next"
import { LegalList, LegalPage, LegalSection, LegalTerms } from "@/components/legal/legal-page"

/**
 * Kebijakan Privasi.
 *
 * PLACEHOLDER WORDING — it describes what the product actually stores (profile, domicile,
 * answers, tokens) and how it behaves, but it is not legal advice. Have it reviewed by counsel
 * before launch, and keep the `Terakhir diperbarui` date in step with any change.
 */

export const metadata: Metadata = {
    title: "Kebijakan Privasi — Responku",
    description: "Bagaimana Responku mengumpulkan, memakai, dan melindungi data peneliti dan responden.",
}

export default function PrivacyPage() {
    return (
        <LegalPage title="Kebijakan Privasi" updatedAt="24 Oktober 2026">
            <LegalSection heading="1. Ringkasan">
                <p>
                    Kami mengumpulkan data sebatas yang diperlukan untuk menjalankan layanan: agar Anda bisa masuk, dicocokkan dengan riset yang
                    sesuai, mengisi kuesioner, dan menerima reward. Kami tidak menjual data pribadi Anda.
                </p>
            </LegalSection>

            <LegalSection heading="2. Data yang Kami Kumpulkan">
                <LegalTerms
                    items={[
                        { term: "Data akun", definition: "nama, alamat email, dan foto profil bila ada." },
                        { term: "Profil demografi", definition: "jenis kelamin, pendidikan, pekerjaan, dan agama (hanya bila Anda menyetujuinya)." },
                        {
                            term: "Domisili",
                            definition:
                                "provinsi, kota, serta koordinat yang diambil dari perangkat, dipakai untuk memverifikasi domisili dan mencocokkan riset di sekitar Anda.",
                        },
                        { term: "Jawaban kuesioner", definition: "jawaban yang Anda kirim, beserta waktu mulai dan waktu pengiriman." },
                        {
                            term: "Data dompet dan pembayaran",
                            definition: "saldo token, riwayat transaksi, dan data yang diperlukan untuk penarikan.",
                        },
                        {
                            term: "Data teknis",
                            definition: "alamat IP, jenis perangkat, dan sesi masuk, untuk keamanan dan pencegahan penyalahgunaan.",
                        },
                    ]}
                />
            </LegalSection>

            <LegalSection heading="3. Dasar dan Tujuan Pemrosesan">
                <LegalList
                    items={[
                        "Menjalankan layanan: menyediakan akun, kuesioner, dan dompet token.",
                        "Mencocokkan responden dengan riset lewat kriteria usia, gender, dan wilayah domisili.",
                        "Membayar reward dan memproses penarikan saldo.",
                        "Menjaga kualitas data: mendeteksi kiriman yang tidak wajar dan mencegah penyalahgunaan.",
                        "Memenuhi kewajiban hukum yang berlaku.",
                    ]}
                />
            </LegalSection>

            <LegalSection heading="4. Persetujuan untuk Data Sensitif">
                <p>
                    Agama termasuk data yang bersifat sensitif, sehingga hanya disimpan bila Anda memberi persetujuan secara eksplisit. Anda dapat
                    menarik persetujuan tersebut kapan saja melalui halaman profil; setelah ditarik, data agama tidak lagi dipakai untuk pencocokan
                    riset.
                </p>
            </LegalSection>

            <LegalSection heading="5. Berbagi Data dengan Peneliti">
                <p>
                    Peneliti menerima jawaban responden untuk risetnya, namun tidak menerima identitas pribadi Anda seperti nama atau alamat email.
                    Data domisili dan demografi dipakai untuk pencocokan dan pelaporan dalam bentuk yang tidak mengidentifikasi Anda secara langsung.
                </p>
            </LegalSection>

            <LegalSection heading="6. Cookie dan Sesi">
                <p>
                    Kami memakai cookie sesi untuk menjaga Anda tetap masuk. Cookie ini bersifat esensial untuk layanan dan tidak dipakai untuk
                    melacak Anda di situs lain.
                </p>
            </LegalSection>

            <LegalSection heading="7. Penyimpanan dan Keamanan">
                <p>
                    Kata sandi disimpan dalam bentuk hash dan tidak pernah dalam bentuk asli. Kami membatasi akses ke data, memakai koneksi
                    terenkripsi, dan mencatat aktivitas yang berkaitan dengan keamanan akun.
                </p>
            </LegalSection>

            <LegalSection heading="8. Berapa Lama Kami Menyimpan">
                <p>
                    Data disimpan selama akun Anda aktif. Setelah akun dihapus, data pribadi dihapus atau dianonimkan, kecuali yang masih perlu
                    disimpan untuk memenuhi kewajiban hukum atau menyelesaikan sengketa.
                </p>
            </LegalSection>

            <LegalSection heading="9. Hak Anda">
                <LegalList
                    items={[
                        "Melihat dan memperbarui profil serta domisili Anda di halaman profil.",
                        "Mengunduh salinan data akun Anda melalui menu ekspor data.",
                        "Menarik persetujuan atas data sensitif.",
                        "Meminta penghapusan akun dan data pribadi Anda.",
                    ]}
                />
            </LegalSection>

            <LegalSection heading="10. Anak di Bawah Umur">
                <p>Layanan ini ditujukan untuk pengguna berusia 18 tahun ke atas. Kami tidak dengan sengaja mengumpulkan data anak di bawah umur.</p>
            </LegalSection>

            <LegalSection heading="11. Perubahan Kebijakan">
                <p>
                    Kami dapat memperbarui kebijakan ini dari waktu ke waktu. Perubahan berlaku sejak dipublikasikan di halaman ini, dan kami akan
                    berupaya memberi tahu Anda bila perubahannya bersifat material.
                </p>
            </LegalSection>

            <LegalSection heading="12. Kontak">
                <p>
                    Pertanyaan atau permintaan terkait data pribadi dapat disampaikan melalui{" "}
                    <a href="/help-center" className="font-medium text-foreground underline underline-offset-4">
                        Pusat Bantuan
                    </a>
                    .
                </p>
            </LegalSection>
        </LegalPage>
    )
}
