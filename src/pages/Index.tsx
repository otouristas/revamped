import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Zap, Brain, FileSpreadsheet, Target, ArrowRight } from 'lucide-react';
import { useEffect } from 'react';

export default function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Zap className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            SEO Content Intelligence
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            AI-powered content audit platform optimized for AI Overviews and LLM citations. 
            Analyze, revamp, and export production-ready content.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <FeatureCard
            icon={<Brain className="h-8 w-8" />}
            title="AI-Powered Analysis"
            description="Deep content analysis with AI Overview eligibility scoring and citation potential metrics."
          />
          <FeatureCard
            icon={<Target className="h-8 w-8" />}
            title="GSC Integration"
            description="Import keywords from Google Search Console and map them to content blocks."
          />
          <FeatureCard
            icon={<FileSpreadsheet className="h-8 w-8" />}
            title="Production Exports"
            description="Export to Excel and Word formats ready for immediate production use."
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="border border-border rounded-lg p-6 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}
