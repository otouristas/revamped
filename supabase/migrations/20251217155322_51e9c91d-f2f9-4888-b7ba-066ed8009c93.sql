-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create audits table
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'analyzing', 'completed', 'failed')),
  raw_html TEXT,
  markdown TEXT,
  metadata JSONB DEFAULT '{}',
  headings JSONB DEFAULT '[]',
  body_content JSONB DEFAULT '[]',
  ctas JSONB DEFAULT '[]',
  links JSONB DEFAULT '[]',
  media JSONB DEFAULT '[]',
  ai_analysis JSONB DEFAULT '{}',
  revamped_content JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audits
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

-- Audits policies
CREATE POLICY "Users can view their own audits" ON public.audits
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audits" ON public.audits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audits" ON public.audits
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audits" ON public.audits
  FOR DELETE USING (auth.uid() = user_id);

-- Create keywords table
CREATE TABLE public.keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  position DECIMAL DEFAULT 0,
  intent TEXT CHECK (intent IN ('informational', 'commercial', 'navigational', 'transactional')),
  cluster TEXT,
  mapped_block TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on keywords
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;

-- Keywords policies
CREATE POLICY "Users can view their own keywords" ON public.keywords
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own keywords" ON public.keywords
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own keywords" ON public.keywords
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own keywords" ON public.keywords
  FOR DELETE USING (auth.uid() = user_id);

-- Create guest_posts table
CREATE TABLE public.guest_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  word_count INTEGER DEFAULT 0,
  editorial_angle TEXT,
  target_urls JSONB DEFAULT '[]',
  anchor_placements JSONB DEFAULT '[]',
  risk_level TEXT DEFAULT 'balanced' CHECK (risk_level IN ('conservative', 'balanced', 'aggressive')),
  editorial_risk_score INTEGER DEFAULT 0,
  spam_likelihood_score INTEGER DEFAULT 0,
  acceptance_probability INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on guest_posts
ALTER TABLE public.guest_posts ENABLE ROW LEVEL SECURITY;

-- Guest posts policies
CREATE POLICY "Users can view their own guest posts" ON public.guest_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own guest posts" ON public.guest_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own guest posts" ON public.guest_posts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own guest posts" ON public.guest_posts
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audits_updated_at
  BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guest_posts_updated_at
  BEFORE UPDATE ON public.guest_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_audits_user_id ON public.audits(user_id);
CREATE INDEX idx_audits_status ON public.audits(status);
CREATE INDEX idx_keywords_audit_id ON public.keywords(audit_id);
CREATE INDEX idx_keywords_user_id ON public.keywords(user_id);
CREATE INDEX idx_guest_posts_audit_id ON public.guest_posts(audit_id);
CREATE INDEX idx_guest_posts_user_id ON public.guest_posts(user_id);