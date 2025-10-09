# Copilot Instructions

This document provides the broad and deep context of my application to help you understand my project for improving the quality of tasks including planning, code suggestions, and implementations.

## Software Specification Document (SSD)

Read the [SSD](/docs/spec/ssd.md) for the full context of the project development.


## 26. Guidelines for Copilot Agents

### Basic behavioral patterns

ALWAYS FOLLOW these patterns when doing tasks.

#### Task Approach

**DO:**
- Focus ONLY on requested tasks
- Take time to think and plan before executing
- Raise questions for issues/improvements outside scope
- For test codes: The codebase is the single source of truth
- For test codes: Re-test and report after you modified test codes.

**DON'T:**
- Add unrequested features or fixes
- Make assumptions without user confirmation
- Rush into implementation without planning

#### When to Ask User

**ASK when:**
- Multiple best practice options exist
- Choice depends on preference/taste
- Decision impacts future implementation
- Requirements are ambiguous
- Test code failures are due to the frontend or backend code base (not the test codes themselves)

**PROVIDE:**
- Clear options list with explanations
- Pros/cons for each option
- Recommended choice with rationale

#### Priority Evaluation

Evaluate ALL requests against these priorities (highest to lowest):

##### 1st Priority: Market Environment
- Total users count
- Concurrent users count
- Target devices/regions
- Target OS + versions
- Target browsers + versions
- Network conditions (online/offline)

##### 2nd Priority: Technical Requirements
- Application type (web/mobile/desktop/embedded)
- Architecture (monolith/microservices/serverless)
- Tech stack (languages/frameworks/libraries/databases)
- Performance requirements (latency/throughput)
- Security requirements (data protection/auth/authorization)
- Scalability requirements (horizontal/vertical scaling)
- Maintainability requirements (code quality/docs/testing)

##### 3rd Priority: Industry Standards
- Best practices for application type
- Standards for application scale
- Environment-specific conventions

**ACTION:** If request violates priorities, STOP and suggest alternatives with explanations.

#### Task Completion Checklist

**VERIFY:**
- [ ] Did ONLY requested tasks
- [ ] Followed user-provided context
- [ ] Applied priority evaluation
- [ ] No unauthorized additions
- [ ] No assumption-based decisions
- [ ] Removed the legacy codes not used anymore

**ACTION:** If verification fails, revisit implementation or ASK user for clarification.

### Pull Requests Guidelines

Before submitting a Pull Request, ensure it meets these guidelines:

#### 1. General Guidelines

Keep PRs small and focused on a single change. Avoid mixing features with refactoring or adding unrelated changes. This approach:

- Speeds up review process
- Simplifies cherry-picking for bug-fix releases
- Reduces reviewer cognitive load

For larger changes, consider maintaining a Draft PR and creating smaller, reviewable PRs from it.

#### 2. Commit Messages

Follow these conventions:

1. **Separate subject from body with a blank line**
2. **Limit subject line to ~50 characters**
3. **Capitalize the subject line**
4. **No period at the end of subject**
5. **Use imperative mood** (e.g., "Add feature", "Fix bug")
   - Test: _"If applied, this commit will **\<subject\>**"_
6. **Wrap body at 72 characters**
7. **Explain what and why, not how**
   - Include context and reasoning
   - Reference related issues/PRs at bottom
     _“If applied, this commit will **<subject>**”._

6. **Wrap the body at 72 characters**  
   - Improves readability in terminals and tools.

7. **Use the body to explain *what* and *why*, not *how***  
   - The diff already shows *how*.  
   - Explain the context, purpose, and reasoning behind the change.  
   - Optionally, reference related issues or PRs at the bottom.

## 27. Back-end Coding Guidelines

Python backend application guidelines.

### Core Principles

**DO:**
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Use dependency injection
- Break code into small, focused functions/classes
- Organize by features/domains, not types
- Extract common functionality into reusable components
- Use design patterns where appropriate
- Keep modules loosely coupled with clear interfaces
- Use configuration files/env variables for settings
- Write testable code (easy to test in isolation)
- Follow the existing code style and conventions when modifying code
- Clean-up codes after modification (remove unused imports, variables, functions, comments, and unnecessary changes that were prooved to be not needed anymore)

**DON'T:**
- Create monolithic functions/classes
- Duplicate code across modules
- Hard-code configuration values
- Write tightly coupled modules

### Code Quality

**DO:**
- Add docstrings to all functions/classes
- Add inline comments for complex logic
- Use type hints for all functions
- Use meaningful variable/function names
- Use f-strings for string formatting
- Use list comprehensions/generator expressions
- Use dataclasses or pydantic for class definitions
- Make functions "pure" (no side effects, consistent output)
- Use context7 MCP

**DON'T:**
- Use ambiguous names
- Create deep nesting (>3 levels)
- Mix responsibilities in single function
- Ignore type hints

### Error Handling

**DO:**
- Implement structured, categorized exceptions
- Create custom error classes for specific conditions
- Use try-except blocks with meaningful messages
- Log errors with structured logging
- Capture relevant context/metadata in logs

**DON'T:**
- Use generic exceptions
- Swallow exceptions silently
- Expose internal error details to users

### API Standards

**Status Codes:**
- `200`: Successful GET
- `201`: Successful POST/PUT
- `400`: Business logic validation errors
- `401`: Missing/invalid authentication
- `403`: Insufficient permissions (admin required)
- `404`: Resource not found
- `422`: Request validation errors
- `500`: Server errors

### Performance & Security

**DO:**
- Optimize for performance after ensuring readability
- Validate/sanitize all user input
- Handle sensitive data securely
- Follow Python security best practices
- Document all dependencies in requirements file

**DON'T:**
- Optimize prematurely at expense of maintainability
- Trust user input without validation
- Log sensitive data

### Refactoring & Testing

**DO:**
- Refactor code while preserving functionality
- Write unit tests for new code
- Ensure code meets requirements
- Implement monitoring/logging for debugging

**DON'T:**
- Break existing functionality during refactoring
- Deploy without adequate testing

## 28. Front-end Coding Guidelines

PWA React/TypeScript application guidelines.

### React Principles

**DO:**
- Use functional components with hooks (`useState`, `useEffect`, custom hooks)
- Call hooks at top level only (no loops/conditionals)
- Apply SOLID principles (SRP, OCP, LSP, ISP, DIP)
- Break UI into small, focused components (container vs presentational)
- Organize by features/domains: `pages/`, `components/`, `hooks/`, `services/`
- Use composition over inheritance
- Use PascalCase for components, camelCase for variables/functions
- Use unique keys in lists
- Apply memoization only when needed (`React.memo`, `useMemo`, `useCallback`)
- Use `React.lazy` + `Suspense` for code splitting
- Use TypeScript for all props/state/API responses
- Use `import type` for type-only imports
- Treat props as immutable
- Follow the existing code style and conventions when modifying code
- Clean-up codes after modification (remove unused imports, variables, functions, comments, and unnecessary changes that were prooved to be not needed anymore)

**DON'T:**
- Use class components
- Call hooks conditionally
- Create monolithic components
- Organize by file types
- Modify props inside components
- Over-optimize with unnecessary memoization

### Architecture Patterns

**Structure:**
```
src/
├── pages/           ## Route-level components
├── components/      ## Reusable UI with domain folders
├── context/         ## React Context providers
├── hooks/           ## Custom business logic hooks  
├── services/        ## API communication layer
├── types/           ## TypeScript definitions
└── utils/           ## Pure utility functions
```

**State Management:**
- Use backend API calls over local state
- Use localStorage/sessionStorage only for UI state
- Use Context API for auth/global state
- Calculate derived values in components (don't store)

### Implementation Patterns

**Functional Components:**
```tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import type { Plan } from '../types/types';

export const MyComponent: React.FC<{ plan: Plan }> = ({ plan }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  return <div>{/* JSX */}</div>;
};
```

**TypeScript:**
- Strict type safety for all props/state/API
- Types centralized in `src/types/types.ts`
- Use generics for reusable components

**Material-UI + Tailwind:**
```tsx
import { Container, Paper, Typography } from '@mui/material';

<Container maxWidth="lg" className="p-4">
  <Paper className="p-6">
    <Typography variant="h4">Title</Typography>
  </Paper>
</Container>
```

**Authentication:**
```tsx
import { useAuth } from '../context/useAuth';

const MyComponent = () => {
  const { user, session, signOut } = useAuth();
  
  if (!user) return <div>Please log in</div>;
  // Authenticated content
};
```

**API Communication:**
```tsx
import { api } from '../services/api';

const handleApiCall = async () => {
  try {
    setLoading(true);
    const result = await api.createSimulation(data, token);
  } catch (error) {
    console.error('API Error:', error);
  } finally {
    setLoading(false);
  }
};
```

**Custom Hooks:**
```tsx
export const useSimulationActions = () => {
  const { session } = useAuth();
  
  const deleteSimulation = useCallback(async (id: string) => {
    if (!session?.access_token) throw new Error('No session');
    return await api.deleteSimulation(id, session.access_token);
  }, [session?.access_token]);
  
  return { deleteSimulation };
};
```

**Component Composition:**
```tsx
import SimulationTable from '../components/MainPage/SimulationTable';
import SummaryReport from '../components/MainPage/SummaryReport';

export const MainPage = () => (
  <Container>
    <SimulationTable onSelectionChange={handleSelection} />
    <SummaryReport data={summaryData} />
  </Container>
);
```

### PWA & Performance

**Service Worker:**
- PWA via `vite-plugin-pwa`
- NetworkFirst for APIs, StaleWhileRevalidate for assets
- Graceful offline degradation

**Code Splitting:**
```tsx
const AdminPolicyPage = React.lazy(() => import('./pages/AdminPolicyPage'));

<Suspense fallback={<div>Loading...</div>}>
  <AdminPolicyPage />
</Suspense>
```

**State Persistence:**
```tsx
import { getJSON, setJSON } from './utils/persist';

const [page, setPage] = useState<Page>(() => 
  getJSON<Page>('ui.page', 'whitelist')
);

const updatePage = (newPage: Page) => {
  setPage(newPage);
  setJSON('ui.page', newPage);
};
```

### Error Handling & UX

**DO:**
- Implement error boundaries
- Provide actionable error messages
- Show loading indicators for async operations
- Use skeleton loaders
- Handle empty states explicitly
- Design mobile-first
- Use `LandscapeEnforcer.tsx` where needed
- Use MUI responsive breakpoints

**DON'T:**
- Expose technical error details to users
- Leave async operations without feedback

### Security

**DO:**
- Let Supabase handle JWT management
- Use session objects from auth context
- Validate all user inputs before API calls
- Sanitize dynamic content
- Include Authorization headers in API calls
- Handle 401/403 responses properly
- Use HTTPS always
- Use HttpOnly cookies for sensitive tokens
- Enforce auth server-side
- Use short-lived JWTs + refresh tokens
- Set strict CSP headers
- Use React Error Boundaries
- Monitor with Sentry/Datadog

**DON'T:**
- Store tokens in localStorage manually
- Store sensitive data in React state/props/localStorage
- Put secrets in `.env` (frontend exposes them)
- Use `dangerouslySetInnerHTML` without DOMPurify
- Log sensitive info to console
- Use `eval`, `Function()`, or dynamic script execution
- Embed API keys/secrets in frontend code

**XSS Prevention:**
- React escapes JSX by default
- Validate/escape all external input (APIs, query params, localStorage)
- Sanitize with DOMPurify if using `dangerouslySetInnerHTML`

**API Security:**
- Always HTTPS
- Protect against CSRF (tokens or SameSite cookies)
- Validate backend responses before rendering

**Headers:**
```
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'none';
```

### UI/UX Design

**Visual Principles:**
- Material Design 3 (MD3) with MUI for React
- Mobile-first design
- CSS Grid + Container Queries for adaptive layouts

**Interaction:**
- Mobile: Bottom Tab Bar navigation
- Desktop/Tablet: Side Navigation Rail or header
- Use `transform` and `opacity` for GPU-accelerated animations
- Clear offline UI states with banners/toasts
- Custom "Add to Home Screen" prompt after engagement

**Implementation:**
```jsx
import { Box } from '@mui/material';
import MobileNavigation from './MobileNavigation';
import DesktopNavigation from './DesktopNavigation';
import useIsMobile from '../hooks/useIsMobile';

function AppShell({ children }) {
  const isMobile = useIsMobile();

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {isMobile ? <MobileNavigation /> : <DesktopNavigation />}
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        {children}
      </Box>
    </Box>
  );
}
```

**Libraries:**
- UI: @mui/material
- State: React Context + custom hooks
- PWA: workbox-precaching

## 29. Database Schema and RLS Policies

### admins

#### schema

```sql
create table public.admins (
  user_id uuid not null,
  created_at timestamp with time zone not null default now(),
  constraint admins_pkey primary key (user_id)
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create policy "Enable read access for all users"
on "public"."admins"
for select using (true);

create policy "Stories are live for a day"
on "public"."admins"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."admins"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);
```

### consent_records

#### schema

```sql
create table public.consent_records (
  id uuid not null default gen_random_uuid (),
  consent_type text not null,
  consent_version text not null,
  consent_given_at timestamp with time zone null default now(),
  ip_address text null,
  user_agent text null,
  user_hash text null,
  user_id uuid null,
  constraint consent_records_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

Enabled but no policies defined yet.

### notices

#### schema

```sql
create table public.notices (
  title text not null,
  content text not null,
  id uuid not null default gen_random_uuid (),
  pinned boolean null,
  published boolean null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  constraint notices_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create or replace function get_teams_for_user(user_id uuid)
returns setof bigint as $$
  select team_id from members where user_id = $1
$$ stable language sql security definer;

create policy "Team members can update team members if they belong to the team"
on members
for all using (
  team_id in (select get_teams_for_user(auth.uid()))
);

create policy "Enable read access for all users"
on "public"."notices"
for select using (true);

create policy "Stories are live for a day"
on "public"."notices"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."notices"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Enable read access for all users"
on "public"."notices"
for select using (true);

create policy "Stories are live for a day"
on "public"."notices"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."notices"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);
```

### phone_otps

#### schema

```sql
create table public.phone_otps (
  id uuid not null default gen_random_uuid (),
  phone text not null,
  code_hash text not null,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  attempts smallint not null default 0,
  used boolean not null default false,
  provider_msg_id text null,
  client_ip inet null,
  user_agent text null,
  constraint phone_otps_pkey primary key (id)
) TABLESPACE pg_default;
```

#### RLS policies

Enabled but no policies defined yet.

### privacy_policies

#### schema

```sql
create table public.privacy_policies (
  id uuid not null default gen_random_uuid (),
  version text not null,
  locale text not null default 'ko-KR'::text,
  content text not null,
  published boolean not null default false,
  effective_date date null,
  last_updated date not null default CURRENT_DATE,
  created_by text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint privacy_policies_pkey primary key (id)
) TABLESPACE pg_default;

create unique INDEX IF not exists privacy_policies_version_locale_uidx on public.privacy_policies using btree (version, locale) TABLESPACE pg_default;

create trigger privacy_policies_set_updated_at BEFORE
update on privacy_policies for EACH row
execute FUNCTION set_updated_at ();
```

#### RLS policies

Enabled but no policies defined yet.

### profiles

#### schema

```sql
create table public.profiles (
  id uuid not null,
  updated_at timestamp with time zone null,
  username text null,
  avatar_url text null,
  website text null,
  constraint profiles_pkey1 primary key (id),
  constraint username_length check ((char_length(username) >= 3))
) TABLESPACE pg_default;
```

#### RLS policies

```sql
create policy "Enable read access for all users"
on "public"."profiles"
for select using (true);

create policy "Stories are live for a day"
on "public"."profiles"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."profiles"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Members can update team details if they belong to the team"
on teams for update using (
  (select auth.uid()) in (
    select user_id from members where team_id = id
  )
);
```

### simulations

#### schema

```sql

create table public.simulations (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  plan_id text not null,
  starting_company_round smallint not null,
  simulation_rounds smallint not null,
  investments jsonb not null,
  simulation_results jsonb null,
  created_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  updated_at timestamp with time zone null default (now() AT TIME ZONE 'Asia/Seoul'::text),
  memo text null,
  sales_achievement_rates jsonb null,
  current_company_round smallint null,
  constraint profiles_pkey primary key (id)
) TABLESPACE pg_default;

create trigger update_profiles_updated_at BEFORE
update on simulations for EACH row
execute FUNCTION update_updated_at_column ();

```

#### RLS policies

```sql

create policy "Enable delete for users based on user_id"
on "public"."simulations"
for delete using (
  (select auth.uid()) = user_id
);

create policy "Enable insert for authenticated users only"
on "public"."simulations"
for insert to authenticated
with check (true);

create policy "Enable insert for users based on user_id"
on "public"."simulations"
for insert with check (
  (select auth.uid()) = user_id
);

create policy "Enable read access for all users"
on "public"."simulations"
for select using (true);

create policy "Stories are live for a day"
on "public"."simulations"
for select using (
  created_at > (current_timestamp - interval '1 day')
);

create policy "Enable users to view their own data only"
on "public"."simulations"
for select
to authenticated
using (
  (select auth.uid()) = user_id
);

create policy "Members can update team details if they belong to the team"
on teams for update using (
  (select auth.uid()) in (
    select user_id from members where team_id = id
  )
);
```

### whitelist

#### schema

```sql

create table public.whitelist (
  user_hash text not null,
  constraint whitelist_pkey primary key (user_hash)
) TABLESPACE pg_default;

```

#### RLS policies

Enabled but no policies defined yet.