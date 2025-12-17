import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { Search, Upload, Trash2, Loader2 } from 'lucide-react';

interface KeywordsPanelProps {
  auditId: string;
}

interface Keyword {
  id: string;
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  intent?: string;
  cluster?: string;
}

export function KeywordsPanel({ auditId }: KeywordsPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pasteInput, setPasteInput] = useState('');

  const { data: keywords = [], isLoading } = useQuery({
    queryKey: ['keywords', auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('keywords')
        .select('*')
        .eq('audit_id', auditId)
        .order('impressions', { ascending: false });
      
      if (error) throw error;
      return data as Keyword[];
    },
  });

  const importMutation = useMutation({
    mutationFn: async (input: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const lines = input.trim().split('\n');
      const parsedKeywords: Omit<Keyword, 'id'>[] = [];
      
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 1 && parts[0].trim()) {
          // Skip header row
          const firstCol = parts[0].trim().toLowerCase();
          if (firstCol === 'top queries' || firstCol === 'query' || firstCol === 'keyword') continue;
          
          // GSC Comparison format: Query | Last Clicks | Prev Clicks | Last Impressions | Prev Impressions | Last CTR | Prev CTR | Last Position | Prev Position
          // Or simple format: Keyword | Impressions | Clicks | Position
          if (parts.length >= 8) {
            // GSC comparison format - use "Last 3 months" values
            parsedKeywords.push({
              keyword: parts[0].trim(),
              clicks: parseInt(parts[1]?.replace(/,/g, '')) || 0,      // Last 3 months Clicks
              impressions: parseInt(parts[3]?.replace(/,/g, '')) || 0, // Last 3 months Impressions
              position: parseFloat(parts[7]?.replace(/,/g, '')) || 0,  // Last 3 months Position
            });
          } else if (parts.length >= 4) {
            // Simple format: Keyword | Impressions | Clicks | Position
            parsedKeywords.push({
              keyword: parts[0].trim(),
              impressions: parseInt(parts[1]?.replace(/,/g, '')) || 0,
              clicks: parseInt(parts[2]?.replace(/,/g, '')) || 0,
              position: parseFloat(parts[3]?.replace(/,/g, '')) || 0,
            });
          } else if (parts.length >= 1) {
            // Just keyword
            parsedKeywords.push({
              keyword: parts[0].trim(),
              impressions: 0,
              clicks: 0,
              position: 0,
            });
          }
        }
      }

      if (parsedKeywords.length === 0) throw new Error('No valid keywords found');

      const { error } = await supabase.from('keywords').insert(
        parsedKeywords.map(k => ({
          audit_id: auditId,
          user_id: user.id,
          keyword: k.keyword,
          impressions: k.impressions,
          clicks: k.clicks,
          position: k.position,
        }))
      );

      if (error) throw error;
      return parsedKeywords.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', auditId] });
      toast({ title: 'Keywords imported', description: `${count} keywords added.` });
      setPasteInput('');
    },
    onError: (error) => {
      toast({ title: 'Import failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('keywords').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', auditId] });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('keywords').delete().eq('audit_id', auditId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['keywords', auditId] });
      toast({ title: 'All keywords deleted' });
    },
  });

  const getIntentBadge = (intent?: string) => {
    if (!intent) return null;
    const colors: Record<string, string> = {
      informational: 'bg-blue-100 text-blue-800',
      commercial: 'bg-green-100 text-green-800',
      navigational: 'bg-purple-100 text-purple-800',
      transactional: 'bg-orange-100 text-orange-800',
    };
    return <Badge className={colors[intent] || ''}>{intent}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import GSC Keywords
          </CardTitle>
          <CardDescription>
            Paste keywords from Google Search Console. Supports both comparison format (Query | Last Clicks | Prev Clicks | Last Impressions | Prev Impressions | Last CTR | Prev CTR | Last Position | Prev Position) and simple format (Keyword | Impressions | Clicks | Position)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="keyword1&#9;1000&#9;50&#9;3.2&#10;keyword2&#9;500&#9;25&#9;5.1"
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            rows={6}
            className="font-mono text-sm mb-4"
          />
          <div className="flex gap-2">
            <Button 
              onClick={() => importMutation.mutate(pasteInput)}
              disabled={importMutation.isPending || !pasteInput.trim()}
            >
              {importMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Import Keywords
            </Button>
            {keywords.length > 0 && (
              <Button 
                variant="destructive"
                onClick={() => deleteAllMutation.mutate()}
                disabled={deleteAllMutation.isPending}
              >
                Clear All
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Keywords ({keywords.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : keywords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-right">Impressions</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Position</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Cluster</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((kw) => (
                  <TableRow key={kw.id}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{kw.position.toFixed(1)}</TableCell>
                    <TableCell>{getIntentBadge(kw.intent)}</TableCell>
                    <TableCell>
                      {kw.cluster && <Badge variant="outline">{kw.cluster}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(kw.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No keywords yet. Paste your GSC data above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
