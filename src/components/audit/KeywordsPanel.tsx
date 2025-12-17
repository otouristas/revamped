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
import { Search, Upload, Trash2, Loader2, TrendingUp, TrendingDown, Minus, Sparkles } from 'lucide-react';

interface KeywordsPanelProps {
  auditId: string;
}

interface Keyword {
  id: string;
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
  ctr: number;
  prev_ctr: number;
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
      const parsedKeywords: Omit<Keyword, 'id' | 'intent' | 'cluster'>[] = [];
      
      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length >= 1 && parts[0].trim()) {
          // Skip header row
          const firstCol = parts[0].trim().toLowerCase();
          if (firstCol === 'top queries' || firstCol === 'query' || firstCol === 'keyword') continue;
          
          // GSC Comparison format: Query | Last Clicks | Prev Clicks | Last Impressions | Prev Impressions | Last CTR | Prev CTR | Last Position | Prev Position
          if (parts.length >= 8) {
            const parseCtr = (val: string) => {
              const cleaned = val?.replace(/[%,]/g, '').trim();
              return parseFloat(cleaned) || 0;
            };
            
            parsedKeywords.push({
              keyword: parts[0].trim(),
              clicks: parseInt(parts[1]?.replace(/,/g, '')) || 0,
              prev_clicks: parseInt(parts[2]?.replace(/,/g, '')) || 0,
              impressions: parseInt(parts[3]?.replace(/,/g, '')) || 0,
              prev_impressions: parseInt(parts[4]?.replace(/,/g, '')) || 0,
              ctr: parseCtr(parts[5]),
              prev_ctr: parseCtr(parts[6]),
              position: parseFloat(parts[7]?.replace(/,/g, '')) || 0,
              prev_position: parseFloat(parts[8]?.replace(/,/g, '')) || 0,
            });
          } else if (parts.length >= 4) {
            // Simple format: Keyword | Impressions | Clicks | Position
            parsedKeywords.push({
              keyword: parts[0].trim(),
              impressions: parseInt(parts[1]?.replace(/,/g, '')) || 0,
              clicks: parseInt(parts[2]?.replace(/,/g, '')) || 0,
              position: parseFloat(parts[3]?.replace(/,/g, '')) || 0,
              prev_impressions: 0,
              prev_clicks: 0,
              prev_position: 0,
              ctr: 0,
              prev_ctr: 0,
            });
          } else if (parts.length >= 1) {
            // Just keyword
            parsedKeywords.push({
              keyword: parts[0].trim(),
              impressions: 0,
              clicks: 0,
              position: 0,
              prev_impressions: 0,
              prev_clicks: 0,
              prev_position: 0,
              ctr: 0,
              prev_ctr: 0,
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
          prev_impressions: k.prev_impressions,
          prev_clicks: k.prev_clicks,
          prev_position: k.prev_position,
          ctr: k.ctr,
          prev_ctr: k.prev_ctr,
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

  const classifyMutation = useMutation({
    mutationFn: async () => {
      if (keywords.length === 0) throw new Error('No keywords to classify');
      
      const keywordsToClassify = keywords.filter(k => !k.intent).slice(0, 50); // Batch of 50
      if (keywordsToClassify.length === 0) throw new Error('All keywords already classified');
      
      const { data, error } = await supabase.functions.invoke('classify-keywords', {
        body: { 
          keywords: keywordsToClassify.map(k => ({
            id: k.id,
            keyword: k.keyword,
            position: k.position,
            clicks: k.clicks,
            impressions: k.impressions,
          })),
          auditId 
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['keywords', auditId] });
      toast({ 
        title: 'Keywords classified', 
        description: `${data.updatedCount} keywords classified with intent.` 
      });
    },
    onError: (error) => {
      toast({ title: 'Classification failed', description: error.message, variant: 'destructive' });
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

  const getTrendIcon = (current: number, previous: number, inverse = false) => {
    if (!previous || previous === 0) return <Minus className="h-3 w-3 text-muted-foreground" />;
    const diff = current - previous;
    const isPositive = inverse ? diff < 0 : diff > 0;
    const isNegative = inverse ? diff > 0 : diff < 0;
    
    if (isPositive) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (isNegative) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const formatChange = (current: number, previous: number, inverse = false) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const percent = ((diff / previous) * 100).toFixed(0);
    const isPositive = inverse ? diff < 0 : diff > 0;
    const isNegative = inverse ? diff > 0 : diff < 0;
    
    return (
      <span className={`text-xs ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground'}`}>
        {diff > 0 ? '+' : ''}{percent}%
      </span>
    );
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
            Paste keywords from Google Search Console with comparison data (Last 3 months vs Previous 3 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Paste GSC export with comparison columns..."
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Keywords ({keywords.length})
            </CardTitle>
            {keywords.length > 0 && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => classifyMutation.mutate()}
                disabled={classifyMutation.isPending || keywords.every(k => k.intent)}
              >
                {classifyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Classify Intent
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : keywords.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                    <TableHead className="text-right">Impressions</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                    <TableHead className="text-right">CTR</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                    <TableHead className="text-right">Position</TableHead>
                    <TableHead className="text-right">Δ</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.map((kw) => (
                    <TableRow key={kw.id}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={kw.keyword}>
                        {kw.keyword}
                      </TableCell>
                      <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(kw.clicks, kw.prev_clicks)}
                          {formatChange(kw.clicks, kw.prev_clicks)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(kw.impressions, kw.prev_impressions)}
                          {formatChange(kw.impressions, kw.prev_impressions)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{kw.ctr?.toFixed(2)}%</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(kw.ctr, kw.prev_ctr)}
                          {formatChange(kw.ctr, kw.prev_ctr)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{kw.position?.toFixed(1)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {getTrendIcon(kw.position, kw.prev_position, true)}
                          {formatChange(kw.position, kw.prev_position, true)}
                        </div>
                      </TableCell>
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
            </div>
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
