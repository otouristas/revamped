import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { revampedContent, metadata, url, headings, sections } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build sections list for structured output
    const sectionsList = sections?.map((s: any, idx: number) => 
      `${idx + 1}. [${s.element}] ${s.title}\n   Summary: ${s.summary}`
    ).join('\n') || '';

    const prompt = `You are an expert SEO content writer. Generate COMPLETE, PUBLICATION-READY content for each section of this article.

URL: ${url}
Current Title: ${metadata?.title || 'N/A'}
Current Description: ${metadata?.description || 'N/A'}

SECTIONS TO WRITE:
${sectionsList}

REQUIREMENTS:
1. Write COMPLETE prose for each section
2. For Meta Title: under 60 characters, keyword-rich
3. For Meta Description: under 155 characters, actionable
4. For H1: compelling, matches search intent
5. For H2 sections: 150-250 words each, comprehensive coverage
6. For H3 sections: 80-150 words each, detailed breakdown
7. For FAQs: 4-5 Q&A pairs, concise answers
8. For Conclusion: strong CTA, summarize key points
9. For Image Alt Texts: 3-5 descriptive examples
10. Include [INTERNAL LINK: topic] and [EXTERNAL LINK: source] placeholders
11. Optimize for AI Overview eligibility

Respond with a JSON object containing a "sections" array where each object has:
- "element": the structure element type
- "title": the optimized section title
- "content": the complete prose content for that section

Example format:
{
  "sections": [
    {"element": "Meta Title", "title": "Optimized Title Here", "content": "Your 60-char optimized title"},
    {"element": "Meta Description", "title": "Meta Description", "content": "Your 155-char meta description..."},
    {"element": "H1", "title": "Main Heading", "content": "Your compelling H1 headline"},
    {"element": "H2", "title": "Section Title", "content": "Full paragraph content for this section..."},
    ...
  ]
}

Generate the complete structured response now:`;

    console.log('Generating structured article sections...');

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
            content: 'You are an expert SEO content writer. Always respond with valid JSON containing a "sections" array. Each section must have "element", "title", and "content" fields.' 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('Raw AI response length:', content.length);

    // Parse JSON from response (handle markdown code blocks)
    let parsed;
    try {
      // Try to extract JSON from markdown code block if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      // Fallback: return empty sections
      parsed = { sections: [] };
    }

    console.log('Parsed sections count:', parsed.sections?.length || 0);

    return new Response(JSON.stringify({ sections: parsed.sections || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating article sections:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
