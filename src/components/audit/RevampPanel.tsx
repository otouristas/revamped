import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { RefreshCw, ChevronDown, ArrowRight, Copy, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RevampPanelProps {
  audit: Audit;
}

export function RevampPanel({ audit }: RevampPanelProps) {
  const { revampedContent } = audit;
  const { toast } = useToast();

  const hasRevamp = revampedContent?.length > 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      {!hasRevamp ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Content Revamp Yet</h3>
            <p className="text-muted-foreground">
              Run AI Analysis to generate content recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Content Revamp Suggestions ({revampedContent.length} sections)
              </CardTitle>
            </CardHeader>
          </Card>

          {revampedContent.map((section, index) => (
            <RevampSection key={index} section={section} index={index} onCopy={copyToClipboard} />
          ))}
        </div>
      )}
    </div>
  );
}

interface RevampSectionProps {
  section: {
    sectionType: string;
    original: string;
    recommended: string;
    reasoning: string;
    keywords: string[];
    aiOverviewScore: string;
    citationPotential: string;
  };
  index: number;
  onCopy: (text: string) => void;
}

function RevampSection({ section, index, onCopy }: RevampSectionProps) {
  const [isOpen, setIsOpen] = useState(index === 0);

  const getScoreBadge = (score: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    };
    return <Badge className={colors[score] || 'bg-muted'}>{score}</Badge>;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline">{section.sectionType}</Badge>
                <span className="text-muted-foreground font-normal">Section {index + 1}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">AI:</span>
                  {getScoreBadge(section.aiOverviewScore)}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Citation:</span>
                  {getScoreBadge(section.citationPotential)}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Keywords */}
            {section.keywords?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Target Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {section.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Original vs Recommended */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-500">Original</span>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg text-sm">
                  {section.original}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-500">Recommended</span>
                  <Button variant="ghost" size="sm" onClick={() => onCopy(section.recommended)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-sm">
                  {section.recommended}
                </div>
              </div>
            </div>

            {/* Reasoning */}
            {section.reasoning && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">Why this change?</div>
                <p className="text-sm text-muted-foreground">{section.reasoning}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
