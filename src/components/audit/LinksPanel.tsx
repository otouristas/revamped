import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink, Home, ShoppingCart } from 'lucide-react';

interface LinksPanelProps {
  audit: Audit;
}

export function LinksPanel({ audit }: LinksPanelProps) {
  const { links } = audit;

  const internalLinks = links.filter(l => l.type === 'internal');
  const externalLinks = links.filter(l => l.type === 'external');
  const commercialLinks = links.filter(l => l.type === 'commercial');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'internal': return <Home className="h-4 w-4" />;
      case 'external': return <ExternalLink className="h-4 w-4" />;
      case 'commercial': return <ShoppingCart className="h-4 w-4" />;
      default: return <Link2 className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      internal: 'bg-blue-500',
      external: 'bg-green-500',
      commercial: 'bg-purple-500',
    };
    return <Badge className={colors[type] || 'bg-muted'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Links" value={links.length} icon={<Link2 className="h-5 w-5" />} />
            <StatCard label="Internal" value={internalLinks.length} icon={<Home className="h-5 w-5" />} color="blue" />
            <StatCard label="External" value={externalLinks.length} icon={<ExternalLink className="h-5 w-5" />} color="green" />
            <StatCard label="Commercial" value={commercialLinks.length} icon={<ShoppingCart className="h-5 w-5" />} color="purple" />
          </div>

          {/* Links Table */}
          {links.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Anchor Text</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-20">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {links.map((link, index) => (
                  <TableRow key={index}>
                    <TableCell>{getTypeBadge(link.type)}</TableCell>
                    <TableCell className="font-medium max-w-[200px] truncate">
                      {link.text || <span className="text-muted-foreground italic">No anchor</span>}
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-muted-foreground">
                      {link.href}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(link.href, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No links extracted yet. Run the crawl first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-500',
    green: 'text-green-500',
    purple: 'text-purple-500',
  };

  return (
    <div className="bg-muted/50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={colorClasses[color ?? ''] || 'text-muted-foreground'}>{icon}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
