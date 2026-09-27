create or replace function public.create_resource_request(
  p_resource_id uuid,
  p_quantity numeric,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id uuid;
  v_provider_id uuid;
  v_resource_title text;
  v_available_quantity numeric;
  v_status public.resource_status;
begin
  if public.current_user_role() <> 'SEEKER' then
    raise exception 'Only seekers can create resource requests';
  end if;

  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Requested quantity must be greater than zero';
  end if;

  select provider_id, title, quantity, status
    into v_provider_id, v_resource_title, v_available_quantity, v_status
  from public.resources
  where id = p_resource_id
  for update;

  if v_provider_id is null then
    raise exception 'Resource not found';
  end if;

  if v_status not in ('AVAILABLE', 'PARTIALLY_ALLOCATED') then
    raise exception 'Resource is not available';
  end if;

  if p_quantity > v_available_quantity then
    raise exception 'Requested quantity exceeds available quantity';
  end if;

  insert into public.requests (resource_id, seeker_id, quantity_requested, message)
  values (p_resource_id, public.current_profile_id(), p_quantity, nullif(trim(p_message), ''))
  returning id into v_request_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (
    v_provider_id,
    'New resource request',
    'A seeker requested ' || p_quantity || ' units of ' || v_resource_title || '.',
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
set search_path = public
as $$
declare
  v_request public.requests%rowtype;
  v_resource public.resources%rowtype;
  v_transaction_id uuid;
  v_remaining numeric;
  v_new_resource_status public.resource_status;
  v_provider_id uuid;
  v_seeker_id uuid;
begin
  if public.current_user_role() not in ('PROVIDER', 'ADMIN') then
    raise exception 'Only providers or admins can review requests';
  end if;

  if p_decision not in ('APPROVED', 'REJECTED') then
    raise exception 'Decision must be APPROVED or REJECTED';
  end if;

  select * into v_request
  from public.requests
  where id = p_request_id
  for update;

  if v_request.id is null then
    raise exception 'Request not found';
  end if;

  select * into v_resource
  from public.resources
  where id = v_request.resource_id
  for update;

  if v_resource.id is null then
    raise exception 'Resource not found';
  end if;

  if public.current_user_role() = 'PROVIDER' and v_resource.provider_id <> public.current_profile_id() then
    raise exception 'You cannot review this request';
  end if;

  if v_request.status <> 'PENDING' then
    raise exception 'This request has already been reviewed';
  end if;

  v_provider_id := v_resource.provider_id;
  v_seeker_id := v_request.seeker_id;

  if p_decision = 'REJECTED' then
    update public.requests
    set status = 'REJECTED', updated_at = now()
    where id = p_request_id;

    insert into public.notifications (user_id, title, message, type, related_id)
    values (v_seeker_id, 'Request rejected', 'Your request for ' || v_resource.title || ' was rejected.', 'REQUEST_REJECTED', p_request_id);
    return p_request_id;
  end if;

  if v_request.quantity_requested > v_resource.quantity then
    raise exception 'Available quantity changed; this request cannot be approved';
  end if;

  v_remaining := v_resource.quantity - v_request.quantity_requested;
  v_new_resource_status := case when v_remaining = 0 then 'COMPLETED' else 'PARTIALLY_ALLOCATED' end;

  update public.resources
  set quantity = v_remaining, status = v_new_resource_status, updated_at = now()
  where id = v_resource.id;

  update public.requests
  set status = 'APPROVED', updated_at = now()
  where id = p_request_id;

  insert into public.transactions (request_id, resource_id, provider_id, seeker_id, quantity, pickup_location, status)
  values (p_request_id, v_resource.id, v_provider_id, v_seeker_id, v_request.quantity_requested, v_resource.location, 'READY_FOR_PICKUP')
  returning id into v_transaction_id;

  insert into public.notifications (user_id, title, message, type, related_id)
  values (v_seeker_id, 'Request approved', 'Your request for ' || v_resource.title || ' is ready for pickup.', 'REQUEST_APPROVED', v_transaction_id);

  return v_transaction_id;
end;
$$;

revoke all on function public.create_resource_request(uuid, numeric, text) from public;
revoke all on function public.review_resource_request(uuid, public.request_status) from public;
grant execute on function public.create_resource_request(uuid, numeric, text) to authenticated;
grant execute on function public.review_resource_request(uuid, public.request_status) to authenticated;
