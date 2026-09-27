create table if not exists public.resource_images (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resources(id) on delete cascade,
  image_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists resource_images_resource_id_idx on public.resource_images(resource_id);

alter table public.resource_images enable row level security;

create policy "resource images are visible with their resources"
on public.resource_images for select
using (
  resource_id in (
    select id from public.resources
    where status in ('AVAILABLE', 'PARTIALLY_ALLOCATED')
      or provider_id = public.current_profile_id()
      or public.current_user_role() = 'ADMIN'
  )
);

create policy "providers manage their resource images"
on public.resource_images for all
using (
  resource_id in (select id from public.resources where provider_id = public.current_profile_id())
  or public.current_user_role() = 'ADMIN'
)
with check (
  resource_id in (select id from public.resources where provider_id = public.current_profile_id())
  or public.current_user_role() = 'ADMIN'
);

insert into storage.buckets (id, name, public)
values ('resource-images', 'resource-images', true)
on conflict (id) do nothing;

create policy "resource images are publicly readable"
on storage.objects for select
using (bucket_id = 'resource-images');

create policy "providers upload resource images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'resource-images'
  and public.current_user_role() in ('PROVIDER', 'ADMIN')
);

create policy "providers update resource images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'resource-images'
  and public.current_user_role() in ('PROVIDER', 'ADMIN')
)
with check (
  bucket_id = 'resource-images'
  and public.current_user_role() in ('PROVIDER', 'ADMIN')
);

create policy "providers delete resource images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'resource-images'
  and public.current_user_role() in ('PROVIDER', 'ADMIN')
);
