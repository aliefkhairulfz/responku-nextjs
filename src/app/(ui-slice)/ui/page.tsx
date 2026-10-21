import BrowseSurveyCard from "@/components/shared/browse-survey-card";
import WorkOnSurveyCard from "@/components/shared/work-on-survey-card";
import YourWalletBalanceCard from "@/components/shared/your-wallet-balance-card";
import DistributeQuestionnaireCard from "@/components/shared/distribute-questionnaire-card";
import BasicStatisticsCard from "@/components/shared/basic-statistics-card";
import MySurveysCard from "@/components/shared/my-surveys-card";

export default function UiPage() {
    return (
        <div className="flex flex-col space-y-4">
            <BrowseSurveyCard />
            <MySurveysCard />
            <YourWalletBalanceCard />
            <DistributeQuestionnaireCard />
            <WorkOnSurveyCard />
            <BasicStatisticsCard title="hello" statsNumber={4} footerTextContent="world" />
        </div>
    );
}
