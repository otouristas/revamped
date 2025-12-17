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
    const { revampedContent, metadata, url, headings } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build the structure outline from revamped content
    const sections = revampedContent?.map((section: any, idx: number) => ({
      type: section.sectionType,
      title: section.recommended?.split('.')[0] || `Section ${idx + 1}`,
      summary: section.recommended,
      keywords: section.keywords || []
    })) || [];

    const prompt = `You are an expert SEO content writer. Generate a COMPLETE, PUBLICATION-READY article based on the following structure and guidelines.

URL: ${url}
Current Title: ${metadata?.title || 'N/A'}
Current Description: ${metadata?.description || 'N/A'}

ARTICLE STRUCTURE TO FOLLOW:
${sections.map((s: any, i: number) => `
${i + 1}. [${s.type}] ${s.title}
   Summary: ${s.summary}
   Target Keywords: ${s.keywords.join(', ') || 'N/A'}
`).join('\n')}

REQUIREMENTS:
1. Write COMPLETE prose for each section (150-300 words per H2, 80-150 words per H3)
2. Include the meta title and meta description at the top
3. Use natural language that flows well
4. Incorporate target keywords naturally without stuffing
5. Include internal link placeholders like [INTERNAL LINK: topic]
6. Include external link placeholders like [EXTERNAL LINK: source for claim]
7. Add image placeholders like [IMAGE: description of suggested image]
8. Write in a professional but engaging tone
9. Optimize for AI Overview eligibility with clear, concise answers
10. Include FAQ section with 4-5 questions and answers
11. End with a strong CTA

OUTPUT FORMAT:
---
META TITLE: [Your optimized title under 60 chars]
META DESCRIPTION: [Your optimized description under 155 chars]
---

# [H1 Title]

[Introduction paragraph - hook the reader, introduce the topic, preview what they'll learn]

## [H2 Section Title]

[Full prose content for this section...]

[Continue for all sections...]

## FAQs About [Topic]

**Q: [Question 1]**
A: [Answer 1]

[Continue for 4-5 FAQs...]

## Conclusion

[Wrap up with key takeaways and CTA]

---
Generate the complete article now:`;

    console.log('Generating full article draft...');

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
            content: 'You are an expert SEO content writer specializing in creating comprehensive, well-structured articles optimized for both search engines and AI overviews. Write complete, publication-ready content.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 8000,
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
    const draft = data.choices?.[0]?.message?.content || '';

    console.log('Draft generated successfully, length:', draft.length);

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating article draft:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
