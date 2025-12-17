export interface AuditMetadata {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  robots?: string;
  language?: string;
}

export interface HeadingItem {
  tag: string;
  text: string;
  position: number;
  issues: string[];
  intent?: 'informational' | 'commercial' | 'navigational';
}

export interface BodyBlock {
  type: 'paragraph' | 'list' | 'span';
  text: string;
  position: number;
  wordCount: number;
  issues: string[];
}

export interface CTAItem {
  text: string;
  href?: string;
  type: 'button' | 'link';
  position: number;
  intent?: 'commercial' | 'navigational';
}

export interface LinkItem {
  href: string;
  text: string;
  type: 'internal' | 'external' | 'commercial';
  position: number;
}

export interface MediaItem {
  type: 'image' | 'video' | 'iframe';
  src: string;
  alt?: string;
  position: number;
}

export interface Keyword {
  id: string;
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  intent?: 'informational' | 'commercial' | 'navigational' | 'transactional';
  cluster?: string;
  mappedBlock?: string;
}

export interface AIAnalysis {
  overallScore: number;
  aiOverviewEligibility: 'high' | 'medium' | 'low';
  citationPotential: 'high' | 'medium' | 'low';
  contentFreshness: 'fresh' | 'moderate' | 'stale';
  issues: string[];
  recommendations: string[];
}

export interface RevampedSection {
  sectionType: string;
  original: string;
  recommended: string;
  reasoning: string;
  keywords: string[];
  aiOverviewScore: 'high' | 'medium' | 'low';
  citationPotential: 'high' | 'medium' | 'low';
}

export interface GuestPost {
  id: string;
  auditId: string;
  title: string;
  content: string;
  wordCount: number;
  editorialAngle: string;
  targetUrls: { url: string; anchor: string; anchorType: string }[];
  riskLevel: 'conservative' | 'balanced' | 'aggressive';
  editorialRiskScore: number;
  spamLikelihoodScore: number;
  acceptanceProbability: number;
}

export interface Audit {
  id: string;
  userId: string;
  url: string;
  status: 'pending' | 'crawling' | 'analyzing' | 'completed' | 'failed';
  rawHtml?: string;
  markdown?: string;
  metadata: AuditMetadata;
  headings: HeadingItem[];
  bodyContent: BodyBlock[];
  ctas: CTAItem[];
  links: LinkItem[];
  media: MediaItem[];
  aiAnalysis: AIAnalysis;
  revampedContent: RevampedSection[];
  createdAt: string;
  updatedAt: string;
}
