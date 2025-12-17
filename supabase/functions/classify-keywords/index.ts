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
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, auditId } = await req.json() as { keywords: KeywordData[], auditId: string };
    
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

    // Build the prompt with all keywords
    const keywordList = keywords.map((k, i) => 
      `${i + 1}. "${k.keyword}" (position: ${k.position?.toFixed(1) || 'N/A'}, clicks: ${k.clicks}, impressions: ${k.impressions})`
    ).join('\n');

    const prompt = `Classify the search intent for each of these keywords. Use ONLY these 4 intent types:
- informational: User wants to learn/understand something (how to, what is, guide, tutorial, tips)
- commercial: User is researching before buying (best, review, comparison, vs, top)
- navigational: User looking for specific site/page (brand names, specific products)
- transactional: User ready to take action/buy (buy, order, download, sign up, price, discount)

Keywords to classify:
${keywordList}

Respond with a JSON array where each object has "keyword" and "intent" fields. Example:
[{"keyword": "how to meditate", "intent": "informational"}, {"keyword": "best meditation app", "intent": "commercial"}]

ONLY output the JSON array, no other text.`;

    console.log(`Classifying ${keywords.length} keywords...`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are an SEO expert that classifies search query intents. Always respond with valid JSON only." },
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
    
    console.log("AI response:", content);

    // Parse the JSON response
    let classifications: { keyword: string; intent: string }[] = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        classifications = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Failed to parse classification results");
    }

    // Update keywords in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let updatedCount = 0;
    for (const classification of classifications) {
      const keyword = keywords.find(k => 
        k.keyword.toLowerCase() === classification.keyword.toLowerCase()
      );
      
      if (keyword && ['informational', 'commercial', 'navigational', 'transactional'].includes(classification.intent)) {
        const { error } = await supabase
          .from('keywords')
          .update({ intent: classification.intent })
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
      totalKeywords: keywords.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in classify-keywords:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
