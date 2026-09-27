alter table public.resources
  add column if not exists landmark text;

comment on column public.resources.location is 'Human-readable pickup address; latitude and longitude are system-generated map coordinates.';
comment on column public.resources.landmark is 'Optional pickup landmark or nearby reference point.';
