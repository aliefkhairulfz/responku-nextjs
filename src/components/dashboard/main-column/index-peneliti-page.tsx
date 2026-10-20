'use client'

import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import StatistikBasicCard from '@/components/shared/statistik-basic-card'
import SurveiSayaCard from '@/components/shared/survei-saya-card'
import TntPeneliti from '@/components/shared/tnt-peneliti'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function DashboardMainColumnIndexPenelitiPage() {
    return (
        <div className="space-y-6">
            {/*hello*/}
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">Selamat Malam Bulan</h3>
                    <p className="leading-relaxed text-muted-foreground">
                        Pantau progres riset, kelola kuesioner, dan lihat insight dari responden.
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <StatistikBasicCard
                        title="Saldo Token"
                        statsNumber={250}
                        footerTextContent="token tersedia"
                    />
                    <StatistikBasicCard
                        title="Riset Aktif"
                        statsNumber={2}
                        footerTextContent="sedang berjalan"
                    />
                    <StatistikBasicCard
                        title="Total Responden"
                        statsNumber={130}
                        footerTextContent="terkumpul"
                    />
                    <StatistikBasicCard
                        title="Completion Rate"
                        statsNumber={`85%`}
                        footerTextContent="rata-rata"
                    />
                </div>
            </div>

            <Separator />

            {/*feed*/}
            <div className="grid grid-cols-[100%_0%] lg:grid-cols-[60%_40%] gap-4">
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-xl font-semibold leading-snug">Riset Saya</h3>
                            <p className="leading-relaxed text-muted-foreground">
                                4 Reset Ditemukan
                            </p>
                        </div>

                        <Link
                            href="/"
                            className="flex items-center gap-0.5 text-blue-500 text-sm font-medium"
                        >
                            <span>Lihat Semua</span>
                            <ArrowRightIcon className="size-5" />
                        </Link>
                        {/*<UiPage />*/}
                    </div>

                    <div className="flex items-center space-x-2">
                        <Badge className="px-4! py-3!">Semua</Badge>
                        <Badge variant="outline" className="px-4! py-3!">
                            Semua
                        </Badge>
                        <Badge variant="outline" className="px-4! py-3!">
                            Semua
                        </Badge>
                        <Badge variant="outline" className="px-4! py-3!">
                            Semua
                        </Badge>
                        <Badge variant="outline" className="px-4! py-3!">
                            Semua
                        </Badge>
                    </div>

                    <div className="space-y-4">
                        <SurveiSayaCard />
                        <SurveiSayaCard />
                        <SurveiSayaCard />
                        <SurveiSayaCard />
                    </div>
                </div>

                <div className="hidden lg:block sticky -top-3 self-start space-y-4">
                    {/*<SaldoDompetAnda />*/}
                    {/*<TntResponden />*/}
                    <TntPeneliti />
                </div>
            </div>
        </div>
    )
}
