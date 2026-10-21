"use client";

import DashboardMainColumnIndexResearcherPage from "@/components/dashboard/main-column/index-researcher-page";
import DashboardMainColumnIndexRespondentPage from "@/components/dashboard/main-column/index-respondent-page";
import { useDashboardStore } from "@/lib/stores/dashboard-store-provider";

export default function Page() {
    const userMode = useDashboardStore((s) => s.userMode);

    return userMode === "peneliti" ? <DashboardMainColumnIndexResearcherPage /> : <DashboardMainColumnIndexRespondentPage />;
}
