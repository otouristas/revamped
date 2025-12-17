import { Audit } from '@/types/audit';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';

interface ExportPanelProps {
  audit: Audit;
}

export function ExportPanel({ audit }: ExportPanelProps) {
  const { toast } = useToast();

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // Metadata sheet
    const metadataData = [
      ['Meta Title', audit.metadata.title || 'Not found'],
      ['Meta Description', audit.metadata.description || 'Not found'],
      ['Canonical', audit.metadata.canonical || 'Not found'],
      ['Language', audit.metadata.language || 'Not specified'],
    ];
    const metadataSheet = XLSX.utils.aoa_to_sheet([['Field', 'Value'], ...metadataData]);
    XLSX.utils.book_append_sheet(wb, metadataSheet, 'Metadata');

    // Headings sheet
    const headingsData = audit.headings.map(h => [
      h.tag,
      h.text,
      h.intent || '',
      h.issues?.join(', ') || '',
    ]);
    const headingsSheet = XLSX.utils.aoa_to_sheet([['Tag', 'Text', 'Intent', 'Issues'], ...headingsData]);
    XLSX.utils.book_append_sheet(wb, headingsSheet, 'Headings');

    // Links sheet
    const linksData = audit.links.map(l => [
      l.type,
      l.text,
      l.href,
    ]);
    const linksSheet = XLSX.utils.aoa_to_sheet([['Type', 'Anchor Text', 'URL'], ...linksData]);
    XLSX.utils.book_append_sheet(wb, linksSheet, 'Links');

    // Revamp sheet
    if (audit.revampedContent?.length > 0) {
      const revampData = audit.revampedContent.map(r => [
        r.sectionType,
        r.original,
        r.recommended,
        r.reasoning,
        r.keywords?.join(', ') || '',
        r.aiOverviewScore,
        r.citationPotential,
      ]);
      const revampSheet = XLSX.utils.aoa_to_sheet([
        ['Section', 'Original', 'Recommended', 'Reasoning', 'Keywords', 'AI Overview', 'Citation'],
        ...revampData,
      ]);
      XLSX.utils.book_append_sheet(wb, revampSheet, 'Revamp');
    }

    // AI Analysis sheet
    if (audit.aiAnalysis?.overallScore > 0) {
      const analysisData = [
        ['Overall Score', audit.aiAnalysis.overallScore],
        ['AI Overview Eligibility', audit.aiAnalysis.aiOverviewEligibility],
        ['Citation Potential', audit.aiAnalysis.citationPotential],
        ['Content Freshness', audit.aiAnalysis.contentFreshness],
        ['', ''],
        ['Issues', ''],
        ...(audit.aiAnalysis.issues?.map(i => ['', i]) || []),
        ['', ''],
        ['Recommendations', ''],
        ...(audit.aiAnalysis.recommendations?.map(r => ['', r]) || []),
      ];
      const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(wb, analysisSheet, 'AI Analysis');
    }

    XLSX.writeFile(wb, `seo-audit-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: 'Excel exported', description: 'File downloaded successfully.' });
  };

  const exportToDoc = async () => {
    const children: Paragraph[] = [];

    // Title
    children.push(
      new Paragraph({
        text: 'SEO Content Audit Report',
        heading: HeadingLevel.TITLE,
      })
    );

    children.push(
      new Paragraph({
        text: `URL: ${audit.url}`,
        spacing: { after: 200 },
      })
    );

    children.push(
      new Paragraph({
        text: `Generated: ${new Date().toLocaleDateString()}`,
        spacing: { after: 400 },
      })
    );

    // Metadata Section
    children.push(
      new Paragraph({
        text: 'Metadata Analysis',
        heading: HeadingLevel.HEADING_1,
      })
    );

    children.push(new Paragraph({ text: `Title: ${audit.metadata.title || 'Not found'}` }));
    children.push(new Paragraph({ text: `Description: ${audit.metadata.description || 'Not found'}` }));
    children.push(new Paragraph({ text: `Canonical: ${audit.metadata.canonical || 'Not found'}`, spacing: { after: 400 } }));

    // AI Analysis Section
    if (audit.aiAnalysis?.overallScore > 0) {
      children.push(
        new Paragraph({
          text: 'AI Analysis',
          heading: HeadingLevel.HEADING_1,
        })
      );

      children.push(new Paragraph({ text: `Overall Score: ${audit.aiAnalysis.overallScore}/100` }));
      children.push(new Paragraph({ text: `AI Overview Eligibility: ${audit.aiAnalysis.aiOverviewEligibility}` }));
      children.push(new Paragraph({ text: `Citation Potential: ${audit.aiAnalysis.citationPotential}` }));
      children.push(new Paragraph({ text: `Content Freshness: ${audit.aiAnalysis.contentFreshness}`, spacing: { after: 200 } }));

      if (audit.aiAnalysis.issues?.length > 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Issues:', bold: true })] }));
        audit.aiAnalysis.issues.forEach(issue => {
          children.push(new Paragraph({ text: `• ${issue}` }));
        });
      }

      if (audit.aiAnalysis.recommendations?.length > 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: 'Recommendations:', bold: true })], spacing: { before: 200 } }));
        audit.aiAnalysis.recommendations.forEach(rec => {
          children.push(new Paragraph({ text: `• ${rec}` }));
        });
      }
    }

    // Revamped Content Section
    if (audit.revampedContent?.length > 0) {
      children.push(
        new Paragraph({
          text: 'Content Revamp Recommendations',
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400 },
        })
      );

      audit.revampedContent.forEach((section, index) => {
        children.push(
          new Paragraph({
            text: `Section ${index + 1}: ${section.sectionType}`,
            heading: HeadingLevel.HEADING_2,
          })
        );

        children.push(new Paragraph({ children: [new TextRun({ text: 'Original:', bold: true })] }));
        children.push(new Paragraph({ text: section.original }));

        children.push(new Paragraph({ children: [new TextRun({ text: 'Recommended:', bold: true })], spacing: { before: 200 } }));
        children.push(new Paragraph({ text: section.recommended }));

        if (section.reasoning) {
          children.push(new Paragraph({ children: [new TextRun({ text: 'Reasoning:', bold: true })], spacing: { before: 200 } }));
          children.push(new Paragraph({ text: section.reasoning, spacing: { after: 400 } }));
        }
      });
    }

    const doc = new Document({
      sections: [{ children }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `seo-audit-${new Date().toISOString().split('T')[0]}.docx`);
    toast({ title: 'Document exported', description: 'File downloaded successfully.' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Audit Report
          </CardTitle>
          <CardDescription>
            Download your analysis in production-ready formats
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <ExportCard
              title="Excel Export"
              description="Structured spreadsheet with all data in separate sheets. Perfect for copy-paste to production."
              icon={<FileSpreadsheet className="h-8 w-8 text-green-600" />}
              buttonText="Download .xlsx"
              onClick={exportToExcel}
            />
            <ExportCard
              title="Document Export"
              description="Clean editorial format with revamped content. Ready for stakeholder review."
              icon={<FileText className="h-8 w-8 text-blue-600" />}
              buttonText="Download .docx"
              onClick={exportToDoc}
            />
          </div>
        </CardContent>
      </Card>

      {/* Export Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Export Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-2">Excel Sheets Included:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Metadata (title, description, canonical)</li>
                <li>• Headings ({audit.headings.length} items)</li>
                <li>• Links ({audit.links.length} items)</li>
                {audit.revampedContent?.length > 0 && (
                  <li>• Revamp Recommendations ({audit.revampedContent.length} sections)</li>
                )}
                {audit.aiAnalysis?.overallScore > 0 && (
                  <li>• AI Analysis (score, issues, recommendations)</li>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Document Sections:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Audit Overview</li>
                <li>• Metadata Analysis</li>
                {audit.aiAnalysis?.overallScore > 0 && <li>• AI Analysis Report</li>}
                {audit.revampedContent?.length > 0 && <li>• Content Revamp Recommendations</li>}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportCard({
  title,
  description,
  icon,
  buttonText,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  buttonText: string;
  onClick: () => void;
}) {
  return (
    <div className="border border-border rounded-lg p-6 flex flex-col items-center text-center">
      {icon}
      <h3 className="font-medium mt-4 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      <Button onClick={onClick}>
        <Download className="h-4 w-4 mr-2" />
        {buttonText}
      </Button>
    </div>
  );
}
