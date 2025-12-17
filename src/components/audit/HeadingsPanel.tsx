import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Heading, AlertTriangle, CheckCircle } from 'lucide-react';

interface HeadingsPanelProps {
  audit: Audit;
}

export function HeadingsPanel({ audit }: HeadingsPanelProps) {
  const { headings } = audit;

  const h1Count = headings.filter(h => h.tag === 'H1').length;
  const hasMultipleH1 = h1Count > 1;
  const hasNoH1 = h1Count === 0;

  const getTagBadgeColor = (tag: string) => {
    switch (tag) {
      case 'H1': return 'bg-primary';
      case 'H2': return 'bg-blue-500';
      case 'H3': return 'bg-green-500';
      case 'H4': return 'bg-yellow-500';
      case 'H5': return 'bg-orange-500';
      case 'H6': return 'bg-red-500';
      default: return 'bg-muted';
    }
  };

  const getIntentBadge = (intent?: string) => {
    if (!intent) return null;
    const colors: Record<string, string> = {
      informational: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      navigational: 'bg-purple-100 text-purple-800',
    };
    return <Badge className={colors[intent] || ''}>{intent}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heading className="h-5 w-5" />
            Heading Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              {hasNoH1 || hasMultipleH1 ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm">
                {h1Count} H1 tag{h1Count !== 1 ? 's' : ''}
                {hasMultipleH1 && ' (should have exactly 1)'}
                {hasNoH1 && ' (missing H1)'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              Total: {headings.length} headings
            </div>
          </div>

          {/* Heading counts */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].map(tag => {
              const count = headings.filter(h => h.tag === tag).length;
              if (count === 0) return null;
              return (
                <Badge key={tag} className={getTagBadgeColor(tag)}>
                  {tag}: {count}
                </Badge>
              );
            })}
          </div>

          {/* Headings Table */}
          {headings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Tag</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead className="w-24">Intent</TableHead>
                  <TableHead className="w-24">Issues</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {headings.map((heading, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge className={getTagBadgeColor(heading.tag)}>{heading.tag}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{heading.text}</TableCell>
                    <TableCell>{getIntentBadge(heading.intent)}</TableCell>
                    <TableCell>
                      {heading.issues?.length > 0 ? (
                        <Badge variant="destructive">{heading.issues.length}</Badge>
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No headings extracted yet. Run the crawl first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
