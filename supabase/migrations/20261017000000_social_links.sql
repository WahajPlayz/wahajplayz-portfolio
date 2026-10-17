ALTER TABLE IF EXISTS public.support_config
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.support_config
SET social_links = COALESCE(social_links, '[]'::jsonb)
WHERE id = 1;
