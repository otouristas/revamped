// Edge Function: firecrawl-scrape
// Path: supabase/functions/firecrawl-scrape/index.ts
// Purpose: Scrape web pages using Firecrawl API and parse content

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
    const { url, auditId } = await req.json();
    console.log('Scraping URL:', url, 'for audit:', auditId);

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    // Call Firecrawl
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();
    console.log('Firecrawl response status:', response.status);

    if (!response.ok) {
      throw new Error(data.error || 'Firecrawl request failed');
    }

    const html = data.data?.html || '';
    const markdown = data.data?.markdown || '';
    const metadata = data.data?.metadata || {};

    // Parse content
    const headings = parseHeadings(html);
    const links = parseLinks(html, url);
    const ctas = parseCTAs(html);
    const bodyContent = parseBodyContent(markdown);

    // Update audit in database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'completed',
        raw_html: html.substring(0, 500000),
        markdown: markdown.substring(0, 500000),
        metadata: {
          title: metadata.title || '',
          description: metadata.description || '',
          canonical: metadata.canonical || '',
          ogTitle: metadata.ogTitle || '',
          ogDescription: metadata.ogDescription || '',
          language: metadata.language || '',
          robots: metadata.robots || '',
        },
        headings,
        links,
        ctas,
        body_content: bodyContent,
      })
      .eq('id', auditId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
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

function parseHeadings(html: string) {
  const headings: Array<{ tag: string; text: string; position: number; issues: string[] }> = [];
  const regex = /<(h[1-6])[^>]*>(.*?)<\/\1>/gi;
  let match;
  let position = 0;
  
  while ((match = regex.exec(html)) !== null) {
    const tag = match[1].toUpperCase();
    const text = match[2].replace(/<[^>]*>/g, '').trim();
    const issues: string[] = [];
    
    if (text.length < 10) issues.push('Too short');
    if (text.length > 100) issues.push('Too long');
    
    headings.push({ tag, text, position: position++, issues });
  }
  
  return headings;
}

function parseLinks(html: string, baseUrl: string) {
  const links: Array<{ href: string; text: string; type: string; position: number }> = [];
  const regex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  let match;
  let position = 0;
  
  try {
    const base = new URL(baseUrl);
    
    while ((match = regex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]*>/g, '').trim();
      
      let type = 'external';
      try {
        const linkUrl = new URL(href, baseUrl);
        if (linkUrl.hostname === base.hostname) {
          type = 'internal';
        }
        if (href.includes('buy') || href.includes('shop') || href.includes('cart') || href.includes('checkout')) {
          type = 'commercial';
        }
      } catch {}
      
      links.push({ href, text, type, position: position++ });
    }
  } catch {}
  
  return links.slice(0, 200);
}

function parseCTAs(html: string) {
  const ctas: Array<{ text: string; href?: string; type: string; position: number }> = [];
  
  // Find buttons
  const buttonRegex = /<button[^>]*>(.*?)<\/button>/gi;
  let match;
  let position = 0;
  
  while ((match = buttonRegex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, '').trim();
    if (text) {
      ctas.push({ text, type: 'button', position: position++ });
    }
  }
  
  // Find action links
  const actionWords = ['buy', 'shop', 'get', 'start', 'sign up', 'subscribe', 'download', 'learn more', 'contact', 'try'];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const text = match[2].replace(/<[^>]*>/g, '').trim().toLowerCase();
    if (actionWords.some(word => text.includes(word))) {
      ctas.push({ text: match[2].replace(/<[^>]*>/g, '').trim(), href: match[1], type: 'link', position: position++ });
    }
  }
  
  return ctas.slice(0, 50);
}

function parseBodyContent(markdown: string) {
  const blocks: Array<{ type: string; text: string; position: number; wordCount: number; issues: string[] }> = [];
  const paragraphs = markdown.split(/\n\n+/);
  
  paragraphs.forEach((para, index) => {
    const text = para.trim();
    if (!text || text.startsWith('#')) return;
    
    const wordCount = text.split(/\s+/).length;
    const issues: string[] = [];
    
    if (wordCount < 20) issues.push('Thin content');
    if (wordCount > 300) issues.push('Consider breaking up');
    
    const type = text.startsWith('-') || text.startsWith('*') || /^\d+\./.test(text) ? 'list' : 'paragraph';
    
    blocks.push({ type, text: text.substring(0, 1000), position: index, wordCount, issues });
  });
  
  return blocks.slice(0, 100);
}
