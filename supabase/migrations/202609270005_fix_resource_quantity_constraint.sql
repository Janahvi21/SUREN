ALTER TABLE public.resources
DROP CONSTRAINT IF EXISTS resources_quantity_check;

ALTER TABLE public.resources
ADD CONSTRAINT resources_quantity_check
CHECK (quantity >= 0);