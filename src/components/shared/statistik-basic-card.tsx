import * as Card from '@/components/ui/card'

type StatistikBasicCardProps = {
    title: string
    statsNumber: number | string
    footerTextContent: string
}

export default function StatistikBasicCard(props: StatistikBasicCardProps) {
    return (
        <div className="flex w-full items-center justify-center">
            <Card.Card className="w-full">
                <Card.CardHeader className="space-y-1">
                    {/* Bagian Atas: Ikon dan Judul */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tracking-wider">{props.title}</span>
                    </div>

                    {/* Bagian Bawah: Angka dan Deskripsi */}
                    <div className="flex flex-col">
                        <h3 className="text-xl font-semibold leading-snug">{props.statsNumber}</h3>
                        <p className="text-sm text-slate-500">{props.footerTextContent}</p>
                    </div>
                </Card.CardHeader>
            </Card.Card>
        </div>
    )
}
