'use client'

import DashboardMainColumnIndexPenelitiPage from '@/components/dashboard/main-column/index-peneliti-page'
import DashboardMainColumnIndexRespondendPage from '@/components/dashboard/main-column/index-responden-page'
import { useDashboardStore } from '@/lib/stores/dashboard-store-provider'

export default function Page() {
    const userMode = useDashboardStore((s) => s.userMode)

    return userMode === 'peneliti' ? (
        <DashboardMainColumnIndexPenelitiPage />
    ) : (
        <DashboardMainColumnIndexRespondendPage />
    )
}
