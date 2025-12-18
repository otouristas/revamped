// Edge Function: generate-guest-post
// Path: supabase/functions/generate-guest-post/index.ts
// Purpose: Generate publisher-ready guest posts with natural backlink placement

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
    const { auditId, targetUrl, anchorText, anchorType, riskLevel } = await req.json();
    console.log('Generating guest post for audit:', auditId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

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

    const contentSummary = audit.markdown?.substring(0, 4000) || '';
    const topic = audit.metadata?.title || audit.url;

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
            content: `You are an expert content writer creating guest posts for high-authority publishers. Write educational, non-promotional content with natural backlink placement. Risk level: ${riskLevel}.`
          },
          {
            role: 'user',
            content: `Create a 500-700 word guest post based on this topic: "${topic}"

Requirements:
- Educational, non-commercial tone
- Neutral authority voice
- Include 1-2 natural contextual backlinks to: ${targetUrl}
- Anchor text style: ${anchorType} (use: "${anchorText}")
- NO obvious SEO manipulation
- Publisher-safe structure

Source content for context:
${contentSummary}

Return JSON:
{
  "title": "article title",
  "content": "full article with natural link placement marked as [LINK: anchor text](url)",
  "editorialAngle": "trend/problem-solution/expert-insight/educational",
  "wordCount": number,
  "editorialRiskScore": 0-100 (lower is safer),
  "spamLikelihoodScore": 0-100 (lower is better),
  "acceptanceProbability": 0-100
}`
          }
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('AI generation failed');
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    let guestPost;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        guestPost = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found');
      }
    } catch (e) {
      throw new Error('Failed to parse guest post');
    }

    // Process content to replace link markers with actual text
    const processedContent = guestPost.content
      .replace(/\[LINK: ([^\]]+)\]\(([^)]+)\)/g, '$1')
      .trim();

    // Save to database
    const { error: insertError } = await supabase
      .from('guest_posts')
      .insert({
        audit_id: auditId,
        user_id: audit.user_id,
        title: guestPost.title,
        content: processedContent,
        word_count: guestPost.wordCount || processedContent.split(/\s+/).length,
        editorial_angle: guestPost.editorialAngle,
        target_urls: [{ url: targetUrl, anchor: anchorText, anchorType }],
        risk_level: riskLevel,
        editorial_risk_score: guestPost.editorialRiskScore || 30,
        spam_likelihood_score: guestPost.spamLikelihoodScore || 20,
        acceptance_probability: guestPost.acceptanceProbability || 70,
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true }), {
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
