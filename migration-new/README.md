# Content Intelligence Platform - Migration Guide

## Overview

This guide covers migrating the Content Intelligence Platform to a new Lovable project with Lovable Cloud.

## Prerequisites

- New Lovable project with **Lovable Cloud enabled**
- Firecrawl API key (for web scraping)
- The `LOVABLE_API_KEY` is automatically provided by Lovable Cloud

## Migration Order

Follow this exact order to avoid dependency issues:

### Step 1: Database Schema

Run the SQL from `database-schema.sql` using the Lovable Cloud database migration tool:

1. Open your new Lovable project
2. Ask the AI to "Run this database migration" and paste the contents of `database-schema.sql`
3. Wait for approval and execution

### Step 2: Edge Functions

Copy each edge function from the `edge-functions/` folder:

1. Create the folder structure: `supabase/functions/[function-name]/index.ts`
2. Copy the `config.toml` to `supabase/config.toml`

Edge functions to create:
- `firecrawl-scrape` - Web scraping with Firecrawl API
- `ai-analyze` - AI content analysis
- `classify-keywords` - Keyword intent classification
- `analyze-keywords` - Keyword clustering and heading mapping
- `generate-article-draft` - Full article content generation
- `generate-guest-post` - Guest post generation

### Step 3: Configure Secrets

Add required secrets via Lovable Cloud:

1. `FIRECRAWL_API_KEY` - Get from https://firecrawl.dev

**Auto-provided secrets** (no action needed):
- `LOVABLE_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: TypeScript Types

Copy `types.ts` to `src/types/audit.ts` in your project.

### Step 5: Frontend Components

Migrate the following from your source project:
- `src/pages/Dashboard.tsx`
- `src/pages/AuditDetail.tsx`
- `src/components/audit/*` - All audit panel components
- `src/hooks/useAudits.tsx`
- `src/hooks/useAuth.tsx`

## File Structure

```
migration-new/
├── README.md                 # This file
├── database-schema.sql       # Complete SQL schema with RLS
├── secrets.md                # Required secrets documentation
├── config.toml               # Supabase function configuration
├── types.ts                  # TypeScript type definitions
└── edge-functions/
    ├── firecrawl-scrape.ts
    ├── ai-analyze.ts
    ├── classify-keywords.ts
    ├── analyze-keywords.ts
    ├── generate-article-draft.ts
    └── generate-guest-post.ts
```

## Testing Checklist

After migration, verify:

- [ ] User can sign up/login
- [ ] User can create a new audit
- [ ] Firecrawl scraping works
- [ ] AI analysis completes
- [ ] Keywords can be imported (CSV paste)
- [ ] Keyword classification works
- [ ] Keyword clustering & mapping works
- [ ] Article draft generation works
- [ ] Guest post generation works
- [ ] Audit history persists

## Troubleshooting

### "FIRECRAWL_API_KEY not configured"
- Add the Firecrawl connector or manually add the secret via Lovable Cloud secrets

### "LOVABLE_API_KEY not configured"
- Ensure Lovable Cloud is properly enabled
- This key is auto-provided, no manual action needed

### RLS Policy Errors
- Ensure the user is authenticated before CRUD operations
- Check that `user_id` is being set correctly on insert

### Edge Function 500 Errors
- Check function logs in Lovable Cloud
- Verify all environment variables are set
- Ensure `config.toml` has `verify_jwt = false` for public endpoints
