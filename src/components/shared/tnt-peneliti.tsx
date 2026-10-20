import Link from 'next/link'
import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'

export default function TntPeneliti() {
    return (
        <div className="flex w-full flex-col items-center justify-center gap-4">
            {/* Card 1: Butuh Responden */}
            <Card.Card className="w-full">
                <Card.CardHeader className="items-center space-y-2 text-center">
                    <Card.CardTitle>
                        <h3 className="text-xl font-semibold leading-snug">Butuh Responden?</h3>
                    </Card.CardTitle>

                    <p className="leading-relaxed text-muted-foreground">
                        Dapatkan responden terverifikasi domisili & usia dalam hitungan jam.
                    </p>

                    <Button className="w-full">Buat Kuesioner Baru</Button>
                </Card.CardHeader>
            </Card.Card>

            {/* Card 2: Standar Mutu Riset */}
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-2">
                    <Card.CardTitle>
                        <h3 className="text-xl font-semibold leading-snug">Standar Mutu Riset</h3>
                    </Card.CardTitle>

                    <ul className="space-y-2">
                        {[
                            'Minimal responden: 50 orang',
                            'Filter GPS & usia otomatis',
                            'Deteksi anti-bot & straight-lining',
                            'Ekspor CSV siap SPSS & R',
                        ].map((tip, index) => (
                            <li key={index} className="flex items-start gap-2">
                                <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-green-600">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="22"
                                        height="22"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="m8 12 3 3 5-6" />
                                    </svg>
                                </div>

                                <span className="text-sm leading-relaxed text-muted-foreground">
                                    {tip}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Card.CardHeader>
            </Card.Card>

            {/* Card 3: Info Token */}
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-2">
                    <div className="flex items-center gap-2">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#1677ff"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <ellipse cx="12" cy="5" rx="8" ry="3" />
                            <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
                            <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
                        </svg>

                        <Card.CardTitle>
                            <h3 className="text-xl font-semibold leading-snug">Info Token</h3>
                        </Card.CardTitle>
                    </div>

                    <p className="leading-relaxed text-muted-foreground">
                        1 Token = Rp1.000. Token yang direservasi akan dikunci sebagai escrow dan
                        dicairkan secara otomatis ke responden setelah jawaban divalidasi.
                    </p>

                    <Link
                        href={'/dashboard/saldo-dompet'}
                        className="h-auto justify-start p-0 text-blue-600 flex items-center space-x-1"
                    >
                        <span>Kelola Saldo</span>
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M5 12h14" />
                            <path d="m12 5 7 7-7 7" />
                        </svg>
                    </Link>
                </Card.CardHeader>
            </Card.Card>
        </div>
    )
}
