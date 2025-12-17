import { Audit } from '@/types/audit';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  ExternalLink, 
  RefreshCw, 
  Brain, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';

interface AuditHeaderProps {
  audit: Audit;
  onRefresh: () => void;
  onAnalyze: () => void;
  isProcessing: boolean;
}

export function AuditHeader({ audit, onRefresh, onAnalyze, isProcessing }: AuditHeaderProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'crawling':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Crawling</Badge>;
      case 'analyzing':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Analyzing</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getOverallScore = () => audit.aiAnalysis?.overallScore ?? 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-xl font-bold truncate max-w-2xl">{audit.url}</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(audit.url, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(audit.status)}
              {audit.status === 'completed' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Score:</span>
                  <Progress value={getOverallScore()} className="w-24 h-2" />
                  <span className="text-sm font-medium">{getOverallScore()}/100</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={isProcessing || audit.status === 'crawling'}
            >
              {audit.status === 'crawling' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Re-crawl
            </Button>
            <Button
              size="sm"
              onClick={onAnalyze}
              disabled={isProcessing || audit.status === 'crawling' || audit.status === 'analyzing' || !audit.markdown}
            >
              {audit.status === 'analyzing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              AI Analyze
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        {audit.status === 'completed' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-6 pt-6 border-t border-border">
            <StatItem label="Headings" value={audit.headings?.length ?? 0} />
            <StatItem label="Body Blocks" value={audit.bodyContent?.length ?? 0} />
            <StatItem label="Links" value={audit.links?.length ?? 0} />
            <StatItem label="CTAs" value={audit.ctas?.length ?? 0} />
            <StatItem 
              label="AI Overview" 
              value={audit.aiAnalysis?.aiOverviewEligibility ?? 'N/A'} 
              badge 
            />
            <StatItem 
              label="Citation" 
              value={audit.aiAnalysis?.citationPotential ?? 'N/A'} 
              badge 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value, badge }: { label: string; value: string | number; badge?: boolean }) {
  const getBadgeColor = (val: string) => {
    if (val === 'high') return 'bg-green-500';
    if (val === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="text-center">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      {badge && typeof value === 'string' ? (
        <Badge className={getBadgeColor(value)}>{value}</Badge>
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </div>
  );
}
