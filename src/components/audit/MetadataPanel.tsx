import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, CheckCircle } from 'lucide-react';

interface MetadataPanelProps {
  audit: Audit;
}

export function MetadataPanel({ audit }: MetadataPanelProps) {
  const { metadata } = audit;
  
  const getCharCount = (text?: string) => text?.length ?? 0;
  
  const getTitleStatus = () => {
    const len = getCharCount(metadata.title);
    if (len === 0) return { status: 'error', message: 'Missing' };
    if (len < 30) return { status: 'warning', message: 'Too short' };
    if (len > 60) return { status: 'warning', message: 'Too long' };
    return { status: 'success', message: 'Good' };
  };

  const getDescStatus = () => {
    const len = getCharCount(metadata.description);
    if (len === 0) return { status: 'error', message: 'Missing' };
    if (len < 120) return { status: 'warning', message: 'Too short' };
    if (len > 160) return { status: 'warning', message: 'Too long' };
    return { status: 'success', message: 'Good' };
  };

  const titleStatus = getTitleStatus();
  const descStatus = getDescStatus();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meta Tags Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <MetaRow
            label="Meta Title"
            value={metadata.title || 'Not found'}
            charCount={getCharCount(metadata.title)}
            maxChars={60}
            status={titleStatus.status as 'success' | 'warning' | 'error'}
            statusMessage={titleStatus.message}
          />

          {/* Description */}
          <MetaRow
            label="Meta Description"
            value={metadata.description || 'Not found'}
            charCount={getCharCount(metadata.description)}
            maxChars={160}
            status={descStatus.status as 'success' | 'warning' | 'error'}
            statusMessage={descStatus.message}
          />

          {/* Canonical */}
          <MetaRow
            label="Canonical URL"
            value={metadata.canonical || 'Not found'}
            status={metadata.canonical ? 'success' : 'warning'}
            statusMessage={metadata.canonical ? 'Set' : 'Missing'}
          />

          {/* OG Tags */}
          <div className="grid md:grid-cols-2 gap-4">
            <MetaRow
              label="OG Title"
              value={metadata.ogTitle || 'Not found'}
              compact
            />
            <MetaRow
              label="OG Description"
              value={metadata.ogDescription || 'Not found'}
              compact
            />
          </div>

          {/* Robots */}
          <MetaRow
            label="Robots"
            value={metadata.robots || 'Not specified'}
            status={metadata.robots?.includes('noindex') ? 'warning' : 'success'}
            statusMessage={metadata.robots?.includes('noindex') ? 'Noindex detected' : 'Indexable'}
          />

          {/* Language */}
          <MetaRow
            label="Language"
            value={metadata.language || 'Not specified'}
          />
        </CardContent>
      </Card>
    </div>
  );
}

interface MetaRowProps {
  label: string;
  value: string;
  charCount?: number;
  maxChars?: number;
  status?: 'success' | 'warning' | 'error';
  statusMessage?: string;
  compact?: boolean;
}

function MetaRow({ label, value, charCount, maxChars, status, statusMessage, compact }: MetaRowProps) {
  const getStatusIcon = () => {
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    if (status === 'error') return <AlertTriangle className="h-4 w-4 text-red-500" />;
    return null;
  };

  const getStatusBadge = () => {
    if (!status || !statusMessage) return null;
    const variant = status === 'success' ? 'default' : status === 'warning' ? 'secondary' : 'destructive';
    return <Badge variant={variant}>{statusMessage}</Badge>;
  };

  return (
    <div className={compact ? '' : 'border-b border-border pb-4 last:border-0 last:pb-0'}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{label}</span>
          {getStatusIcon()}
        </div>
        <div className="flex items-center gap-2">
          {charCount !== undefined && maxChars && (
            <span className={`text-xs ${charCount > maxChars ? 'text-destructive' : 'text-muted-foreground'}`}>
              {charCount}/{maxChars} chars
            </span>
          )}
          {getStatusBadge()}
        </div>
      </div>
      <p className={`text-sm ${value === 'Not found' || value === 'Not specified' ? 'text-muted-foreground italic' : ''}`}>
        {value}
      </p>
    </div>
  );
}
