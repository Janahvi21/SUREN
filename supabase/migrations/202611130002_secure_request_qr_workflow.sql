create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.resources
  add column if not exists district text,
  add column if not exists pickup_instructions text,
  add column if not exists quantity_reserved numeric not null default 0;

alter table public.resources
  drop constraint if exists resources_quantity_reserved_check,
  add constraint resources_quantity_reserved_check
    check (quantity_reserved >= 0 and quantity_reserved <= quantity);

grant select (quantity_reserved) on public.resources to authenticated;

alter table public.requests
  add column if not exists provider_id uuid references public.profiles(id) on delete cascade,
  add column if not exists exchange_type_at_request text,
  add column if not exists price_per_unit_at_request numeric,
  add column if not exists total_price_at_request numeric,
  add column if not exists unit_at_request text,
  add column if not exists payment_status text,
  add column if not exists approved_at timestamptz,
  add column if not exists rejected_at timestamptz,
  add column if not exists completed_at timestamptz;

update public.requests req
set provider_id = r.provider_id,
    exchange_type_at_request = coalesce(req.exchange_type_at_request, r.exchange_type),
    price_per_unit_at_request = coalesce(req.price_per_unit_at_request, r.price),
    total_price_at_request = coalesce(
      req.total_price_at_request,
      case when r.exchange_type = 'FREE' then 0 else r.price * req.quantity_requested end
    ),
    unit_at_request = coalesce(req.unit_at_request, r.unit),
    payment_status = coalesce(
      req.payment_status,
      case when r.exchange_type = 'FREE' then 'NOT_APPLICABLE' else 'PAYMENT_PENDING' end
    ),
    approved_at = case when req.status = 'APPROVED' then coalesce(req.approved_at, req.updated_at) else req.approved_at end,
    rejected_at = case when req.status = 'REJECTED' then coalesce(req.rejected_at, req.updated_at) else req.rejected_at end,
    completed_at = case when req.status = 'COMPLETED' then coalesce(req.completed_at, req.updated_at) else req.completed_at end
from public.resources r
where r.id = req.resource_id;

alter table public.requests
  alter column provider_id set not null,
  alter column payment_status set default 'PAYMENT_PENDING',
  alter column payment_status set not null;

alter table public.requests
  drop constraint if exists requests_exchange_type_at_request_check,
  drop constraint if exists requests_price_per_unit_at_request_check,
  drop constraint if exists requests_total_price_at_request_check,
  drop constraint if exists requests_payment_status_check;

alter table public.requests
  add constraint requests_exchange_type_at_request_check
    check (exchange_type_at_request is null or exchange_type_at_request in ('FREE', 'PAID', 'NEGOTIABLE')),
  add constraint requests_price_per_unit_at_request_check
    check (price_per_unit_at_request is null or price_per_unit_at_request >= 0),
  add constraint requests_total_price_at_request_check
    check (total_price_at_request is null or total_price_at_request >= 0),
  add constraint requests_payment_status_check
    check (payment_status in ('NOT_APPLICABLE', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'REFUNDED'));

create index if not exists requests_provider_status_requested_idx
  on public.requests(provider_id, status, requested_at desc);
create index if not exists requests_seeker_requested_idx
  on public.requests(seeker_id, requested_at desc);

alter table public.transactions
  add column if not exists qr_token_expires_at timestamptz,
  add column if not exists verified_by uuid references public.profiles(id),
  add column if not exists reserved_quantity numeric not null default 0;

alter table public.transactions
  drop constraint if exists transactions_reserved_quantity_check,
  add constraint transactions_reserved_quantity_check check (reserved_quantity >= 0);

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

create or replace function public.list_resource_requests()
returns table (
  id uuid,
  resource_id uuid,
  seeker_id uuid,
  provider_id uuid,
  quantity_requested numeric,
  message text,
  status public.request_status,
  requested_at timestamptz,
  updated_at timestamptz,
  exchange_type_at_request text,
  price_per_unit_at_request numeric,
  total_price_at_request numeric,
  unit_at_request text,
  payment_status text,
  approved_at timestamptz,
  rejected_at timestamptz,
  completed_at timestamptz,
  seeker_name text,
  seeker_image text,
  provider_name text,
  provider_image text,
  resource_title text,
  resource_image text,
  resource_unit text,
  resource_city text,
  resource_location text,
  transaction_id uuid,
  transaction_status public.transaction_status,
  token_expires_at timestamptz,
  qr_verified boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    req.id,
    req.resource_id,
    req.seeker_id,
    req.provider_id,
    req.quantity_requested,
    req.message,
    req.status,
    req.requested_at,
    req.updated_at,
    req.exchange_type_at_request,
    req.price_per_unit_at_request,
    req.total_price_at_request,
    req.unit_at_request,
    req.payment_status,
    req.approved_at,
    req.rejected_at,
    req.completed_at,
    case
      when public.current_user_role() = 'PROVIDER'
        then coalesce(nullif(trim(seeker.organization_name), ''), seeker.full_name)
      else null
    end,
    case when public.current_user_role() = 'PROVIDER' then seeker.profile_image else null end,
    coalesce(nullif(trim(provider.organization_name), ''), provider.full_name),
    provider.profile_image,
    r.title,
    r.image_url,
    req.unit_at_request,
    r.city,
    r.location,
    txn.id,
    txn.status,
    txn.qr_token_expires_at,
    txn.qr_verified
  from public.requests req
  join public.resources r on r.id = req.resource_id
  join public.profiles provider on provider.id = req.provider_id
  join public.profiles seeker on seeker.id = req.seeker_id
  left join public.transactions txn on txn.request_id = req.id
  where auth.uid() is not null
    and (
      req.seeker_id = public.current_profile_id()
      or (public.current_user_role() = 'PROVIDER' and req.provider_id = public.current_profile_id())
      or public.current_user_role() = 'ADMIN'
    )
  order by req.requested_at desc;
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
  v_seeker_id uuid;
  v_seeker_name text;
  v_resource public.resources%rowtype;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'SEEKER' then
    raise exception 'Only authenticated seekers can create resource requests';
  end if;

  v_seeker_id := public.current_profile_id();
  if v_seeker_id is null then
    raise exception 'Seeker profile was not found';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Requested quantity must be greater than zero';
  end if;

  select * into v_resource
  from public.resources
  where id = p_resource_id
  for update;

  if not found then raise exception 'Resource not found'; end if;
  if v_resource.provider_id = v_seeker_id then raise exception 'You cannot request your own resource'; end if;
  if v_resource.status not in ('AVAILABLE', 'PARTIALLY_ALLOCATED') or v_resource.quantity <= 0 then
    raise exception 'Resource is no longer available';
  end if;
  if p_quantity > v_resource.quantity - v_resource.quantity_reserved then
    raise exception 'Requested quantity exceeds the available quantity';
  end if;
  if p_expected_exchange_type is distinct from v_resource.exchange_type
    or p_expected_unit is distinct from v_resource.unit
    or (v_resource.exchange_type <> 'FREE' and p_expected_price is distinct from v_resource.price) then
    raise exception 'Resource pricing or unit changed. Review the current details before requesting';
  end if;
  if v_resource.exchange_type = 'PAID' and (v_resource.price is null or v_resource.price <= 0) then
    raise exception 'Paid resource price is not specified';
  end if;
  if exists (
    select 1 from public.requests
    where resource_id = p_resource_id and seeker_id = v_seeker_id and status = 'PENDING'
  ) then
    raise exception 'You already have a pending request for this resource';
  end if;

  insert into public.requests (
    resource_id, seeker_id, provider_id, quantity_requested, message,
    exchange_type_at_request, price_per_unit_at_request, total_price_at_request,
    unit_at_request, payment_status
  )
  values (
    v_resource.id,
    v_seeker_id,
    v_resource.provider_id,
    p_quantity,
    nullif(trim(p_message), ''),
    v_resource.exchange_type,
    case when v_resource.exchange_type = 'FREE' then 0 else v_resource.price end,
    case when v_resource.exchange_type = 'FREE' then 0 else v_resource.price * p_quantity end,
    v_resource.unit,
    case when v_resource.exchange_type = 'FREE' then 'NOT_APPLICABLE' else 'PAYMENT_PENDING' end
  )
  returning id into v_request_id;

  select coalesce(nullif(trim(full_name), ''), 'A seeker')
    into v_seeker_name
  from public.profiles where id = v_seeker_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_resource.provider_id,
    'New resource request',
    v_seeker_name || ' requested ' || p_quantity || ' ' || v_resource.unit || ' of ' || v_resource.title || '.',
    'REQUEST_CREATED',
    v_request_id
  );

  return v_request_id;
end;
$$;

create or replace function public.review_resource_request(
  p_request_id uuid,
  p_decision public.request_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_resource public.resources%rowtype;
  v_provider public.profiles%rowtype;
  v_seeker_name text;
  v_transaction_id uuid;
  v_remaining numeric;
begin
  if auth.uid() is null or not coalesce(public.current_user_role() in ('PROVIDER', 'ADMIN'), false) then
    raise exception 'Only authenticated providers can review requests';
  end if;
  if p_decision is null or p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Decision must be APPROVED or REJECTED';
  end if;

  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if public.current_user_role() = 'PROVIDER' and v_request.provider_id <> public.current_profile_id() then
    raise exception 'You cannot review a request for another provider';
  end if;
  if v_request.status <> 'PENDING' then raise exception 'This request has already been reviewed'; end if;

  select * into v_resource from public.resources where id = v_request.resource_id for update;
  if not found then raise exception 'Resource not found'; end if;
  select * into v_provider from public.profiles where id = v_request.provider_id;
  select coalesce(nullif(trim(full_name), ''), 'The seeker')
    into v_seeker_name
  from public.profiles where id = v_request.seeker_id;

  if p_decision = 'REJECTED' then
    update public.requests
    set status = 'REJECTED', rejected_at = now(), updated_at = now()
    where id = p_request_id;
    insert into public.notifications (user_id, title, message, type, related_id)
    values (
      v_request.seeker_id,
      'Request rejected',
      'Your request for ' || v_resource.title || ' was rejected by the provider.',
      'REQUEST_REJECTED',
      p_request_id
    );
    return p_request_id;
  end if;

  if v_resource.status not in ('AVAILABLE', 'PARTIALLY_ALLOCATED')
    or v_request.quantity_requested > v_resource.quantity - v_resource.quantity_reserved then
    raise exception 'Available quantity changed; this request cannot be approved';
  end if;

  v_remaining := v_resource.quantity - v_resource.quantity_reserved - v_request.quantity_requested;
  update public.resources
  set quantity_reserved = quantity_reserved + v_request.quantity_requested,
      status = case when v_remaining = 0 then 'RESERVED'::public.resource_status
        else 'PARTIALLY_ALLOCATED'::public.resource_status end,
      updated_at = now()
  where id = v_resource.id;

  update public.requests
  set status = 'APPROVED', approved_at = now(), updated_at = now()
  where id = p_request_id;

  insert into public.transactions (
    request_id, resource_id, provider_id, seeker_id, quantity, reserved_quantity, pickup_location,
    qr_token_hash, qr_token_expires_at, status
  )
  values (
    p_request_id,
    v_resource.id,
    v_request.provider_id,
    v_request.seeker_id,
    v_request.quantity_requested,
    v_request.quantity_requested,
    v_resource.location,
    encode(extensions.digest(extensions.gen_random_bytes(32), 'sha256'), 'hex'),
    now() + interval '30 minutes',
    'READY_FOR_PICKUP'
  )
  returning id into v_transaction_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_request.seeker_id,
    'Request approved',
    'Congratulations! Your request for ' || v_resource.title || ' has been approved by '
      || coalesce(nullif(trim(v_provider.organization_name), ''), v_provider.full_name) || '.',
    'REQUEST_APPROVED',
    p_request_id
  );

  return v_transaction_id;
end;
$$;

create or replace function public.cancel_resource_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.requests%rowtype;
  v_resource_title text;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'SEEKER' then
    raise exception 'Only authenticated seekers can cancel requests';
  end if;

  select * into v_request from public.requests where id = p_request_id for update;
  if not found then raise exception 'Request not found'; end if;
  if v_request.seeker_id <> public.current_profile_id() then
    raise exception 'You cannot cancel this request';
  end if;
  if v_request.status <> 'PENDING' then
    raise exception 'Only pending requests can be cancelled';
  end if;

  select title into v_resource_title from public.resources where id = v_request.resource_id;
  update public.requests set status = 'CANCELLED', updated_at = now() where id = p_request_id;
  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_request.provider_id,
    'Request cancelled',
    'A seeker cancelled their request for ' || coalesce(v_resource_title, 'a resource') || '.',
    'REQUEST_CANCELLED',
    p_request_id
  );
  return p_request_id;
end;
$$;

drop function if exists public.issue_transaction_qr(uuid);
create function public.issue_transaction_qr(p_transaction_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_request_status public.request_status;
  v_token text;
  v_expires_at timestamptz;
begin
  if auth.uid() is null or public.current_user_role() is distinct from 'SEEKER' then
    raise exception 'Only the requesting seeker can retrieve the pickup QR';
  end if;

  select * into v_transaction from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_transaction.seeker_id <> public.current_profile_id() then
    raise exception 'You are not authorized to retrieve this QR';
  end if;
  if v_transaction.status <> 'READY_FOR_PICKUP' then
    raise exception 'QR is available only for an approved request awaiting pickup';
  end if;
  select status into v_request_status
  from public.requests
  where id = v_transaction.request_id and seeker_id = v_transaction.seeker_id;
  if v_request_status is distinct from 'APPROVED' then
    raise exception 'QR is available only for an approved request awaiting pickup';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires_at := now() + interval '30 minutes';
  update public.transactions
  set qr_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex'),
      qr_token_expires_at = v_expires_at,
      qr_verified = false,
      verification_time = null,
      verified_by = null
  where id = p_transaction_id;

  return jsonb_build_object('token', v_token, 'expires_at', v_expires_at);
end;
$$;

drop function if exists public.verify_transaction_qr(text);
create function public.verify_transaction_qr(p_token text)
returns table (
  transaction_id uuid,
  request_id uuid,
  seeker_name text,
  seeker_image text,
  resource_title text,
  resource_image text,
  quantity numeric,
  unit text,
  provider_name text,
  request_status public.request_status,
  token_expires_at timestamptz,
  exchange_type text,
  total_price numeric,
  payment_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_request public.requests%rowtype;
  v_resource public.resources%rowtype;
  v_seeker public.profiles%rowtype;
  v_provider public.profiles%rowtype;
begin
  if auth.uid() is null or not coalesce(public.current_user_role() in ('PROVIDER', 'ADMIN'), false) then
    raise exception 'Only the resource provider can verify a pickup QR';
  end if;
  if p_token is null or length(trim(p_token)) < 20 then raise exception 'Invalid QR token'; end if;

  select * into v_transaction
  from public.transactions
  where qr_token_hash = encode(extensions.digest(trim(p_token), 'sha256'), 'hex')
  for update;
  if not found then raise exception 'QR token is invalid or has already been used'; end if;
  if public.current_user_role() = 'PROVIDER' and v_transaction.provider_id <> public.current_profile_id() then
    raise exception 'This QR belongs to another provider';
  end if;
  if v_transaction.qr_token_expires_at is null or v_transaction.qr_token_expires_at <= now() then
    raise exception 'QR token has expired. Ask the seeker to refresh their pickup QR';
  end if;
  if v_transaction.status <> 'READY_FOR_PICKUP' or v_transaction.qr_verified then
    raise exception 'QR token has already been used or the request is no longer available';
  end if;

  select * into v_request from public.requests where id = v_transaction.request_id;
  select * into v_resource from public.resources where id = v_transaction.resource_id;
  select * into v_seeker from public.profiles where id = v_transaction.seeker_id;
  select * into v_provider from public.profiles where id = v_transaction.provider_id;
  if v_request.status <> 'APPROVED' then raise exception 'The request is not approved'; end if;

  update public.transactions
  set qr_verified = true, verification_time = now(), verified_by = public.current_profile_id(), status = 'VERIFIED'
  where id = v_transaction.id;

  return query select
    v_transaction.id,
    v_transaction.request_id,
    coalesce(nullif(trim(v_seeker.full_name), ''), 'Seeker'),
    v_seeker.profile_image,
    v_resource.title,
    v_resource.image_url,
    v_transaction.quantity,
    v_request.unit_at_request,
    coalesce(nullif(trim(v_provider.organization_name), ''), v_provider.full_name),
    v_request.status,
    v_transaction.qr_token_expires_at,
    v_request.exchange_type_at_request,
    v_request.total_price_at_request,
    v_request.payment_status;
end;
$$;

create or replace function public.complete_transaction(p_transaction_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_transaction public.transactions%rowtype;
  v_request public.requests%rowtype;
  v_resource_title text;
begin
  if auth.uid() is null or not coalesce(public.current_user_role() in ('PROVIDER', 'ADMIN'), false) then
    raise exception 'Only the resource provider can confirm handover';
  end if;

  select * into v_transaction from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if public.current_user_role() = 'PROVIDER' and v_transaction.provider_id <> public.current_profile_id() then
    raise exception 'You cannot complete another provider''s transaction';
  end if;
  if v_transaction.status <> 'VERIFIED' or not v_transaction.qr_verified then
    raise exception 'Verify the active pickup QR before confirming handover';
  end if;

  select * into v_request from public.requests where id = v_transaction.request_id for update;
  if v_request.status <> 'APPROVED' then raise exception 'The request is no longer approved'; end if;
  select title into v_resource_title from public.resources where id = v_transaction.resource_id;

  update public.transactions
  set status = 'COMPLETED', completed_at = now(), reserved_quantity = 0
  where id = v_transaction.id;
  update public.requests
  set status = 'COMPLETED', completed_at = now(), updated_at = now()
  where id = v_request.id;
  if v_transaction.reserved_quantity > 0 then
    update public.resources r
    set quantity = r.quantity - v_transaction.reserved_quantity,
        quantity_reserved = r.quantity_reserved - v_transaction.reserved_quantity,
        status = case
          when r.quantity - v_transaction.reserved_quantity = 0
            then 'COMPLETED'::public.resource_status
          when r.quantity_reserved - v_transaction.reserved_quantity = 0
            then 'AVAILABLE'::public.resource_status
          when r.quantity - v_transaction.reserved_quantity <= r.quantity_reserved - v_transaction.reserved_quantity
            then 'RESERVED'::public.resource_status
          else 'PARTIALLY_ALLOCATED'::public.resource_status
        end,
        updated_at = now()
    where r.id = v_transaction.resource_id
      and r.quantity_reserved >= v_transaction.reserved_quantity
      and r.quantity >= v_transaction.reserved_quantity;
    if not found then raise exception 'Reserved resource quantity could not be finalized'; end if;
  end if;
  insert into public.notifications (user_id, title, message, type, related_id)
  values
    (
      v_transaction.seeker_id,
      'Resource handover completed',
      'Your request for ' || coalesce(v_resource_title, 'the resource') || ' has been successfully handed over.',
      'TRANSACTION_COMPLETED',
      v_request.id
    ),
    (
      v_transaction.provider_id,
      'Resource handover completed',
      'The handover for ' || coalesce(v_resource_title, 'the resource') || ' was completed.',
      'TRANSACTION_COMPLETED',
      v_request.id
    );

  return v_transaction.id;
end;
$$;

revoke all on function public.get_public_resource_providers(uuid[]) from public, anon;
revoke all on function public.list_resource_requests() from public, anon;
revoke all on function public.create_resource_request(uuid, numeric, text) from public, anon, authenticated;
revoke all on function public.create_resource_request(uuid, numeric, text, text, numeric, text) from public, anon;
revoke all on function public.review_resource_request(uuid, public.request_status) from public, anon;
revoke all on function public.cancel_resource_request(uuid) from public, anon;
revoke all on function public.issue_transaction_qr(uuid) from public, anon;
revoke all on function public.verify_transaction_qr(text) from public, anon;
revoke all on function public.complete_transaction(uuid) from public, anon;

grant execute on function public.get_public_resource_providers(uuid[]) to authenticated;
grant execute on function public.list_resource_requests() to authenticated;
grant execute on function public.create_resource_request(uuid, numeric, text, text, numeric, text) to authenticated;
grant execute on function public.review_resource_request(uuid, public.request_status) to authenticated;
grant execute on function public.cancel_resource_request(uuid) to authenticated;
grant execute on function public.issue_transaction_qr(uuid) to authenticated;
grant execute on function public.verify_transaction_qr(text) to authenticated;
grant execute on function public.complete_transaction(uuid) to authenticated;

revoke insert, update, delete on public.requests from anon, authenticated;
revoke insert, update, delete on public.transactions from anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'requests'
  ) is false then
    alter publication supabase_realtime add table public.requests;
  end if;
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) is false then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
