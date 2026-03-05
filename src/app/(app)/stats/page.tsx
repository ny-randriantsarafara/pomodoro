import { getStats } from '@/actions/stats-actions';
import { Card, CardHeader } from '@/components/ui/card';
import { OverviewCards } from '@/components/stats/overview-cards';
import { FocusChart } from '@/components/stats/focus-chart';
import { ModeBreakdown } from '@/components/stats/mode-breakdown';
import { InsightsCards } from '@/components/stats/insights-cards';
import { ProjectLeaderboard } from '@/components/stats/project-leaderboard';

export default async function StatsPage() {
    const stats = await getStats();

    return (
        <div className="mx-auto flex max-w-6xl flex-col gap-8 p-6 lg:p-10">
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-normal text-[var(--text-primary)]">
                Stats
            </h1>

            <OverviewCards stats={stats} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card padding="lg">
                    <CardHeader>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Daily Focus (Last 30 Days)
                        </h2>
                    </CardHeader>
                    <FocusChart dailyFocus={stats.dailyFocus} />
                </Card>
                <Card padding="lg">
                    <CardHeader>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                            Focus Mode Distribution
                        </h2>
                    </CardHeader>
                    <ModeBreakdown
                        byMode={stats.byMode}
                        preferredMode={stats.preferredMode}
                    />
                </Card>
            </div>

            <InsightsCards stats={stats} />

            <div>
                <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                    Project Leaderboard
                </h2>
                <ProjectLeaderboard projectStats={stats.projectStats} />
            </div>
        </div>
    );
}
