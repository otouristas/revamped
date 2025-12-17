-- Add comparison columns to keywords table for trend analysis
ALTER TABLE public.keywords 
ADD COLUMN IF NOT EXISTS prev_clicks integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prev_impressions integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS prev_position numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS ctr numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS prev_ctr numeric DEFAULT 0;