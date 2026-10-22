import { Suspense, type ReactNode } from "react"
import { ResearchHeader } from "@/components/research/research-header"
import { WorkOnTimerStoreProvider } from "@/lib/stores/work-on-timer-store-provider"

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <WorkOnTimerStoreProvider>
            <div className="w-full overflow-hidden">
                <ResearchHeader />

                <Suspense>{children}</Suspense>
            </div>
        </WorkOnTimerStoreProvider>
    )
}
