import Image from "next/image"

/**
 * The "founders" band: the people behind Responku, laid out like the community band but with
 * photos instead of video thumbnails.
 *
 * Static, so it stays a server component. The portraits are remote placeholders — swap them
 * for real photos (and drop the `i.pravatar.cc` entry from `next.config.ts`) before launch.
 */

const FOUNDERS = [
    { name: "Imam Mashduqi", role: "Co-founder & CEO", photo: "https://i.pravatar.cc/800?img=12" },
    { name: "Azhar Rizqullah", role: "Co-founder & CTO", photo: "https://i.pravatar.cc/800?img=32" },
    { name: "Alief Khairul Fadzli", role: "Engineer & Co-founder", photo: "https://i.pravatar.cc/800?img=45" },
]

export default function Founders() {
    return (
        <section className="border-t">
            <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
                <div className="max-w-2xl">
                    <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">Founder Responku</h2>
                    <p className="mt-4 leading-relaxed text-muted-foreground">Orang-orang yang membangun Responku dari awal.</p>
                </div>

                <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {FOUNDERS.map((founder) => (
                        <article key={founder.name} className="relative aspect-[4/3] overflow-hidden rounded-2xl ring-1 ring-foreground/10">
                            <Image
                                src={founder.photo}
                                alt={founder.name}
                                fill
                                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                                className="object-cover"
                            />
                            {/* keeps the white name legible over the photo */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

                            <div className="absolute inset-x-4 bottom-4">
                                <p className="text-lg leading-snug font-semibold text-white">{founder.name}</p>
                                <p className="text-sm text-white/80">{founder.role}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}
