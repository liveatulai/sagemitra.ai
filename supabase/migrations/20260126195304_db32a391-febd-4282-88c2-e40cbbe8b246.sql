-- Fix overly permissive RLS policies that use USING(true) or WITH CHECK(true)
-- These allow any authenticated user to manipulate system-managed data

-- 1. Fix user_milestones - Remove permissive INSERT policy
-- The check_and_award_milestone() function uses SECURITY DEFINER, so it bypasses RLS
DROP POLICY IF EXISTS "System can insert milestones" ON public.user_milestones;

-- Create a restrictive policy - only admins can insert directly
-- (SECURITY DEFINER functions bypass RLS anyway)
CREATE POLICY "Admins can insert milestones" 
ON public.user_milestones 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Fix mood_logs - Remove permissive INSERT policy
-- Edge functions use service role which bypasses RLS
DROP POLICY IF EXISTS "System can insert mood logs" ON public.mood_logs;

-- Create a restrictive policy - only admins can insert directly
CREATE POLICY "Admins can insert mood logs" 
ON public.mood_logs 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Fix avatar_analytics - Remove permissive ALL policy
-- System operations use service role which bypasses RLS
DROP POLICY IF EXISTS "System can update analytics" ON public.avatar_analytics;

-- Create separate restrictive policies for admin management
CREATE POLICY "Admins can insert analytics" 
ON public.avatar_analytics 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update analytics" 
ON public.avatar_analytics 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete analytics" 
ON public.avatar_analytics 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));