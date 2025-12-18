// TypeScript Type Definitions
// Copy this to: src/types/audit.ts

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

// Database row types (snake_case matching Supabase)
export interface AuditRow {
  id: string;
  user_id: string;
  url: string;
  status: string;
  raw_html?: string;
  markdown?: string;
  metadata: AuditMetadata;
  headings: HeadingItem[];
  body_content: BodyBlock[];
  ctas: CTAItem[];
  links: LinkItem[];
  media: MediaItem[];
  ai_analysis: AIAnalysis;
  revamped_content: RevampedSection[];
  created_at: string;
  updated_at: string;
}

export interface KeywordRow {
  id: string;
  audit_id: string;
  user_id: string;
  keyword: string;
  impressions: number;
  clicks: number;
  position: number;
  ctr: number;
  intent?: string;
  cluster?: string;
  mapped_block?: string;
  prev_impressions: number;
  prev_clicks: number;
  prev_position: number;
  prev_ctr: number;
  created_at: string;
}

export interface GuestPostRow {
  id: string;
  audit_id: string;
  user_id: string;
  title: string;
  content: string;
  word_count: number;
  editorial_angle?: string;
  target_urls: { url: string; anchor: string; anchorType: string }[];
  anchor_placements: unknown[];
  risk_level: string;
  editorial_risk_score: number;
  spam_likelihood_score: number;
  acceptance_probability: number;
  created_at: string;
  updated_at: string;
}
