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

    // Build detailed sections list with clear instructions per type
    const sectionInstructions = sections?.map((s: any, idx: number) => {
      let instruction = '';
      switch(s.element) {
        case 'Meta Title':
          instruction = 'Write ONLY the optimized title text, under 60 characters. No description, just the title.';
          break;
        case 'Meta Description':
          instruction = 'Write ONLY the meta description text, under 155 characters. Actionable and compelling.';
          break;
        case 'H1':
          instruction = 'Write ONLY the main headline text. One powerful sentence that captures search intent.';
          break;
        case 'H2':
          instruction = 'Write 150-250 words of complete prose content for this section. Include facts, examples, and actionable insights. NO HTML tags.';
          break;
        case 'H3':
          instruction = 'Write 80-150 words of detailed supporting content. NO HTML tags.';
          break;
        case 'Image Alt Texts':
          instruction = 'Write 3-5 descriptive alt text examples, each on a new line. Format: "Alt: [description]"';
          break;
        default:
          instruction = 'Write appropriate content for this section type.';
      }
      return `${idx + 1}. [${s.element}] "${s.title}"
   Current summary: ${s.summary}
   INSTRUCTION: ${instruction}`;
    }).join('\n\n') || '';

    const prompt = `You are an expert SEO content writer. Generate publication-ready content for each section below.

TARGET URL: ${url}
CURRENT TITLE: ${metadata?.title || 'N/A'}

SECTIONS TO GENERATE (follow instructions for each):

${sectionInstructions}

CRITICAL RULES:
1. For Meta Title: ONLY output the title text (under 60 chars), nothing else
2. For Meta Description: ONLY output the description text (under 155 chars), nothing else  
3. For H1: ONLY output the headline text, nothing else
4. For H2/H3: Write FULL PARAGRAPHS of prose content. NO HTML tags. Plain text only.
5. For FAQs: Write Q&A pairs in plain text format:
   Q: [question]
   A: [answer]
   (Repeat for 4-5 questions)
6. Include [INTERNAL LINK: topic] placeholders where relevant
7. Include [EXTERNAL LINK: source] placeholders where relevant

RESPONSE FORMAT - Return valid JSON:
{
  "sections": [
    {"element": "Meta Title", "title": "Meta Title", "content": "[your 60-char title]"},
    {"element": "Meta Description", "title": "Meta Description", "content": "[your 155-char description]"},
    {"element": "H1", "title": "[optimized H1]", "content": "[same as title - just the headline]"},
    {"element": "H2", "title": "[section title]", "content": "[150-250 words of prose...]"},
    ...continue for all ${sections?.length || 0} sections
  ]
}

Generate now:`;

    console.log('Generating structured article sections, count:', sections?.length);

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
            content: 'You are an expert SEO content writer. Respond ONLY with valid JSON. Never include HTML tags in content. Follow word count guidelines exactly.' 
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

    // Parse JSON from response
    let parsed;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsed = JSON.parse(jsonStr);
      
      // Clean up any HTML tags that might have snuck in
      if (parsed.sections) {
        parsed.sections = parsed.sections.map((s: any) => ({
          ...s,
          content: s.content?.replace(/<[^>]*>/g, '').trim() || s.content,
          title: s.title?.replace(/<[^>]*>/g, '').trim() || s.title,
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw content:', content.substring(0, 500));
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
