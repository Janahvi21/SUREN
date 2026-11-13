create or replace function public.get_public_resource_providers(p_resource_ids uuid[])
returns table (
  resource_id uuid,
  id uuid,
  display_name text,
  profile_image text,
  verification_status public.verification_status
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    p.id,
    coalesce(nullif(trim(p.organization_name), ''), p.full_name),
    p.profile_image,
    p.verification_status
  from public.resources r
  join public.profiles p on p.id = r.provider_id
  where auth.uid() is not null
    and r.id = any(coalesce(p_resource_ids, '{}'::uuid[]))
    and (
      r.status in ('AVAILABLE', 'PARTIALLY_ALLOCATED', 'RESERVED', 'COMPLETED')
      or r.provider_id = public.current_profile_id()
      or public.current_user_role() = 'ADMIN'
      or exists (
        select 1
        from public.requests req
        where req.resource_id = r.id
          and req.seeker_id = public.current_profile_id()
      )
    );
$$;
