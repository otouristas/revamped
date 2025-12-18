# Required Secrets

## Manual Configuration Required

### FIRECRAWL_API_KEY

- **Purpose**: Web scraping via Firecrawl API
- **Where to get**: https://firecrawl.dev (sign up for API key)
- **Used by**: `firecrawl-scrape` edge function
- **How to add**: 
  1. Use Firecrawl connector in Lovable (recommended), OR
  2. Add manually via Lovable Cloud secrets

---

## Auto-Provided by Lovable Cloud

These secrets are automatically configured when Lovable Cloud is enabled. **No action required.**

### LOVABLE_API_KEY

- **Purpose**: AI analysis via Lovable AI Gateway
- **Used by**: All AI edge functions (`ai-analyze`, `classify-keywords`, `analyze-keywords`, `generate-article-draft`, `generate-guest-post`)

### SUPABASE_URL

- **Purpose**: Database connection URL
- **Used by**: All edge functions for database operations

### SUPABASE_ANON_KEY

- **Purpose**: Public API key for client-side auth
- **Used by**: Frontend Supabase client

### SUPABASE_SERVICE_ROLE_KEY

- **Purpose**: Admin API key for server-side operations (bypasses RLS)
- **Used by**: Edge functions for database writes

---

## Environment Variables in Frontend

The frontend uses these environment variables (auto-configured):

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
```

These are available via `import.meta.env.VITE_SUPABASE_URL` etc.

---

## Security Notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Never hardcode secrets in source code
- All secrets are encrypted at rest in Lovable Cloud
- Edge functions access secrets via `Deno.env.get('SECRET_NAME')`
