update public.resources
set
  latitude = 19.1148333,
  longitude = 72.8602159,
  updated_at = now()
where lower(coalesce(location, '')) like '%mahakali caves%'
  and lower(coalesce(city, '')) = 'mumbai'
  and pincode = '400093'
  and (latitude is null or abs(latitude - 19.04781507716664) < 0.01 or abs(longitude - 72.95204856687093) < 0.01);
