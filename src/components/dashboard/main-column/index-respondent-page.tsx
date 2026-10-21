'use client'

import { ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import BrowseSurveyCard from '@/components/shared/browse-survey-card'
import YourWalletBalanceCard from '@/components/shared/your-wallet-balance-card'
import BasicStatisticsCard from '@/components/shared/basic-statistics-card'
import RespondentTips from '@/components/shared/respondent-tips'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default function DashboardMainColumnIndexRespondentPage() {
    return (
        <div className="space-y-6">
            {/*hello*/}
            <div className="space-y-4">
                <div>
                    <h3 className="text-xl font-semibold leading-snug">Selamat Malam Bulan</h3>
                    <p className="leading-relaxed text-muted-foreground">
                        Yuk lihat survei yang bisa kamu kerjakan hari ini dan dapatkan reward!
                    </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                    <BasicStatisticsCard
                        title="Survei Tersedia"
                        statsNumber={4}
                        footerTextContent="cocok profilmu"
                    />
                    <BasicStatisticsCard
                        title="Survei Tersedia"
                        statsNumber={4}
                        footerTextContent="cocok profilmu"
                    />
                    <BasicStatisticsCard
                        title="Survei Tersedia"
                        statsNumber={4}
                        footerTextContent="cocok profilmu"
                    />
                    <BasicStatisticsCard
                        title="Survei Tersedia"
                        statsNumber={4}
                        footerTextContent="cocok profilmu"
                    />
                </div>
            </div>

            <Separator />

            {/*feed*/}
            <div className="grid grid-cols-[100%_0%] lg:grid-cols-[60%_40%] gap-4">
                <div className="space-y-4">
                    <div className="flex justify-between">
                        <div>
                            <h3 className="text-xl font-semibold leading-snug">Survei Tersedia</h3>
                            <p className="leading-relaxed text-muted-foreground">
                                4 Survei cocok dengan profilmu
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
                        <BrowseSurveyCard />
                        <BrowseSurveyCard />
                        <BrowseSurveyCard />
                        <BrowseSurveyCard />
                    </div>
                </div>

                <div className="hidden lg:block sticky -top-3 self-start space-y-4">
                    <YourWalletBalanceCard />
                    <RespondentTips />
                </div>
            </div>
        </div>
    )
}
