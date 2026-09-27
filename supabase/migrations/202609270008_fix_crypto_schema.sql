create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.issue_transaction_qr(p_transaction_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_transaction public.transactions%rowtype;
  v_token text;
begin
  select * into v_transaction
  from public.transactions
  where id = p_transaction_id
  for update;

  if v_transaction.id is null then
    raise exception 'Transaction not found';
  end if;

  if public.current_profile_id() not in (v_transaction.provider_id, v_transaction.seeker_id)
    and public.current_user_role() <> 'ADMIN' then
    raise exception 'You are not authorized for this transaction';
  end if;

  if v_transaction.status <> 'READY_FOR_PICKUP' then
    raise exception 'QR is not available after verification or completion';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  update public.transactions
  set qr_token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
  where id = p_transaction_id;

  return v_token;
end;
$$;

create or replace function public.verify_transaction_qr(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_transaction public.transactions%rowtype;
  v_hash text;
begin
  if p_token is null or length(trim(p_token)) < 20 then
    raise exception 'Invalid QR token';
  end if;

  v_hash := encode(extensions.digest(trim(p_token), 'sha256'), 'hex');
  select * into v_transaction
  from public.transactions
  where qr_token_hash = v_hash
  for update;

  if v_transaction.id is null then
    raise exception 'QR token is invalid';
  end if;

  if public.current_profile_id() not in (v_transaction.provider_id, v_transaction.seeker_id)
    and public.current_user_role() <> 'ADMIN' then
    raise exception 'You are not authorized to verify this transaction';
  end if;

  if v_transaction.status <> 'READY_FOR_PICKUP' or v_transaction.qr_verified then
    raise exception 'Transaction is already verified or unavailable';
  end if;

  update public.transactions
  set qr_verified = true, verification_time = now(), status = 'VERIFIED'
  where id = v_transaction.id;

  return v_transaction.id;
end;
$$;

revoke all on function public.issue_transaction_qr(uuid) from public;
revoke all on function public.verify_transaction_qr(text) from public;
grant execute on function public.issue_transaction_qr(uuid) to authenticated;
grant execute on function public.verify_transaction_qr(text) to authenticated;
