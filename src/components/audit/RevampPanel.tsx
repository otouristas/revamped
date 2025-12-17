import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, ChevronDown, Copy, FileSpreadsheet, ListChecks, Loader2, Sparkles, Eye, FileText } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WordPressPreview } from './WordPressPreview';

interface RevampPanelProps {
  audit: Audit;
}

interface ArticleSection {
  element: string;
  title: string;
  brief?: string;
  fullContent: string;
  wordCount?: number;
  purpose?: string;
  comments?: string;
}

export function RevampPanel({ audit }: RevampPanelProps) {
  const { revampedContent, metadata, headings, url } = audit;
  const { toast } = useToast();
  const [generatedSections, setGeneratedSections] = useState<ArticleSection[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const hasRevamp = revampedContent?.length > 0 || headings?.length > 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  // Build initial table structure from ACTUAL headings
  const buildInitialStructure = (): ArticleSection[] => {
    const sections: ArticleSection[] = [];
    const topic = metadata?.title || url?.split('/').pop()?.replace(/-/g, ' ') || 'the topic';

    // Meta Title
    sections.push({
      element: 'Meta Title',
      title: metadata?.title || `[Optimized title about ${topic}]`,
      brief: 'Primary keyword + emotional hook; under 60 chars',
      fullContent: '',
      purpose: 'High CTR in SERPs',
      comments: 'Aligns with user search intent',
    });

    // Meta Description
    sections.push({
      element: 'Meta Description',
      title: metadata?.description || `[Optimized description about ${topic}]`,
      brief: 'Short, actionable, motivational; under 155 chars',
      fullContent: '',
      purpose: 'Featured snippet opportunity',
      comments: 'Combines primary keyword + value promise',
    });

    // Process ALL headings in order
    headings?.forEach((h) => {
      const tag = h.tag?.toUpperCase();
      if (tag === 'H1') {
        sections.push({
          element: 'H1',
          title: h.text,
          brief: 'Main page headline matching search intent',
          fullContent: '',
          purpose: 'Main article heading; matches URL slug',
          comments: 'Single H1 per page; keyword-rich',
        });
      } else if (tag === 'H2') {
        sections.push({
          element: 'H2',
          title: h.text,
          brief: `Educational content about "${h.text}"`,
          fullContent: '',
          purpose: 'Section heading for SEO structure',
          comments: '150-250 words of prose content',
        });
      } else if (tag === 'H3') {
        sections.push({
          element: 'H3',
          title: h.text,
          brief: `Detailed content for "${h.text}"`,
          fullContent: '',
          purpose: 'Subsection under parent H2',
          comments: '80-150 words supporting content',
        });
      }
    });

    // Check if FAQ exists in headings
    const hasFaq = sections.some(s => s.title?.toLowerCase().includes('faq'));
    if (!hasFaq) {
      sections.push({
        element: 'H2',
        title: `FAQs About ${topic}`,
        brief: '4-5 Q&A pairs answering common questions',
        fullContent: '',
        purpose: 'Boosts featured snippet chances',
        comments: 'Schema-friendly; use FAQPage structured data',
      });
    }

    // Check if Conclusion exists
    const hasConclusion = sections.some(s => s.title?.toLowerCase().includes('conclusion'));
    if (!hasConclusion) {
      sections.push({
        element: 'H2',
        title: 'Conclusion',
        brief: 'Summary with CTA and internal links',
        fullContent: '',
        purpose: 'Conversion & internal link anchor',
        comments: 'Links to relevant programs/articles',
      });
    }

    // Image Alt Texts
    sections.push({
      element: 'Image Alt Texts',
      title: 'Descriptive alt texts for images',
      brief: '5 unique, keyword-rich alt text examples',
      fullContent: '',
      purpose: 'Supports image SEO & accessibility',
      comments: 'Keep under 125 chars each',
    });

    return sections;
  };

  const generateFullContent = async () => {
    setIsGenerating(true);
    try {
      const topic = metadata?.title || url?.split('/').pop()?.replace(/-/g, ' ') || 'the topic';
      
      const { data, error } = await supabase.functions.invoke('generate-article-draft', {
        body: { 
          metadata,
          url,
          headings,
          topic
        }
      });
      
      if (error) throw error;
      
      const sections = data.sections || [];
      
      if (sections.length === 0) {
        throw new Error('No content generated. Please try again.');
      }
      
      setGeneratedSections(sections);
      setHasGenerated(true);
      toast({ title: `Generated content for ${sections.length} sections!` });
    } catch (err: any) {
      console.error('Generation error:', err);
      toast({ 
        title: 'Failed to generate content', 
        description: err.message || 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTableAsCSV = () => {
    const sections = hasGenerated ? generatedSections : buildInitialStructure();
    const headers = ['Element', 'Section Title', 'Content Brief', 'Full Content', 'Word Count', 'Purpose', 'Comments', 'URL'];
    const csvContent = [
      headers.join('\t'),
      ...sections.map(section => [
        section.element,
        section.title,
        section.brief || '',
        section.fullContent || '',
        section.wordCount || section.fullContent?.split(/\s+/).length || 0,
        section.purpose || '',
        section.comments || '',
        url || ''
      ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join('\t'))
    ].join('\n');
    
    navigator.clipboard.writeText(csvContent);
    toast({ title: 'Table copied! Paste directly into Google Sheets or Excel' });
  };

  const displaySections = hasGenerated ? generatedSections : buildInitialStructure();

  const getElementBadgeStyle = (element: string) => {
    switch (element) {
      case 'Meta Title':
      case 'Meta Description':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'H1':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'H2':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'H3':
        return 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20';
      case 'Image Alt Texts':
        return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getWordCount = (section: ArticleSection) => {
    if (section.wordCount) return section.wordCount;
    if (section.fullContent) return section.fullContent.split(/\s+/).filter(w => w).length;
    return 0;
  };

  return (
    <div className="space-y-6">
      {!hasRevamp ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Content Structure Yet</h3>
            <p className="text-muted-foreground">
              Run AI Analysis to generate content recommendations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="ready" className="space-y-4">
          <TabsList>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Article Draft
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              AI Suggestions
            </TabsTrigger>
          </TabsList>

          {/* ARTICLE DRAFT TAB */}
          <TabsContent value="ready" className="space-y-4">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 mb-1">
                      <FileText className="h-5 w-5" />
                      Full Article Draft
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {hasGenerated 
                        ? `${displaySections.length} sections generated with full content` 
                        : `${displaySections.length} sections ready for content generation`}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      onClick={generateFullContent}
                      disabled={isGenerating}
                      variant={hasGenerated ? 'outline' : 'default'}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          {hasGenerated ? 'Regenerate' : 'Generate Full Content'}
                        </>
                      )}
                    </Button>
                    {hasGenerated && (
                      <Button variant="outline" onClick={() => setShowPreview(true)}>
                        <Eye className="h-4 w-4 mr-2" />
                        WordPress Preview
                      </Button>
                    )}
                    <Button onClick={copyTableAsCSV} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy for Sheets
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2 p-4">
                    {displaySections.map((section, index) => (
                      <ArticleRow 
                        key={index} 
                        section={section} 
                        index={index}
                        hasGenerated={hasGenerated}
                        onCopy={copyToClipboard}
                        badgeStyle={getElementBadgeStyle(section.element)}
                        wordCount={getWordCount(section)}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* URL Reference */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Target URL:</span>
                    <span className="text-muted-foreground font-mono text-xs truncate max-w-md">{url}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI SUGGESTIONS TAB */}
          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Content Revamp Suggestions ({revampedContent?.length || 0} sections)
                </CardTitle>
              </CardHeader>
            </Card>

            {revampedContent?.map((section, index) => (
              <RevampSection key={index} section={section} index={index} onCopy={copyToClipboard} />
            ))}

            {(!revampedContent || revampedContent.length === 0) && (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No AI suggestions generated yet. Run AI Analysis first.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* WordPress Preview Modal */}
      <WordPressPreview 
        open={showPreview} 
        onOpenChange={setShowPreview}
        sections={generatedSections}
        url={url}
      />
    </div>
  );
}

// Individual Article Row Component
interface ArticleRowProps {
  section: ArticleSection;
  index: number;
  hasGenerated: boolean;
  onCopy: (text: string) => void;
  badgeStyle: string;
  wordCount: number;
}

function ArticleRow({ section, index, hasGenerated, onCopy, badgeStyle, wordCount }: ArticleRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasLongContent = (section.fullContent?.length || 0) > 200;

  return (
    <div className="border rounded-lg overflow-hidden bg-card hover:bg-accent/5 transition-colors">
      <div className="p-3">
        {/* Header Row */}
        <div className="flex items-start gap-3">
          {/* Element Badge */}
          <div className="flex-shrink-0 pt-0.5">
            <Badge variant="outline" className={`text-xs font-medium ${badgeStyle}`}>
              {section.element}
            </Badge>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-sm truncate">{section.title}</h4>
              {hasGenerated && wordCount > 0 && (
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  {wordCount} words
                </Badge>
              )}
            </div>

            {/* Brief / Content Preview */}
            {hasGenerated && section.fullContent ? (
              <div className="text-sm text-foreground">
                {hasLongContent && !isExpanded ? (
                  <>
                    <p className="whitespace-pre-wrap">{section.fullContent.substring(0, 200)}...</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="h-auto p-0 text-primary"
                      onClick={() => setIsExpanded(true)}
                    >
                      Show more
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{section.fullContent}</p>
                    {hasLongContent && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="h-auto p-0 text-primary"
                        onClick={() => setIsExpanded(false)}
                      >
                        Show less
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{section.brief}</p>
            )}

            {/* Purpose & Comments */}
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              {section.purpose && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Purpose:</span> {section.purpose}
                </span>
              )}
              {section.comments && (
                <span className="flex items-center gap-1">
                  <span className="font-medium">Notes:</span> {section.comments}
                </span>
              )}
            </div>
          </div>

          {/* Copy Button */}
          {hasGenerated && section.fullContent && (
            <Button 
              variant="ghost" 
              size="icon"
              className="flex-shrink-0 h-8 w-8"
              onClick={() => onCopy(section.fullContent)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Revamp Section Component (for suggestions tab)
interface RevampSectionProps {
  section: {
    sectionType: string;
    original: string;
    recommended: string;
    reasoning: string;
    keywords: string[];
    aiOverviewScore: string;
    citationPotential: string;
  };
  index: number;
  onCopy: (text: string) => void;
}

function RevampSection({ section, index, onCopy }: RevampSectionProps) {
  const [isOpen, setIsOpen] = useState(index === 0);

  const getScoreBadge = (score: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-500/10 text-green-600 dark:text-green-400',
      medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      low: 'bg-red-500/10 text-red-600 dark:text-red-400',
    };
    return <Badge variant="outline" className={colors[score] || 'bg-muted'}>{score}</Badge>;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline">{section.sectionType}</Badge>
                <span className="text-muted-foreground font-normal text-sm">Section {index + 1}</span>
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">AI:</span>
                  {getScoreBadge(section.aiOverviewScore)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Citation:</span>
                  {getScoreBadge(section.citationPotential)}
                </div>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {section.keywords?.length > 0 && (
              <div>
                <div className="text-sm font-medium mb-2">Target Keywords</div>
                <div className="flex flex-wrap gap-1">
                  {section.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-500">Original</span>
                </div>
                <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg text-sm">
                  {section.original}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-500">Recommended</span>
                  <Button variant="ghost" size="sm" onClick={() => onCopy(section.recommended)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="bg-green-500/5 border border-green-500/10 p-4 rounded-lg text-sm">
                  {section.recommended}
                </div>
              </div>
            </div>

            {section.reasoning && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="text-sm font-medium mb-2">Why this change?</div>
                <p className="text-sm text-muted-foreground">{section.reasoning}</p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
