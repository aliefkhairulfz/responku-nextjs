import { Button } from '@/components/ui/button'
import * as Card from '@/components/ui/card'

export default function RespondentTips() {
    return (
        <div className="flex w-full flex-col gap-4 items-center justify-center">
            {/* Card 1: Tips Quality Score */}
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-4">
                    {/* Header dengan Ikon Perisai */}
                    <div className="flex items-center gap-3">
                        <Card.CardTitle className="">
                            <h3 className="text-xl font-semibold leading-snug">
                                Tips Quality Score
                            </h3>
                        </Card.CardTitle>
                    </div>

                    {/* List Tips */}
                    <ul className="space-y-3">
                        {[
                            'Baca setiap pertanyaan dengan teliti',
                            'Hindari pola jawaban seragam',
                            'Jangan terlalu cepat (speeding)',
                            'Konsisten dan jujur dalam menjawab',
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

            {/* Card 2: Cari Lebih Banyak? */}
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-4">
                    {/* Header dengan Ikon Dokumen */}
                    <div className="flex items-center gap-3">
                        <Card.CardTitle className="">
                            <h3 className="text-xl font-semibold leading-snug">
                                Tips Quality Score
                            </h3>
                        </Card.CardTitle>
                    </div>

                    <p className="leading-relaxed text-muted-foreground">
                        Buka halaman Feed untuk filter lengkap dan rekomendasi survei.
                    </p>

                    <Button className="w-full">
                        Buka Feed Survei
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <line x1="5" y1="12" x2="19" y2="12" />
                            <polyline points="12 5 19 12 12 19" />
                        </svg>
                    </Button>
                </Card.CardHeader>
            </Card.Card>
        </div>
    )
}
