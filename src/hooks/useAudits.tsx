import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Audit } from '@/types/audit';
import { useToast } from '@/hooks/use-toast';

export function useAudits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const auditsQuery = useQuery({
    queryKey: ['audits', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data.map(transformAudit);
    },
    enabled: !!user,
  });

  const createAuditMutation = useMutation({
    mutationFn: async (url: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('audits')
        .insert({
          user_id: user.id,
          url,
          status: 'pending',
        })
        .select()
        .single();
      
      if (error) throw error;
      return transformAudit(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast({ title: 'Audit created', description: 'Starting URL analysis...' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const updateAuditMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Audit> }) => {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.rawHtml) dbUpdates.raw_html = updates.rawHtml;
      if (updates.markdown) dbUpdates.markdown = updates.markdown;
      if (updates.metadata) dbUpdates.metadata = updates.metadata;
      if (updates.headings) dbUpdates.headings = updates.headings;
      if (updates.bodyContent) dbUpdates.body_content = updates.bodyContent;
      if (updates.ctas) dbUpdates.ctas = updates.ctas;
      if (updates.links) dbUpdates.links = updates.links;
      if (updates.media) dbUpdates.media = updates.media;
      if (updates.aiAnalysis) dbUpdates.ai_analysis = updates.aiAnalysis;
      if (updates.revampedContent) dbUpdates.revamped_content = updates.revampedContent;

      const { error } = await supabase
        .from('audits')
        .update(dbUpdates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
    },
  });

  const deleteAuditMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('audits').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audits'] });
      toast({ title: 'Audit deleted' });
    },
  });

  return {
    audits: auditsQuery.data ?? [],
    isLoading: auditsQuery.isLoading,
    createAudit: createAuditMutation.mutateAsync,
    updateAudit: updateAuditMutation.mutateAsync,
    deleteAudit: deleteAuditMutation.mutateAsync,
    isCreating: createAuditMutation.isPending,
  };
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
