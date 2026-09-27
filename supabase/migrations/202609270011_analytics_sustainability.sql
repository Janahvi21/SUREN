create table if not exists public.sustainability_records (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  resource_quantity numeric not null check (resource_quantity > 0),
  resource_unit text not null,
  estimated_waste_avoided numeric not null default 0,
  estimated_carbon_impact numeric not null default 0,
  calculation_method text not null default 'Demo estimate: quantity-based reuse proxy; not a scientific lifecycle assessment.',
  created_at timestamptz not null default now()
);

create index if not exists sustainability_records_transaction_id_idx on public.sustainability_records(transaction_id);
alter table public.sustainability_records enable row level security;

create policy "users see related sustainability records"
on public.sustainability_records for select
using (
  transaction_id in (
    select id from public.transactions
    where provider_id = public.current_profile_id()
       or seeker_id = public.current_profile_id()
  )
  or public.current_user_role() = 'ADMIN'
);

create or replace function public.record_transaction_sustainability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit text;
begin
  if new.status = 'COMPLETED' and (old.status is distinct from 'COMPLETED') then
    select unit into v_unit from public.resources where id = new.resource_id;
    insert into public.sustainability_records (
      transaction_id,
      resource_quantity,
      resource_unit,
      estimated_waste_avoided,
      estimated_carbon_impact
    ) values (
      new.id,
      new.quantity,
      coalesce(v_unit, 'units'),
      new.quantity,
      round((new.quantity * 0.8)::numeric, 2)
    ) on conflict (transaction_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_transaction_completed_sustainability on public.transactions;
create trigger on_transaction_completed_sustainability
after update on public.transactions
for each row execute procedure public.record_transaction_sustainability();
