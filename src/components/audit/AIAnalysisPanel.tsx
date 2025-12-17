import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, AlertTriangle, Lightbulb, CheckCircle, TrendingUp } from 'lucide-react';

interface AIAnalysisPanelProps {
  audit: Audit;
}

export function AIAnalysisPanel({ audit }: AIAnalysisPanelProps) {
  const { aiAnalysis } = audit;

  const getScoreBadge = (score: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
      fresh: 'bg-green-500',
      moderate: 'bg-yellow-500',
      stale: 'bg-red-500',
    };
    return <Badge className={colors[score] || 'bg-muted'}>{score}</Badge>;
  };

  const hasAnalysis = aiAnalysis?.overallScore > 0;

  return (
    <div className="space-y-6">
      {!hasAnalysis ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No AI Analysis Yet</h3>
            <p className="text-muted-foreground">
              Click "AI Analyze" in the header to run the content analysis.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overall Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overall Content Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-6">
                <div className="text-5xl font-bold">{aiAnalysis.overallScore}</div>
                <div className="flex-1">
                  <Progress value={aiAnalysis.overallScore} className="h-4" />
                </div>
                <div className="text-xl text-muted-foreground">/100</div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <MetricCard
                  label="AI Overview Eligibility"
                  value={aiAnalysis.aiOverviewEligibility}
                  badge={getScoreBadge(aiAnalysis.aiOverviewEligibility)}
                />
                <MetricCard
                  label="Citation Potential"
                  value={aiAnalysis.citationPotential}
                  badge={getScoreBadge(aiAnalysis.citationPotential)}
                />
                <MetricCard
                  label="Content Freshness"
                  value={aiAnalysis.contentFreshness}
                  badge={getScoreBadge(aiAnalysis.contentFreshness)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Issues Found ({aiAnalysis.issues?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis.issues?.length > 0 ? (
                <ul className="space-y-3">
                  {aiAnalysis.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>No major issues found!</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Recommendations ({aiAnalysis.recommendations?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiAnalysis.recommendations?.length > 0 ? (
                <ul className="space-y-3">
                  {aiAnalysis.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-3 p-3 bg-primary/5 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">No recommendations available.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, badge }: { label: string; value: string; badge: React.ReactNode }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="text-sm text-muted-foreground mb-2">{label}</div>
      {badge}
    </div>
  );
}
