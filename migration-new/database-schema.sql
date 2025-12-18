-- ============================================
-- Content Intelligence Platform - Database Schema
-- ============================================
-- Run this migration in order when setting up a new project

-- ============================================
-- 1. DATABASE FUNCTIONS
-- ============================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- ============================================
-- 2. PROFILES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Trigger for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for auto-creating profile on signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 3. AUDITS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_html TEXT,
  markdown TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  headings JSONB DEFAULT '[]'::jsonb,
  body_content JSONB DEFAULT '[]'::jsonb,
  ctas JSONB DEFAULT '[]'::jsonb,
  links JSONB DEFAULT '[]'::jsonb,
  media JSONB DEFAULT '[]'::jsonb,
  ai_analysis JSONB DEFAULT '{}'::jsonb,
  revamped_content JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own audits"
ON public.audits FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audits"
ON public.audits FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audits"
ON public.audits FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audits"
ON public.audits FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_audits_updated_at
BEFORE UPDATE ON public.audits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster user queries
CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_created_at ON public.audits(created_at DESC);

-- ============================================
-- 4. KEYWORDS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  keyword TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  position NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  intent TEXT,
  cluster TEXT,
  mapped_block TEXT,
  -- Previous period comparison columns
  prev_impressions INTEGER DEFAULT 0,
  prev_clicks INTEGER DEFAULT 0,
  prev_position NUMERIC DEFAULT 0,
  prev_ctr NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own keywords"
ON public.keywords FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keywords"
ON public.keywords FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords"
ON public.keywords FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords"
ON public.keywords FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_keywords_audit_id ON public.keywords(audit_id);
CREATE INDEX IF NOT EXISTS idx_keywords_user_id ON public.keywords(user_id);

-- ============================================
-- 5. GUEST POSTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.guest_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  editorial_angle TEXT,
  target_urls JSONB DEFAULT '[]'::jsonb,
  anchor_placements JSONB DEFAULT '[]'::jsonb,
  risk_level TEXT DEFAULT 'balanced',
  editorial_risk_score INTEGER DEFAULT 0,
  spam_likelihood_score INTEGER DEFAULT 0,
  acceptance_probability INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.guest_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own guest posts"
ON public.guest_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guest posts"
ON public.guest_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guest posts"
ON public.guest_posts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guest posts"
ON public.guest_posts FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_guest_posts_updated_at
BEFORE UPDATE ON public.guest_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_posts_audit_id ON public.guest_posts(audit_id);
CREATE INDEX IF NOT EXISTS idx_guest_posts_user_id ON public.guest_posts(user_id);
