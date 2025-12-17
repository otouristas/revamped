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
    const { metadata, url, headings, topic } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Extract topic from URL or metadata
    const pageTopic = topic || metadata?.title || url?.split('/').pop()?.replace(/-/g, ' ') || 'the topic';

    // Build sections list from ACTUAL headings
    const sections: { element: string; title: string; index: number }[] = [];
    
    // Always add Meta Title and Meta Description first
    sections.push({ element: 'Meta Title', title: metadata?.title || `[Optimized title about ${pageTopic}]`, index: 0 });
    sections.push({ element: 'Meta Description', title: metadata?.description || `[Optimized description about ${pageTopic}]`, index: 1 });
    
    // Process ALL headings in order
    headings?.forEach((h: { tag: string; text: string }, idx: number) => {
      const tag = h.tag?.toUpperCase();
      if (tag === 'H1' || tag === 'H2' || tag === 'H3') {
        sections.push({ element: tag, title: h.text, index: sections.length });
      }
    });

    // Check if FAQ exists, if not add it
    const hasFaq = sections.some(s => s.title?.toLowerCase().includes('faq'));
    if (!hasFaq) {
      sections.push({ element: 'H2', title: `FAQs About ${pageTopic}`, index: sections.length });
    }

    // Check if Conclusion exists, if not add it
    const hasConclusion = sections.some(s => s.title?.toLowerCase().includes('conclusion'));
    if (!hasConclusion) {
      sections.push({ element: 'H2', title: `Conclusion`, index: sections.length });
    }

    // Add Image Alt Texts
    sections.push({ element: 'Image Alt Texts', title: 'Descriptive alt texts for images', index: sections.length });

    // Build detailed instructions for EACH section
    const sectionPrompts = sections.map((s, idx) => {
      let wordCount = '';
      let instruction = '';
      
      switch(s.element) {
        case 'Meta Title':
          wordCount = '50-60 characters';
          instruction = `Write an SEO-optimized title that includes the primary keyword, creates urgency or curiosity, and is under 60 characters. Make it compelling for clicks.`;
          break;
        case 'Meta Description':
          wordCount = '140-155 characters';
          instruction = `Write a meta description that summarizes the value proposition, includes a call-to-action, and entices users to click. Must be under 155 characters.`;
          break;
        case 'H1':
          wordCount = '60-80 characters';
          instruction = `Write the main page headline. It should match search intent, include the primary keyword, and be compelling. This is the ONLY H1 on the page.`;
          break;
        case 'H2':
          if (s.title.toLowerCase().includes('faq')) {
            wordCount = '300-400 words';
            instruction = `Generate 4-5 FAQ Q&A pairs in this format:
Q: [Question about ${pageTopic}]
A: [50-80 word detailed answer with facts]

Make questions match real search queries. Answers should be authoritative and include specific examples or data.`;
          } else if (s.title.toLowerCase().includes('conclusion')) {
            wordCount = '100-150 words';
            instruction = `Write a compelling conclusion that:
- Summarizes key takeaways (2-3 sentences)
- Reinforces the main benefit to the reader
- Includes a clear call-to-action
- Mentions [INTERNAL LINK: related topic] for further reading`;
          } else {
            wordCount = '150-250 words';
            instruction = `Write educational, authoritative content for this section. Include:
- Opening hook that states the key point
- 2-3 supporting facts, examples, or data points
- Practical advice or actionable insight
- [INTERNAL LINK: topic] placeholder where relevant
- Natural keyword integration (don't stuff)
Write in clear prose paragraphs. NO bullet points unless the section title implies a list.`;
          }
          break;
        case 'H3':
          wordCount = '80-150 words';
          instruction = `Write detailed supporting content for this subsection. Include:
- Specific examples or case studies
- Data points or statistics if applicable
- Practical how-to advice
- Connection to the parent H2 topic
Keep it focused and actionable.`;
          break;
        case 'Image Alt Texts':
          wordCount = '5 alt texts';
          instruction = `Generate 5 descriptive image alt texts for this article. Each should:
- Be 10-15 words
- Describe what's in the image visually
- Include relevant keywords naturally
- Be unique (don't repeat patterns)
Format: One alt text per line, no numbering.`;
          break;
        default:
          wordCount = '100-150 words';
          instruction = 'Write appropriate content for this section.';
      }

      return `
---SECTION ${idx + 1}---
ELEMENT: ${s.element}
HEADING: "${s.title}"
TARGET WORD COUNT: ${wordCount}
INSTRUCTIONS: ${instruction}
---END SECTION ${idx + 1}---`;
    }).join('\n\n');

    const prompt = `You are an expert SEO content writer creating publication-ready content for a blog article.

TARGET URL: ${url}
PAGE TOPIC: ${pageTopic}
TOTAL SECTIONS TO GENERATE: ${sections.length}

For EACH section below, generate COMPLETE, PUBLICATION-READY content. This is NOT a brief or outline - write the ACTUAL content that will be published.

${sectionPrompts}

CRITICAL REQUIREMENTS:
1. Each section MUST have complete, standalone content
2. H2 sections need 150-250 words of REAL prose - not summaries
3. H3 sections need 80-150 words of detailed content
4. FAQs need 4-5 complete Q&A pairs with detailed answers
5. NO HTML tags in any content
6. Include [INTERNAL LINK: topic] and [EXTERNAL LINK: source] placeholders
7. Write in authoritative, educational tone
8. Each section should be independently valuable

RESPONSE FORMAT - Return ONLY valid JSON:
{
  "sections": [
    {
      "element": "Meta Title",
      "title": "[The heading/title]",
      "brief": "[1-2 sentence summary of what this section covers]",
      "fullContent": "[The COMPLETE content - NOT a summary]",
      "wordCount": [actual word count],
      "purpose": "[SEO purpose of this section]",
      "comments": "[Implementation notes]"
    }
  ]
}

Generate complete content for all ${sections.length} sections now:`;

    console.log('Generating content for', sections.length, 'sections');
    console.log('Sections:', sections.map(s => `${s.element}: ${s.title}`).join(', '));

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
            content: `You are an expert SEO content writer. You write publication-ready blog content that is:
- Authoritative and well-researched
- Engaging and easy to read
- Optimized for search engines
- Rich with facts, examples, and actionable advice

IMPORTANT: You respond ONLY with valid JSON. No markdown code blocks, no explanations.` 
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
      // Try to extract JSON from various formats
      let jsonStr = content.trim();
      
      // Remove markdown code blocks if present
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }
      
      // Try to find JSON object if there's extra text
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      
      parsed = JSON.parse(jsonStr);
      
      // Clean up any HTML tags and validate content
      if (parsed.sections) {
        parsed.sections = parsed.sections.map((s: any) => ({
          element: s.element || '',
          title: s.title?.replace(/<[^>]*>/g, '').trim() || '',
          brief: s.brief?.replace(/<[^>]*>/g, '').trim() || '',
          fullContent: s.fullContent?.replace(/<[^>]*>/g, '').trim() || '',
          wordCount: s.wordCount || (s.fullContent?.split(/\s+/).length || 0),
          purpose: s.purpose?.replace(/<[^>]*>/g, '').trim() || '',
          comments: s.comments?.replace(/<[^>]*>/g, '').trim() || '',
        }));
      }
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError);
      console.error('Raw content (first 1000 chars):', content.substring(0, 1000));
      
      // Return empty sections array on parse failure
      parsed = { sections: [] };
    }

    console.log('Parsed sections count:', parsed.sections?.length || 0);
    
    // Log first few sections for debugging
    parsed.sections?.slice(0, 3).forEach((s: any, i: number) => {
      console.log(`Section ${i}: ${s.element} - ${s.title?.substring(0, 50)} - Content length: ${s.fullContent?.length || 0}`);
    });

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
