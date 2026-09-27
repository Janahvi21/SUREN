create or replace function public.issue_transaction_qr(p_transaction_id uuid)
returns text
language plpgsql
security definer
set search_path = public
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

  v_token := encode(gen_random_bytes(32), 'hex');
  update public.transactions
  set qr_token_hash = encode(digest(v_token, 'sha256'), 'hex')
  where id = p_transaction_id;

  return v_token;
end;
$$;

revoke all on function public.issue_transaction_qr(uuid) from public;
grant execute on function public.issue_transaction_qr(uuid) to authenticated;
