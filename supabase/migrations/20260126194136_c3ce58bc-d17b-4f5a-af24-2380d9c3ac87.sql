-- Fix the SECURITY DEFINER view issue by recreating as INVOKER (default)
DROP VIEW IF EXISTS public.public_feedback;

CREATE VIEW public.public_feedback 
WITH (security_invoker = true)
AS
SELECT 
  f.id,
  f.title,
  f.message,
  f.type,
  f.status,
  f.upvotes,
  f.created_at,
  'Community Member' as author_display
FROM user_feedback f;

-- Grant access to the view
GRANT SELECT ON public.public_feedback TO authenticated;
GRANT SELECT ON public.public_feedback TO anon;