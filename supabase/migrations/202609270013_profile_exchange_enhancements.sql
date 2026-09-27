alter table public.profiles add column if not exists bio text;
alter table public.resources add column if not exists contact_phone text;
alter table public.resources add column if not exists exchange_type text not null default 'FREE';
alter table public.resources add column if not exists price numeric check (price is null or price >= 0);
alter table public.resources add column if not exists is_negotiable boolean not null default false;

alter table public.resources drop constraint if exists resources_exchange_type_check;
alter table public.resources add constraint resources_exchange_type_check check (exchange_type in ('FREE', 'PAID', 'NEGOTIABLE'));

insert into storage.buckets (id, name, public)
values ('profile-images', 'profile-images', true)
on conflict (id) do nothing;

create policy "profile images are publicly readable"
on storage.objects for select
using (bucket_id = 'profile-images');

create policy "users upload their profile images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update their profile images"
on storage.objects for update
to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete their profile images"
on storage.objects for delete
to authenticated
using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);
