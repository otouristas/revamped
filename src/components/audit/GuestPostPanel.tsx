import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Audit, GuestPost } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileEdit, Loader2, Plus, Copy, Trash2 } from 'lucide-react';

interface GuestPostPanelProps {
  audit: Audit;
}

export function GuestPostPanel({ audit }: GuestPostPanelProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [targetUrl, setTargetUrl] = useState('');
  const [anchorText, setAnchorText] = useState('');
  const [anchorType, setAnchorType] = useState('branded');
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');

  const { data: guestPosts = [], isLoading } = useQuery({
    queryKey: ['guest-posts', audit.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guest_posts')
        .select('*')
        .eq('audit_id', audit.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformGuestPost);
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.functions.invoke('generate-guest-post', {
        body: {
          auditId: audit.id,
          targetUrl,
          anchorText,
          anchorType,
          riskLevel,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-posts', audit.id] });
      toast({ title: 'Guest post generated', description: '500-700 word article ready.' });
      setTargetUrl('');
      setAnchorText('');
    },
    onError: (error) => {
      toast({ title: 'Generation failed', description: error.message, variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guest_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-posts', audit.id] });
      toast({ title: 'Guest post deleted' });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  return (
    <div className="space-y-6">
      {/* Generate Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" />
            Generate Guest Post
          </CardTitle>
          <CardDescription>
            Create a 500-700 word editorial article with strategic backlinks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetUrl">Target URL (for backlink)</Label>
              <Input
                id="targetUrl"
                placeholder="https://yoursite.com/page"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="anchorText">Anchor Text</Label>
              <Input
                id="anchorText"
                placeholder="your brand name"
                value={anchorText}
                onChange={(e) => setAnchorText(e.target.value)}
              />
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="anchorType">Anchor Type</Label>
              <Select value={anchorType} onValueChange={setAnchorType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="branded">Branded</SelectItem>
                  <SelectItem value="conceptual">Conceptual</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                  <SelectItem value="partial-match">Partial Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="riskLevel">Risk Level</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as typeof riskLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending || !audit.markdown}
          >
            {generateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Generate Guest Post
          </Button>
          {!audit.markdown && (
            <p className="text-sm text-muted-foreground">
              Run the URL crawl first to enable guest post generation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Guest Posts List */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Guest Posts ({guestPosts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : guestPosts.length > 0 ? (
            <div className="space-y-6">
              {guestPosts.map((post) => (
                <GuestPostCard 
                  key={post.id} 
                  post={post} 
                  onCopy={copyToClipboard}
                  onDelete={() => deleteMutation.mutate(post.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No guest posts yet. Generate one above.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GuestPostCard({ 
  post, 
  onCopy, 
  onDelete 
}: { 
  post: GuestPost; 
  onCopy: (text: string) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium">{post.title}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{post.wordCount} words</Badge>
            <Badge variant="secondary">{post.editorialAngle}</Badge>
            <Badge variant={post.riskLevel === 'conservative' ? 'default' : post.riskLevel === 'balanced' ? 'secondary' : 'destructive'}>
              {post.riskLevel}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => onCopy(post.content)}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Scores */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <ScoreBar label="Editorial Risk" value={100 - post.editorialRiskScore} />
        <ScoreBar label="Spam Safety" value={100 - post.spamLikelihoodScore} />
        <ScoreBar label="Acceptance" value={post.acceptanceProbability} />
      </div>

      {/* Content Preview */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <p className={`text-sm whitespace-pre-wrap ${expanded ? '' : 'line-clamp-4'}`}>
          {post.content}
        </p>
        <Button variant="link" size="sm" onClick={() => setExpanded(!expanded)} className="mt-2 p-0">
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium">{value}%</span>
      </div>
      <Progress value={value} className="h-2" />
    </div>
  );
}

function transformGuestPost(data: Record<string, unknown>): GuestPost {
  return {
    id: data.id as string,
    auditId: data.audit_id as string,
    title: data.title as string,
    content: data.content as string,
    wordCount: data.word_count as number,
    editorialAngle: data.editorial_angle as string,
    targetUrls: (data.target_urls as GuestPost['targetUrls']) ?? [],
    riskLevel: data.risk_level as GuestPost['riskLevel'],
    editorialRiskScore: data.editorial_risk_score as number,
    spamLikelihoodScore: data.spam_likelihood_score as number,
    acceptanceProbability: data.acceptance_probability as number,
  };
}
