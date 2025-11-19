## Database Schema and RLS Policies

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