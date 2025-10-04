
# 배포 시 주의사항

1. origin 변경
   1. backend CORS 세팅 settings
   2. frontend API_BASE_URL (backend origin)
   3. supabase Authentication > URL Configuration : SiteURL, RedirectURL
2. Supabase key (anon, service_role key, secret) env 설정 변경
   1. Backend (server-side, secret)
      1. SUPABASE_URL
      2. SUPABASE_SECRET_KEY ← new (preferred)
      3. Optional: SUPABASE_PUBLISHABLE_KEY (not required server-side)
   2. Frontend (Vite build-time, public)
      1. VITE_SUPABASE_URL
      2. SUPABASE_PUBLISHABLE_KEY