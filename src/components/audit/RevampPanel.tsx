import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, ChevronDown, Copy, FileSpreadsheet, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface RevampPanelProps {
  audit: Audit;
}

interface RevampReadyRow {
  structureElement: string;
  sectionTitle: string;
  contentSummary: string;
  fullContent: string;
  purpose: string;
  comments: string;
}

export function RevampPanel({ audit }: RevampPanelProps) {
  const { revampedContent, metadata, headings, url } = audit;
  const { toast } = useToast();
  const [rowsWithContent, setRowsWithContent] = useState<RevampReadyRow[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const hasRevamp = revampedContent?.length > 0;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied to clipboard' });
  };

  // Generate ready-to-use table data from revamp + metadata
  const generateReadyTable = (): RevampReadyRow[] => {
    const rows: RevampReadyRow[] = [];

    // Meta Title
    rows.push({
      structureElement: 'Meta Title',
      sectionTitle: metadata?.title || revampedContent?.find(r => r.sectionType === 'meta_title')?.recommended || '[Generate from AI]',
      contentSummary: 'Primary keyword + emotional hook; under 60 chars',
      fullContent: '',
      purpose: 'High CTR in SERPs',
      comments: 'Aligns with user search intent',
    });

    // Meta Description
    rows.push({
      structureElement: 'Meta Description',
      sectionTitle: metadata?.description || revampedContent?.find(r => r.sectionType === 'meta_description')?.recommended || '[Generate from AI]',
      contentSummary: 'Short, actionable, motivational; under 155 chars',
      fullContent: '',
      purpose: 'Featured snippet opportunity',
      comments: 'Combines primary keyword + value promise',
    });

    // H1
    const h1Section = revampedContent?.find(r => r.sectionType === 'H1' || r.sectionType === 'h1');
    const h1Heading = headings?.find(h => h.tag === 'H1' || h.tag === 'h1');
    rows.push({
      structureElement: 'H1',
      sectionTitle: h1Section?.recommended || h1Heading?.text || '[Main Heading]',
      contentSummary: 'Captures search intent & emotional hook',
      fullContent: '',
      purpose: 'Main article heading; matches URL slug',
      comments: 'Single H1 per page; keyword-rich',
    });

    // Process H2 and H3 sections from revamped content
    revampedContent?.forEach((section, idx) => {
      if (section.sectionType.toLowerCase().startsWith('h2') || section.sectionType === 'section') {
        rows.push({
          structureElement: 'H2',
          sectionTitle: section.recommended.split('.')[0] || `Section ${idx + 1}`,
          contentSummary: section.recommended.substring(0, 150) + (section.recommended.length > 150 ? '...' : ''),
          fullContent: '',
          purpose: section.reasoning || 'Educational & authoritative section',
          comments: section.keywords?.join(', ') || 'Optimized for target queries',
        });
      }
      if (section.sectionType.toLowerCase().startsWith('h3') || section.sectionType === 'subsection') {
        rows.push({
          structureElement: 'H3',
          sectionTitle: section.recommended.split('.')[0] || `Subsection ${idx + 1}`,
          contentSummary: section.recommended.substring(0, 150) + (section.recommended.length > 150 ? '...' : ''),
          fullContent: '',
          purpose: section.reasoning || 'Detailed breakdown',
          comments: section.keywords?.join(', ') || 'Supports parent H2',
        });
      }
    });

    // Add FAQ section suggestion
    rows.push({
      structureElement: 'H2',
      sectionTitle: 'FAQs About [Topic]',
      contentSummary: 'Answer 4-5 short questions: What is? Why important? Examples? How to improve?',
      fullContent: '',
      purpose: 'Boosts featured snippet chances',
      comments: 'Schema-friendly; use FAQPage structured data',
    });

    // Add Conclusion
    rows.push({
      structureElement: 'H2',
      sectionTitle: 'Conclusion: [Actionable Takeaway]',
      contentSummary: 'Wrap up with motivational CTA and internal links',
      fullContent: '',
      purpose: 'Conversion & internal link anchor',
      comments: 'Links to relevant programs/articles',
    });

    // Image Alt Texts
    rows.push({
      structureElement: 'Image Alt Texts',
      sectionTitle: 'Descriptive alt text for all images',
      contentSummary: 'e.g., "A person demonstrating [topic] in action"',
      fullContent: '',
      purpose: 'Supports image SEO',
      comments: 'Avoids over-optimization; keeps natural tone',
    });

    return rows;
  };

  const generateFullContent = async () => {
    setIsGenerating(true);
    try {
      const baseRows = generateReadyTable();
      const { data, error } = await supabase.functions.invoke('generate-article-draft', {
        body: { 
          revampedContent,
          metadata,
          url,
          headings,
          sections: baseRows.map(r => ({ element: r.structureElement, title: r.sectionTitle, summary: r.contentSummary }))
        }
      });
      if (error) throw error;
      
      // Parse the sections from the AI response
      const sections = data.sections || [];
      const updatedRows = baseRows.map((row, idx) => ({
        ...row,
        sectionTitle: sections[idx]?.title || row.sectionTitle,
        fullContent: sections[idx]?.content || row.contentSummary,
      }));
      
      setRowsWithContent(updatedRows);
      setHasGenerated(true);
      toast({ title: 'Full article content generated!' });
    } catch (err) {
      toast({ title: 'Failed to generate content', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyTableAsCSV = () => {
    const rows = hasGenerated ? rowsWithContent : generateReadyTable();
    const headers = ['Structure Element', 'Section Title', 'Full Content', 'Purpose', 'Comments', 'URL'];
    const csvContent = [
      headers.join('\t'),
      ...rows.map(row => [
        row.structureElement,
        row.sectionTitle,
        hasGenerated ? row.fullContent : row.contentSummary,
        row.purpose,
        row.comments,
        url || ''
      ].join('\t'))
    ].join('\n');
    
    navigator.clipboard.writeText(csvContent);
    toast({ title: 'Table copied! Paste directly into Google Sheets or Excel' });
  };

  const displayRows = hasGenerated ? rowsWithContent : generateReadyTable();

  return (
    <div className="space-y-6">
      {!hasRevamp ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No Content Revamp Yet</h3>
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
              Revamp Ready
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Suggestions
            </TabsTrigger>
          </TabsList>

          {/* REVAMP READY TAB - Merged table with full content */}
          <TabsContent value="ready" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Ready-to-Use Blog Structure
                  </CardTitle>
                  <div className="flex gap-2">
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
                          {hasGenerated ? 'Regenerate Content' : 'Generate Full Content'}
                        </>
                      )}
                    </Button>
                    <Button onClick={copyTableAsCSV} variant="outline">
                      <Copy className="h-4 w-4 mr-2" />
                      Copy for Sheets
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {hasGenerated 
                    ? 'Full article content generated. Copy to Sheets/Excel or edit directly.' 
                    : 'Click "Generate Full Content" to create complete prose for each section.'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Element</TableHead>
                        <TableHead className="w-[200px]">Section Title</TableHead>
                        <TableHead className="min-w-[400px]">Full Content</TableHead>
                        <TableHead className="w-[150px]">Purpose</TableHead>
                        <TableHead className="w-[150px]">Comments</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayRows.map((row, index) => (
                        <TableRow key={index} className="align-top">
                          <TableCell>
                            <Badge variant={
                              row.structureElement === 'Meta Title' || row.structureElement === 'Meta Description' ? 'default' :
                              row.structureElement === 'H1' ? 'destructive' :
                              row.structureElement === 'H2' ? 'secondary' :
                              row.structureElement === 'H3' ? 'outline' : 'outline'
                            }>
                              {row.structureElement}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{row.sectionTitle}</TableCell>
                          <TableCell>
                            <div className="relative group">
                              <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {hasGenerated ? row.fullContent : row.contentSummary}
                              </div>
                              {hasGenerated && row.fullContent && (
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => copyToClipboard(row.fullContent)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.purpose}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{row.comments}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* URL Reference */}
            <Card>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Target URL:</span>
                    <span className="text-sm text-muted-foreground ml-2">{url}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(url)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DETAILED SUGGESTIONS TAB */}
          <TabsContent value="suggestions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Content Revamp Suggestions ({revampedContent.length} sections)
                </CardTitle>
              </CardHeader>
            </Card>

            {revampedContent.map((section, index) => (
              <RevampSection key={index} section={section} index={index} onCopy={copyToClipboard} />
            ))}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

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
      high: 'bg-green-500',
      medium: 'bg-yellow-500',
      low: 'bg-red-500',
    };
    return <Badge className={colors[score] || 'bg-muted'}>{score}</Badge>;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Badge variant="outline">{section.sectionType}</Badge>
                <span className="text-muted-foreground font-normal">Section {index + 1}</span>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">AI:</span>
                  {getScoreBadge(section.aiOverviewScore)}
                </div>
                <div className="flex items-center gap-1">
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
                    <Badge key={i} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-red-500">Original</span>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg text-sm">
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
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg text-sm">
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
