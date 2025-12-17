import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Moon, Sun, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ArticleSection {
  element: string;
  title: string;
  brief?: string;
  fullContent: string;
  wordCount?: number;
  purpose?: string;
  comments?: string;
}

interface WordPressPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: ArticleSection[];
  url: string;
}

export function WordPressPreview({ open, onOpenChange, sections, url }: WordPressPreviewProps) {
  const [darkMode, setDarkMode] = useState(false);
  const { toast } = useToast();

  const metaTitle = sections.find(s => s.element === 'Meta Title')?.fullContent || sections.find(s => s.element === 'Meta Title')?.title;
  const metaDescription = sections.find(s => s.element === 'Meta Description')?.fullContent;
  const h1 = sections.find(s => s.element === 'H1');

  // Get all content sections (H2, H3)
  const contentSections = sections.filter(s => s.element === 'H2' || s.element === 'H3');
  const imageAltTexts = sections.find(s => s.element === 'Image Alt Texts')?.fullContent;

  const copyAsMarkdown = () => {
    let markdown = '';
    
    sections.forEach(section => {
      if (section.element === 'Meta Title') {
        markdown += `<!-- Meta Title: ${section.fullContent || section.title} -->\n\n`;
      } else if (section.element === 'Meta Description') {
        markdown += `<!-- Meta Description: ${section.fullContent} -->\n\n`;
      } else if (section.element === 'H1') {
        markdown += `# ${section.title}\n\n${section.fullContent}\n\n`;
      } else if (section.element === 'H2') {
        markdown += `## ${section.title}\n\n${section.fullContent}\n\n`;
      } else if (section.element === 'H3') {
        markdown += `### ${section.title}\n\n${section.fullContent}\n\n`;
      } else if (section.element === 'Image Alt Texts') {
        markdown += `<!-- Image Alt Texts:\n${section.fullContent}\n-->\n\n`;
      }
    });

    navigator.clipboard.writeText(markdown);
    toast({ title: 'Markdown copied to clipboard!' });
  };

  const copyAsHTML = () => {
    let html = '';
    
    sections.forEach(section => {
      if (section.element === 'Meta Title') {
        html += `<!-- Meta Title: ${section.fullContent || section.title} -->\n`;
      } else if (section.element === 'Meta Description') {
        html += `<!-- Meta Description: ${section.fullContent} -->\n\n`;
      } else if (section.element === 'H1') {
        html += `<h1>${section.title}</h1>\n${formatContentAsHTML(section.fullContent)}\n\n`;
      } else if (section.element === 'H2') {
        html += `<h2>${section.title}</h2>\n${formatContentAsHTML(section.fullContent)}\n\n`;
      } else if (section.element === 'H3') {
        html += `<h3>${section.title}</h3>\n${formatContentAsHTML(section.fullContent)}\n\n`;
      }
    });

    navigator.clipboard.writeText(html);
    toast({ title: 'HTML copied to clipboard!' });
  };

  const formatContentAsHTML = (content: string) => {
    if (!content) return '';
    
    // Split by double newlines for paragraphs
    const paragraphs = content.split(/\n\n+/);
    return paragraphs
      .map(p => p.trim())
      .filter(p => p)
      .map(p => {
        // Check if it's a Q&A format
        if (p.startsWith('Q:')) {
          const lines = p.split('\n');
          const question = lines[0].replace('Q:', '').trim();
          const answer = lines.slice(1).join(' ').replace('A:', '').trim();
          return `<div class="faq-item"><h4>${question}</h4><p>${answer}</p></div>`;
        }
        return `<p>${p}</p>`;
      })
      .join('\n');
  };

  // Highlight link placeholders
  const renderContent = (content: string) => {
    if (!content) return null;
    
    // Replace link placeholders with highlighted spans
    const parts = content.split(/(\[INTERNAL LINK: [^\]]+\]|\[EXTERNAL LINK: [^\]]+\])/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('[INTERNAL LINK:')) {
        const topic = part.replace('[INTERNAL LINK:', '').replace(']', '').trim();
        return (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium">
            <LinkIcon className="h-3 w-3" />
            {topic}
          </span>
        );
      }
      if (part.startsWith('[EXTERNAL LINK:')) {
        const source = part.replace('[EXTERNAL LINK:', '').replace(']', '').trim();
        return (
          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-medium">
            <ExternalLink className="h-3 w-3" />
            {source}
          </span>
        );
      }
      // Format Q&A sections
      if (part.includes('Q:') && part.includes('A:')) {
        const qaItems = part.split(/(?=Q:)/g).filter(q => q.trim());
        return (
          <div key={i} className="space-y-4 my-4">
            {qaItems.map((qa, qIdx) => {
              const lines = qa.split('\n').filter(l => l.trim());
              const question = lines[0]?.replace('Q:', '').trim();
              const answer = lines.slice(1).join(' ').replace('A:', '').trim();
              return question ? (
                <div key={qIdx} className="border-l-4 border-primary/30 pl-4">
                  <h4 className="font-semibold text-foreground mb-2">{question}</h4>
                  <p className="text-muted-foreground">{answer}</p>
                </div>
              ) : null;
            })}
          </div>
        );
      }
      // Regular paragraphs
      return part.split('\n\n').map((para, pIdx) => 
        para.trim() ? <p key={`${i}-${pIdx}`} className="mb-4 leading-relaxed">{para}</p> : null
      );
    });
  };

  const totalWordCount = sections.reduce((acc, s) => acc + (s.wordCount || s.fullContent?.split(/\s+/).length || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0">
        <DialogHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              WordPress Preview
              <Badge variant="secondary">{totalWordCount} words</Badge>
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={copyAsMarkdown}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={copyAsHTML}>
                <Copy className="h-4 w-4 mr-2" />
                Copy HTML
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className={`min-h-full ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}`}>
            {/* Browser-like header */}
            <div className={`px-6 py-3 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2 text-sm">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className={`flex-1 px-3 py-1 rounded text-xs font-mono truncate ${darkMode ? 'bg-slate-700' : 'bg-white border'}`}>
                  {url}
                </div>
              </div>
            </div>

            {/* SERP Preview */}
            <div className={`px-6 py-4 border-b ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-blue-50/50 border-blue-100'}`}>
              <div className="text-xs text-muted-foreground mb-2">Google SERP Preview</div>
              <div className="max-w-xl">
                <div className="text-xs text-green-700 dark:text-green-400 mb-1 truncate">{url}</div>
                <div className="text-blue-600 dark:text-blue-400 text-lg font-medium hover:underline cursor-pointer line-clamp-1">
                  {metaTitle || 'Page Title'}
                </div>
                <div className={`text-sm mt-1 line-clamp-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {metaDescription || 'Meta description will appear here...'}
                </div>
              </div>
            </div>

            {/* Article Content */}
            <article className="max-w-3xl mx-auto px-6 py-8">
              {/* H1 */}
              {h1 && (
                <header className="mb-8">
                  <h1 className={`text-3xl md:text-4xl font-bold mb-4 leading-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                    {h1.title}
                  </h1>
                  {h1.fullContent && h1.fullContent !== h1.title && (
                    <div className={`text-lg leading-relaxed ${darkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {renderContent(h1.fullContent)}
                    </div>
                  )}
                </header>
              )}

              {/* Content Sections */}
              {contentSections.map((section, idx) => (
                <section key={idx} className="mb-8">
                  {section.element === 'H2' ? (
                    <h2 className={`text-2xl font-bold mb-4 pb-2 border-b ${darkMode ? 'text-white border-slate-700' : 'text-slate-900 border-slate-200'}`}>
                      {section.title}
                    </h2>
                  ) : (
                    <h3 className={`text-xl font-semibold mb-3 ${darkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {section.title}
                    </h3>
                  )}
                  <div className={`${darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    {renderContent(section.fullContent)}
                  </div>
                </section>
              ))}

              {/* Image Alt Texts */}
              {imageAltTexts && (
                <aside className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <h4 className={`text-sm font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    📷 Image Alt Texts (for reference)
                  </h4>
                  <ul className={`text-sm space-y-1 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    {imageAltTexts.split('\n').filter(t => t.trim()).map((alt, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-muted-foreground">•</span>
                        <span>{alt}</span>
                      </li>
                    ))}
                  </ul>
                </aside>
              )}
            </article>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
