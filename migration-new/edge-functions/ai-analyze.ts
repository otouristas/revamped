// Edge Function: ai-analyze
// Path: supabase/functions/ai-analyze/index.ts
// Purpose: AI content analysis for SEO and AI Overview optimization

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { auditId } = await req.json();
    console.log('Analyzing audit:', auditId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get audit data
    const { data: audit, error: fetchError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', auditId)
      .single();

    if (fetchError || !audit) {
      throw new Error('Audit not found');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare content for analysis
    const contentSummary = `
URL: ${audit.url}
Title: ${audit.metadata?.title || 'N/A'}
Description: ${audit.metadata?.description || 'N/A'}
Headings: ${JSON.stringify(audit.headings?.slice(0, 10) || [])}
Content Preview: ${audit.markdown?.substring(0, 3000) || 'N/A'}
Links Count: ${audit.links?.length || 0}
CTAs Count: ${audit.ctas?.length || 0}
    `.trim();

    // Call Lovable AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert SEO analyst specializing in AI Overview optimization and LLM citation readiness. Analyze content for 2026 SEO best practices. Return JSON only.`
          },
          {
            role: 'user',
            content: `Analyze this page content and return a JSON object with:
{
  "overallScore": number 0-100,
  "aiOverviewEligibility": "high" | "medium" | "low",
  "citationPotential": "high" | "medium" | "low", 
  "contentFreshness": "fresh" | "moderate" | "stale",
  "issues": ["issue1", "issue2"],
  "recommendations": ["rec1", "rec2"],
  "revampedContent": [
    {
      "sectionType": "H1" | "H2" | "Paragraph",
      "original": "original text",
      "recommended": "improved text optimized for AI overviews",
      "reasoning": "why this change helps",
      "keywords": ["keyword1"],
      "aiOverviewScore": "high" | "medium" | "low",
      "citationPotential": "high" | "medium" | "low"
    }
  ]
}

Content to analyze:
${contentSummary}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error('AI analysis failed');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      analysis = {
        overallScore: 50,
        aiOverviewEligibility: 'medium',
        citationPotential: 'medium',
        contentFreshness: 'moderate',
        issues: ['Analysis parsing failed'],
        recommendations: ['Re-run analysis'],
        revampedContent: []
      };
    }

    // Update audit with analysis
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        ai_analysis: {
          overallScore: analysis.overallScore || 50,
          aiOverviewEligibility: analysis.aiOverviewEligibility || 'medium',
          citationPotential: analysis.citationPotential || 'medium',
          contentFreshness: analysis.contentFreshness || 'moderate',
          issues: analysis.issues || [],
          recommendations: analysis.recommendations || [],
        },
        revamped_content: analysis.revampedContent || [],
      })
      .eq('id', auditId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
