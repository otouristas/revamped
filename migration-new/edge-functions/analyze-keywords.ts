// Edge Function: analyze-keywords
// Path: supabase/functions/analyze-keywords/index.ts
// Purpose: Keyword clustering and content block mapping

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface KeywordData {
  id: string;
  keyword: string;
  position: number;
  clicks: number;
  impressions: number;
  intent?: string;
}

interface HeadingData {
  tag: string;
  text: string;
  position: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, headings, auditId } = await req.json() as { 
      keywords: KeywordData[], 
      headings: HeadingData[],
      auditId: string 
    };
    
    if (!keywords || keywords.length === 0) {
      return new Response(JSON.stringify({ error: 'No keywords provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt
    const keywordList = keywords.map((k, i) => 
      `${i + 1}. "${k.keyword}" (pos: ${k.position?.toFixed(1) || 'N/A'}, clicks: ${k.clicks}, impressions: ${k.impressions}${k.intent ? `, intent: ${k.intent}` : ''})`
    ).join('\n');

    const headingList = headings.length > 0 
      ? headings.map((h, i) => `${i + 1}. [${h.tag.toUpperCase()}] "${h.text}"`).join('\n')
      : 'No headings available';

    const prompt = `Analyze these keywords and perform TWO tasks:

**TASK 1: CLUSTERING**
Group semantically similar keywords into clusters. Each cluster should have a short descriptive name (2-4 words).
Consider search intent, topic similarity, and user goals when clustering.

**TASK 2: CONTENT MAPPING**
For each keyword, suggest which heading it should be targeted under. Match based on topical relevance.
If no heading is a good match, use "New Section Needed".

**KEYWORDS:**
${keywordList}

**PAGE HEADINGS:**
${headingList}

**RESPOND WITH VALID JSON ONLY:**
{
  "clusters": {
    "Cluster Name": ["keyword1", "keyword2"],
    "Another Cluster": ["keyword3", "keyword4"]
  },
  "mappings": [
    {"keyword": "keyword1", "mappedTo": "Exact heading text or New Section Needed", "intent": "informational|commercial|navigational|transactional"}
  ]
}

Rules:
- Every keyword must appear in exactly one cluster
- Every keyword must have a mapping
- Use exact keyword text as provided
- Intent should be: informational, commercial, navigational, or transactional
- Cluster names should be concise and descriptive`;

    console.log(`Analyzing ${keywords.length} keywords with ${headings.length} headings...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an SEO expert analyzing keywords for content optimization. Always respond with valid JSON only, no markdown or extra text." },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log("AI response:", content.substring(0, 500));

    // Parse the JSON response
    let analysis: { 
      clusters: Record<string, string[]>; 
      mappings: { keyword: string; mappedTo: string; intent: string }[] 
    };
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse analysis results");
    }

    // Build cluster lookup
    const keywordToCluster: Record<string, string> = {};
    for (const [clusterName, clusterKeywords] of Object.entries(analysis.clusters || {})) {
      for (const kw of clusterKeywords) {
        keywordToCluster[kw.toLowerCase()] = clusterName;
      }
    }

    // Build mapping lookup
    const keywordToMapping: Record<string, { mappedTo: string; intent: string }> = {};
    for (const mapping of analysis.mappings || []) {
      keywordToMapping[mapping.keyword.toLowerCase()] = {
        mappedTo: mapping.mappedTo,
        intent: mapping.intent
      };
    }

    // Update keywords in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let updatedCount = 0;
    for (const keyword of keywords) {
      const kwLower = keyword.keyword.toLowerCase();
      const cluster = keywordToCluster[kwLower];
      const mapping = keywordToMapping[kwLower];
      
      const updates: Record<string, string> = {};
      if (cluster) updates.cluster = cluster;
      if (mapping?.mappedTo) updates.mapped_block = mapping.mappedTo;
      if (mapping?.intent && ['informational', 'commercial', 'navigational', 'transactional'].includes(mapping.intent)) {
        updates.intent = mapping.intent;
      }
      
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('keywords')
          .update(updates)
          .eq('id', keyword.id);
        
        if (!error) {
          updatedCount++;
        } else {
          console.error(`Failed to update keyword ${keyword.id}:`, error);
        }
      }
    }

    console.log(`Updated ${updatedCount}/${keywords.length} keywords`);

    return new Response(JSON.stringify({ 
      success: true, 
      updatedCount,
      totalKeywords: keywords.length,
      clustersFound: Object.keys(analysis.clusters || {}).length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-keywords:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
