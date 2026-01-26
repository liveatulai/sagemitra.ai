-- Fix 1: Create atomic upvote function to prevent race conditions
CREATE OR REPLACE FUNCTION public.toggle_feedback_upvote(p_feedback_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_new_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Check if upvote exists
  SELECT id INTO v_existing_id
  FROM feedback_upvotes
  WHERE feedback_id = p_feedback_id AND user_id = v_user_id;

  IF v_existing_id IS NOT NULL THEN
    -- Remove upvote
    DELETE FROM feedback_upvotes WHERE id = v_existing_id;
    
    -- Atomically decrement count
    UPDATE user_feedback
    SET upvotes = GREATEST(0, COALESCE(upvotes, 0) - 1)
    WHERE id = p_feedback_id
    RETURNING upvotes INTO v_new_count;
    
    RETURN jsonb_build_object('success', true, 'action', 'removed', 'upvotes', v_new_count);
  ELSE
    -- Add upvote
    INSERT INTO feedback_upvotes (feedback_id, user_id)
    VALUES (p_feedback_id, v_user_id);
    
    -- Atomically increment count
    UPDATE user_feedback
    SET upvotes = COALESCE(upvotes, 0) + 1
    WHERE id = p_feedback_id
    RETURNING upvotes INTO v_new_count;
    
    RETURN jsonb_build_object('success', true, 'action', 'added', 'upvotes', v_new_count);
  END IF;
END;
$$;

-- Fix 2: Create a view for public feedback that doesn't expose user identity
CREATE OR REPLACE VIEW public.public_feedback AS
SELECT 
  f.id,
  f.title,
  f.message,
  f.type,
  f.status,
  f.upvotes,
  f.created_at,
  -- Only show "Anonymous" for privacy
  'Community Member' as author_display
FROM user_feedback f;

-- Grant access to the view
GRANT SELECT ON public.public_feedback TO authenticated;
GRANT SELECT ON public.public_feedback TO anon;