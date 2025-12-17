import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MousePointer, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CTAsPanelProps {
  audit: Audit;
}

export function CTAsPanel({ audit }: CTAsPanelProps) {
  const { ctas } = audit;

  const buttonCTAs = ctas.filter(c => c.type === 'button');
  const linkCTAs = ctas.filter(c => c.type === 'link');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MousePointer className="h-5 w-5" />
            Call-to-Action Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total CTAs" value={ctas.length} />
            <StatCard label="Buttons" value={buttonCTAs.length} />
            <StatCard label="Action Links" value={linkCTAs.length} />
          </div>

          {/* CTAs Table */}
          {ctas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Text</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ctas.map((cta, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge variant={cta.type === 'button' ? 'default' : 'secondary'}>
                        {cta.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{cta.text}</TableCell>
                    <TableCell>
                      {cta.intent && (
                        <Badge variant="outline">{cta.intent}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-muted-foreground">
                      {cta.href || '-'}
                    </TableCell>
                    <TableCell>
                      {cta.href && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(cta.href, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No CTAs extracted yet. Run the crawl first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
