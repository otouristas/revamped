import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, AlertTriangle } from 'lucide-react';

interface BodyPanelProps {
  audit: Audit;
}

export function BodyPanel({ audit }: BodyPanelProps) {
  const { bodyContent, markdown } = audit;

  const totalWords = bodyContent.reduce((sum, block) => sum + (block.wordCount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Body Content Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Blocks" value={bodyContent.length} />
            <StatCard label="Total Words" value={totalWords} />
            <StatCard 
              label="Paragraphs" 
              value={bodyContent.filter(b => b.type === 'paragraph').length} 
            />
            <StatCard 
              label="Lists" 
              value={bodyContent.filter(b => b.type === 'list').length} 
            />
          </div>

          {/* Content Blocks */}
          {bodyContent.length > 0 ? (
            <ScrollArea className="h-[500px]">
              <div className="space-y-4">
                {bodyContent.map((block, index) => (
                  <div key={index} className="border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{block.type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {block.wordCount} words • Position {block.position}
                        </span>
                      </div>
                      {block.issues?.length > 0 && (
                        <div className="flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-xs text-yellow-500">{block.issues.length} issues</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm line-clamp-4">{block.text}</p>
                    {block.issues?.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {block.issues.map((issue, i) => (
                            <li key={i}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : markdown ? (
            <div>
              <h3 className="font-medium mb-2">Raw Markdown</h3>
              <ScrollArea className="h-[400px] border border-border rounded-lg p-4">
                <pre className="text-sm whitespace-pre-wrap">{markdown}</pre>
              </ScrollArea>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No body content extracted yet. Run the crawl first.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-muted/50 rounded-lg p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
