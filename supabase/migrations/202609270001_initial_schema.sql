create extension if not exists "pgcrypto";

create type public.user_role as enum ('ADMIN', 'PROVIDER', 'SEEKER');
create type public.verification_status as enum ('PENDING', 'VERIFIED', 'REJECTED');
create type public.resource_status as enum ('AVAILABLE', 'RESERVED', 'PARTIALLY_ALLOCATED', 'COMPLETED', 'EXPIRED', 'CANCELLED');
create type public.request_status as enum ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', 'COMPLETED');
create type public.transaction_status as enum ('READY_FOR_PICKUP', 'VERIFIED', 'COMPLETED', 'CANCELLED');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'SEEKER',
  organization_name text,
  organization_type text,
  address text,
  city text,
  pincode text,
  latitude numeric,
  longitude numeric,
  profile_image text,
  verification_status public.verification_status not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resource_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now()
);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.resource_categories(id),
  title text not null,
  description text,
  quantity numeric not null check (quantity > 0),
  unit text not null,
  condition text,
  location text,
  city text,
  pincode text,
  latitude numeric,
  longitude numeric,
  available_from date,
  expiry_date date,
  image_url text,
  status public.resource_status not null default 'AVAILABLE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resources_expiry_after_start check (expiry_date is null or available_from is null or expiry_date >= available_from)
);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  quantity_requested numeric not null check (quantity_requested > 0),
  message text,
  status public.request_status not null default 'PENDING',
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.requests(id) on delete cascade,
  resource_id uuid not null references public.resources(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  seeker_id uuid not null references public.profiles(id) on delete cascade,
  quantity numeric not null check (quantity > 0),
  pickup_location text,
  pickup_date date,
  qr_token_hash text unique,
  qr_verified boolean not null default false,
  verification_time timestamptz,
  completed_at timestamptz,
  status public.transaction_status not null default 'READY_FOR_PICKUP',
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text,
  related_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index resources_provider_id_idx on public.resources(provider_id);
create index resources_category_id_idx on public.resources(category_id);
create index resources_status_idx on public.resources(status);
create index requests_resource_id_idx on public.requests(resource_id);
create index requests_seeker_id_idx on public.requests(seeker_id);
create index transactions_provider_id_idx on public.transactions(provider_id);
create index transactions_seeker_id_idx on public.transactions(seeker_id);
create index notifications_user_id_idx on public.notifications(user_id);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where auth_user_id = auth.uid();
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    case
      when new.raw_user_meta_data ->> 'role' = 'PROVIDER' then 'PROVIDER'::public.user_role
      else 'SEEKER'::public.user_role
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.resource_categories enable row level security;
alter table public.resources enable row level security;
alter table public.requests enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;

create policy "profiles are visible to their owner or admins"
on public.profiles for select
using (auth_user_id = auth.uid() or public.current_user_role() = 'ADMIN');

create policy "users can update their own profile"
on public.profiles for update
using (auth_user_id = auth.uid())
with check (auth_user_id = auth.uid());

create policy "categories are publicly readable"
on public.resource_categories for select
using (true);

create policy "admins manage categories"
on public.resource_categories for all
using (public.current_user_role() = 'ADMIN')
with check (public.current_user_role() = 'ADMIN');

create policy "available resources are publicly readable"
on public.resources for select
using (status in ('AVAILABLE', 'PARTIALLY_ALLOCATED') or provider_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "providers create their own resources"
on public.resources for insert
with check (provider_id = public.current_profile_id() and public.current_user_role() = 'PROVIDER');

create policy "providers update their own resources"
on public.resources for update
using (provider_id = public.current_profile_id() or public.current_user_role() = 'ADMIN')
with check (provider_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "providers delete their own resources"
on public.resources for delete
using (provider_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "seekers create their own requests"
on public.requests for insert
with check (seeker_id = public.current_profile_id() and public.current_user_role() = 'SEEKER');

create policy "users see related requests"
on public.requests for select
using (
  seeker_id = public.current_profile_id()
  or resource_id in (select id from public.resources where provider_id = public.current_profile_id())
  or public.current_user_role() = 'ADMIN'
);

create policy "providers review related requests"
on public.requests for update
using (resource_id in (select id from public.resources where provider_id = public.current_profile_id()) or public.current_user_role() = 'ADMIN')
with check (resource_id in (select id from public.resources where provider_id = public.current_profile_id()) or public.current_user_role() = 'ADMIN');

create policy "users see related transactions"
on public.transactions for select
using (provider_id = public.current_profile_id() or seeker_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "authorized users manage transactions"
on public.transactions for insert
with check (provider_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "authorized users update transactions"
on public.transactions for update
using (provider_id = public.current_profile_id() or seeker_id = public.current_profile_id() or public.current_user_role() = 'ADMIN')
with check (provider_id = public.current_profile_id() or seeker_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "users see their notifications"
on public.notifications for select
using (user_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

create policy "users update their notifications"
on public.notifications for update
using (user_id = public.current_profile_id() or public.current_user_role() = 'ADMIN')
with check (user_id = public.current_profile_id() or public.current_user_role() = 'ADMIN');

insert into public.resource_categories (name, description, icon)
values
  ('Food', 'Meals, pantry stock, and surplus essentials', 'leaf'),
  ('Clothes', 'Reusable garments and household items', 'shirt'),
  ('Books', 'Textbooks, learning resources, and libraries', 'book-open'),
  ('Furniture', 'Tables, chairs, and practical home goods', 'armchair'),
  ('Electronics', 'Working or repairable electronic equipment', 'cpu'),
  ('Construction Materials', 'Reusable building and renovation materials', 'hammer'),
  ('Other', 'Other reusable urban resources', 'package')
on conflict (name) do nothing;
