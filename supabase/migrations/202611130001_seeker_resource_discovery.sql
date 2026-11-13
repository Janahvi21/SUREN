alter table public.resources
  add column if not exists district text,
  add column if not exists pickup_instructions text;

alter table public.requests
  add column if not exists exchange_type_at_request text,
  add column if not exists price_per_unit_at_request numeric,
  add column if not exists unit_at_request text;

alter table public.requests
  add constraint requests_exchange_type_at_request_check
    check (exchange_type_at_request is null or exchange_type_at_request in ('FREE', 'PAID', 'NEGOTIABLE')),
  add constraint requests_price_per_unit_at_request_check
    check (price_per_unit_at_request is null or price_per_unit_at_request >= 0);

revoke select on public.resources from anon, authenticated;
grant select (
  id,
  provider_id,
  category_id,
  title,
  description,
  quantity,
  unit,
  condition,
  location,
  landmark,
  district,
  pickup_instructions,
  city,
  pincode,
  latitude,
  longitude,
  available_from,
  expiry_date,
  image_url,
  exchange_type,
  price,
  is_negotiable,
  status,
  created_at,
  updated_at
) on public.resources to authenticated;

drop policy if exists "available resources are publicly readable" on public.resources;
create policy "available resources are visible to authenticated users"
on public.resources for select
to authenticated
using (
  status in ('AVAILABLE', 'PARTIALLY_ALLOCATED')
  or provider_id = public.current_profile_id()
  or public.current_user_role() = 'ADMIN'
);

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
      r.status in ('AVAILABLE', 'PARTIALLY_ALLOCATED')
      or r.provider_id = public.current_profile_id()
      or public.current_user_role() = 'ADMIN'
    );
$$;

create or replace function public.create_resource_request(
  p_resource_id uuid,
  p_quantity numeric,
  p_message text,
  p_expected_exchange_type text,
  p_expected_price numeric,
  p_expected_unit text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_resource public.resources%rowtype;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'SEEKER' then
    raise exception 'Only seekers can create resource requests';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Requested quantity must be greater than zero';
  end if;

  select * into v_resource
  from public.resources
  where id = p_resource_id
  for update;

  if v_resource.id is null then
    raise exception 'Resource not found';
  end if;

  if v_resource.status not in ('AVAILABLE', 'PARTIALLY_ALLOCATED') then
    raise exception 'Resource is not available';
  end if;

  if p_quantity > v_resource.quantity then
    raise exception 'Requested quantity exceeds available quantity';
  end if;

  if p_expected_exchange_type is distinct from v_resource.exchange_type
    or p_expected_unit is distinct from v_resource.unit
    or (
      v_resource.exchange_type <> 'FREE'
      and p_expected_price is distinct from v_resource.price
    ) then
    raise exception 'Resource pricing changed. Review the current details before requesting';
  end if;

  insert into public.requests (
    resource_id,
    seeker_id,
    quantity_requested,
    message,
    exchange_type_at_request,
    price_per_unit_at_request,
    unit_at_request
  )
  values (
    p_resource_id,
    public.current_profile_id(),
    p_quantity,
    nullif(trim(p_message), ''),
    v_resource.exchange_type,
    case when v_resource.exchange_type = 'FREE' then null else v_resource.price end,
    v_resource.unit
  )
  returning id into v_request_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_resource.provider_id,
    'New resource request',
    'A seeker requested ' || p_quantity || ' units of ' || v_resource.title || '.',
    'REQUEST_CREATED',
    v_request_id
  );

  return v_request_id;
end;
$$;

create or replace function public.get_resource_contact_access(p_resource_id uuid)
returns table (
  is_authorized boolean,
  contact_phone text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (
      r.provider_id = public.current_profile_id()
      or public.current_user_role() = 'ADMIN'
      or exists (
        select 1
        from public.requests req
        where req.resource_id = r.id
          and req.seeker_id = public.current_profile_id()
          and req.status in ('APPROVED', 'COMPLETED')
      )
    ),
    case
      when r.provider_id = public.current_profile_id()
        or public.current_user_role() = 'ADMIN'
        or exists (
          select 1
          from public.requests req
          where req.resource_id = r.id
            and req.seeker_id = public.current_profile_id()
            and req.status in ('APPROVED', 'COMPLETED')
        )
      then r.contact_phone
      else null
    end
  from public.resources r
  where auth.uid() is not null
    and r.id = p_resource_id;
$$;

create or replace function public.cancel_resource_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_provider_id uuid;
  v_resource_title text;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'SEEKER' then
    raise exception 'Only seekers can cancel their requests';
  end if;

  select req.* into v_request
  from public.requests req
  where req.id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  if v_request.seeker_id <> public.current_profile_id() then
    raise exception 'You cannot cancel this request';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'Only pending requests can be cancelled';
  end if;

  select r.provider_id, r.title
    into v_provider_id, v_resource_title
  from public.resources r
  where r.id = v_request.resource_id;

  update public.requests
  set status = 'CANCELLED', updated_at = now()
  where id = p_request_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_provider_id,
    'Request cancelled',
    'A seeker cancelled their request for ' || v_resource_title || '.',
    'REQUEST_CANCELLED',
    p_request_id
  );

  return p_request_id;
end;
$$;

revoke all on function public.get_public_resource_providers(uuid[]) from public, anon;
revoke all on function public.create_resource_request(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.create_resource_request(uuid, numeric, text, text, numeric, text) from public, anon;
revoke all on function public.get_resource_contact_access(uuid) from public, anon;
revoke all on function public.cancel_resource_request(uuid) from public, anon;

grant execute on function public.get_public_resource_providers(uuid[]) to authenticated;
grant execute on function public.create_resource_request(uuid, numeric, text, text, numeric, text) to authenticated;
grant execute on function public.get_resource_contact_access(uuid) to authenticated;
grant execute on function public.cancel_resource_request(uuid) to authenticated;
