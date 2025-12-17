import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Audit } from '@/types/audit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Zap, LogOut, RefreshCw } from 'lucide-react';

import { AuditHeader } from '@/components/audit/AuditHeader';
import { MetadataPanel } from '@/components/audit/MetadataPanel';
import { HeadingsPanel } from '@/components/audit/HeadingsPanel';
import { BodyPanel } from '@/components/audit/BodyPanel';
import { LinksPanel } from '@/components/audit/LinksPanel';
import { CTAsPanel } from '@/components/audit/CTAsPanel';
import { KeywordsPanel } from '@/components/audit/KeywordsPanel';
import { AIAnalysisPanel } from '@/components/audit/AIAnalysisPanel';
import { RevampPanel } from '@/components/audit/RevampPanel';
import { GuestPostPanel } from '@/components/audit/GuestPostPanel';
import { ExportPanel } from '@/components/audit/ExportPanel';

export default function AuditDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: audit, isLoading } = useQuery({
    queryKey: ['audit', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return transformAudit(data);
    },
    enabled: !!id,
    refetchInterval: (query) => {
      const data = query.state.data as Audit | null;
      if (data?.status === 'crawling' || data?.status === 'analyzing') {
        return 3000;
      }
      return false;
    },
  });

  const startCrawl = async () => {
    if (!audit) return;
    setIsProcessing(true);
    
    try {
      // Update status to crawling
      await supabase.from('audits').update({ status: 'crawling' }).eq('id', audit.id);
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
      
      // Call Firecrawl edge function
      const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
        body: { url: audit.url, auditId: audit.id },
      });

      if (error) throw error;
      
      toast({ title: 'Crawl complete', description: 'Content extracted successfully.' });
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
    } catch (error) {
      console.error('Crawl error:', error);
      toast({ title: 'Crawl failed', description: String(error), variant: 'destructive' });
      await supabase.from('audits').update({ status: 'failed' }).eq('id', audit.id);
    } finally {
      setIsProcessing(false);
    }
  };

  const startAnalysis = async () => {
    if (!audit) return;
    setIsProcessing(true);
    
    try {
      await supabase.from('audits').update({ status: 'analyzing' }).eq('id', audit.id);
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
      
      const { data, error } = await supabase.functions.invoke('ai-analyze', {
        body: { auditId: audit.id },
      });

      if (error) throw error;
      
      toast({ title: 'Analysis complete', description: 'AI recommendations ready.' });
      queryClient.invalidateQueries({ queryKey: ['audit', id] });
    } catch (error) {
      console.error('Analysis error:', error);
      toast({ title: 'Analysis failed', description: String(error), variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (audit?.status === 'pending') {
      startCrawl();
    }
  }, [audit?.id, audit?.status]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Skeleton className="h-12 w-64 mb-8" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Audit not found</h1>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="font-bold">SEO Intelligence</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <AuditHeader 
          audit={audit} 
          onRefresh={startCrawl}
          onAnalyze={startAnalysis}
          isProcessing={isProcessing}
        />

        <Tabs defaultValue="metadata" className="mt-6">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            <TabsTrigger value="metadata">Metadata</TabsTrigger>
            <TabsTrigger value="headings">Headings</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="ctas">CTAs</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="revamp">Revamp</TabsTrigger>
            <TabsTrigger value="guestpost">Guest Post</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="metadata">
            <MetadataPanel audit={audit} />
          </TabsContent>
          <TabsContent value="headings">
            <HeadingsPanel audit={audit} />
          </TabsContent>
          <TabsContent value="body">
            <BodyPanel audit={audit} />
          </TabsContent>
          <TabsContent value="links">
            <LinksPanel audit={audit} />
          </TabsContent>
          <TabsContent value="ctas">
            <CTAsPanel audit={audit} />
          </TabsContent>
          <TabsContent value="keywords">
            <KeywordsPanel auditId={audit.id} headings={audit.headings} />
          </TabsContent>
          <TabsContent value="analysis">
            <AIAnalysisPanel audit={audit} />
          </TabsContent>
          <TabsContent value="revamp">
            <RevampPanel audit={audit} />
          </TabsContent>
          <TabsContent value="guestpost">
            <GuestPostPanel audit={audit} />
          </TabsContent>
          <TabsContent value="export">
            <ExportPanel audit={audit} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function transformAudit(data: Record<string, unknown>): Audit {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    url: data.url as string,
    status: data.status as Audit['status'],
    rawHtml: data.raw_html as string | undefined,
    markdown: data.markdown as string | undefined,
    metadata: (data.metadata as Audit['metadata']) ?? {},
    headings: (data.headings as Audit['headings']) ?? [],
    bodyContent: (data.body_content as Audit['bodyContent']) ?? [],
    ctas: (data.ctas as Audit['ctas']) ?? [],
    links: (data.links as Audit['links']) ?? [],
    media: (data.media as Audit['media']) ?? [],
    aiAnalysis: (data.ai_analysis as Audit['aiAnalysis']) ?? { overallScore: 0, aiOverviewEligibility: 'low', citationPotential: 'low', contentFreshness: 'stale', issues: [], recommendations: [] },
    revampedContent: (data.revamped_content as Audit['revampedContent']) ?? [],
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
