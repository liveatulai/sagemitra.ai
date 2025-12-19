CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'moderator',
    'user'
);


--
-- Name: adjust_user_credits(uuid, integer, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.adjust_user_credits(p_user_id uuid, p_amount integer, p_description text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_new_balance integer;
  v_old_balance integer;
BEGIN
  -- Ensure credits record exists (upsert pattern)
  INSERT INTO credits (user_id, balance)
  VALUES (p_user_id, 0)
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Get current balance with row lock to prevent race conditions
  SELECT balance INTO v_old_balance
  FROM credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Calculate new balance and prevent negative
  v_new_balance := GREATEST(0, v_old_balance + p_amount);
  
  -- If deducting, ensure sufficient balance
  IF p_amount < 0 AND v_old_balance + p_amount < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient credits',
      'balance', v_old_balance
    );
  END IF;
  
  -- Update credits atomically
  UPDATE credits
  SET 
    balance = v_new_balance,
    spent = CASE WHEN p_amount < 0 THEN spent + ABS(p_amount) ELSE spent END,
    earned_from_referral = CASE 
      WHEN p_description LIKE '%referral%' AND p_amount > 0 
      THEN earned_from_referral + p_amount 
      ELSE earned_from_referral 
    END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create audit trail with correct type values
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (
    p_user_id, 
    p_amount, 
    CASE WHEN p_amount > 0 THEN 'earned' ELSE 'spent' END,
    p_description
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'balance', v_new_balance,
    'old_balance', v_old_balance
  );
END;
$$;


--
-- Name: check_and_award_milestone(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_award_milestone(p_user_id uuid, p_milestone_type text, p_reward_credits integer) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_already_achieved BOOLEAN;
BEGIN
  -- Check if milestone already achieved
  SELECT EXISTS(
    SELECT 1 FROM user_milestones 
    WHERE user_id = p_user_id AND milestone_type = p_milestone_type
  ) INTO v_already_achieved;
  
  -- If not achieved, award it
  IF NOT v_already_achieved THEN
    -- Insert milestone
    INSERT INTO user_milestones (user_id, milestone_type, reward_credits)
    VALUES (p_user_id, p_milestone_type, p_reward_credits);
    
    -- Award credits
    PERFORM adjust_user_credits(
      p_user_id,
      p_reward_credits,
      'Milestone reward: ' || p_milestone_type
    );
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;


--
-- Name: check_avatar_milestones(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_avatar_milestones() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_avatar_count INTEGER;
BEGIN
  -- Count user's avatars
  SELECT COUNT(*) INTO v_avatar_count
  FROM user_avatars
  WHERE user_id = NEW.user_id AND deleted_at IS NULL;
  
  -- Award milestones
  IF v_avatar_count = 1 THEN
    PERFORM check_and_award_milestone(NEW.user_id, 'first_avatar', 5);
  ELSIF v_avatar_count = 5 THEN
    PERFORM check_and_award_milestone(NEW.user_id, 'five_avatars', 25);
  ELSIF v_avatar_count = 10 THEN
    PERFORM check_and_award_milestone(NEW.user_id, 'ten_avatars', 50);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: check_first_chat_milestone(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_first_chat_milestone() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_message_count INTEGER;
  v_session_user_id UUID;
BEGIN
  -- Get user_id from session
  SELECT user_id INTO v_session_user_id
  FROM chat_sessions
  WHERE id = NEW.session_id;
  
  -- Count messages from this user
  SELECT COUNT(*) INTO v_message_count
  FROM chat_messages cm
  JOIN chat_sessions cs ON cm.session_id = cs.id
  WHERE cs.user_id = v_session_user_id AND cm.role = 'user';
  
  -- Award milestone if this is their first message
  IF v_message_count = 1 THEN
    PERFORM check_and_award_milestone(v_session_user_id, 'first_chat', 10);
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: get_public_leaderboard(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_leaderboard() RETURNS TABLE(display_name text, earned_from_referral integer, referral_count bigint)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    COALESCE(p.leaderboard_display_name, 'Anonymous') as display_name,
    c.earned_from_referral,
    (SELECT COUNT(*) FROM public.referrals WHERE referrals.referrer_id = c.user_id) as referral_count
  FROM public.credits c
  JOIN public.profiles p ON c.user_id = p.id
  WHERE c.earned_from_referral > 0
    AND p.show_on_leaderboard = true
  ORDER BY c.earned_from_referral DESC
  LIMIT 100;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_credits(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_credits() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 100) -- Start with 100 free credits
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


SET default_table_access_method = heap;

--
-- Name: avatar_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatar_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    avatar_id uuid NOT NULL,
    total_chats integer DEFAULT 0,
    avg_session_length numeric(10,2) DEFAULT 0,
    avg_likes numeric(10,2) DEFAULT 0,
    retention_rate numeric(5,2) DEFAULT 0,
    top_emotions jsonb DEFAULT '[]'::jsonb,
    sentiment_ratio jsonb DEFAULT '{"neutral": 0, "negative": 0, "positive": 0}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: avatar_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatar_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    avatar_id uuid NOT NULL,
    session_id uuid,
    memory_summary text NOT NULL,
    emotional_context text,
    message_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    description text,
    image_url text,
    personality_prompt text NOT NULL,
    voice_id text,
    created_at timestamp with time zone DEFAULT now(),
    category text DEFAULT 'sage'::text NOT NULL,
    persona_profile jsonb,
    needs_image_regeneration boolean DEFAULT false,
    is_optimized boolean DEFAULT false,
    image_source text DEFAULT 'default'::text,
    is_active boolean DEFAULT true,
    strength text,
    updated_at timestamp with time zone DEFAULT now(),
    tags text[] DEFAULT '{}'::text[],
    knowledge_base text,
    user_id uuid,
    deleted_at timestamp with time zone,
    personality_evolution jsonb DEFAULT '{"humor": 0.5, "empathy": 0.5, "curiosity": 0.5, "formality": 0.5}'::jsonb,
    growth_metrics jsonb DEFAULT '{"positive_ratio": 0, "total_reactions": 0, "topics_discussed": []}'::jsonb,
    voice_sample_url text,
    custom_voice_id text,
    voice_provider text DEFAULT 'default'::text
);


--
-- Name: chat_follow_up_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_follow_up_suggestions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    suggestion text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    reactions jsonb DEFAULT '[]'::jsonb,
    reply_to uuid,
    reply_preview text,
    CONSTRAINT chat_messages_role_check CHECK ((role = ANY (ARRAY['user'::text, 'assistant'::text])))
);


--
-- Name: chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    avatar_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    user_id uuid NOT NULL,
    CONSTRAINT chat_sessions_avatar_id_check CHECK ((avatar_id IS NOT NULL))
);


--
-- Name: credit_packages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    credits integer NOT NULL,
    price_usd numeric(10,2) NOT NULL,
    is_popular boolean DEFAULT false,
    features text[] DEFAULT '{}'::text[],
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: credit_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_notes text,
    processed_by uuid,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT credit_requests_amount_check CHECK (((amount > 0) AND (amount <= 10000))),
    CONSTRAINT credit_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: credit_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    amount integer NOT NULL,
    type text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT credit_transactions_type_check CHECK ((type = ANY (ARRAY['earned'::text, 'spent'::text, 'refund'::text, 'purchase'::text])))
);


--
-- Name: credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    balance integer DEFAULT 0,
    earned_from_referral integer DEFAULT 0,
    spent integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: feature_bids; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_bids (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    user_id uuid NOT NULL,
    bid_credits integer NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feature_bids_bid_credits_check CHECK ((bid_credits > 0))
);


--
-- Name: feedback_upvotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback_upvotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feedback_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: mood_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mood_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    message_id uuid NOT NULL,
    detected_mood text NOT NULL,
    sentiment_score numeric(3,2),
    keywords text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: pricing_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    price_usd numeric(10,2) NOT NULL,
    monthly_credits integer NOT NULL,
    stripe_price_id text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    onboarding_completed boolean DEFAULT false,
    preferred_vibe text,
    first_avatar_id uuid,
    show_on_leaderboard boolean DEFAULT false,
    leaderboard_display_name text
);


--
-- Name: referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referrer_id uuid NOT NULL,
    referred_id uuid NOT NULL,
    reward_credits integer DEFAULT 50,
    rewarded boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    title text NOT NULL,
    description text,
    category text DEFAULT 'custom'::text NOT NULL,
    image_url text,
    personality_prompt text NOT NULL,
    persona_profile jsonb DEFAULT '{}'::jsonb NOT NULL,
    knowledge_base text,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_optimized boolean DEFAULT false,
    image_source text DEFAULT 'upload'::text,
    deleted_at timestamp with time zone,
    custom_category text,
    tags text[] DEFAULT '{}'::text[],
    strength text,
    is_active boolean DEFAULT true,
    personality_evolution jsonb DEFAULT '{"humor": 0.5, "empathy": 0.5, "curiosity": 0.5, "formality": 0.5}'::jsonb,
    growth_metrics jsonb DEFAULT '{"positive_ratio": 0, "total_reactions": 0, "topics_discussed": []}'::jsonb,
    voice_sample_url text,
    custom_voice_id text,
    voice_provider text DEFAULT 'default'::text
);


--
-- Name: user_favorite_avatars; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_favorite_avatars (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    avatar_id uuid NOT NULL,
    avatar_type text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_favorite_avatars_avatar_type_check CHECK ((avatar_type = ANY (ARRAY['default'::text, 'custom'::text])))
);


--
-- Name: user_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    upvotes integer DEFAULT 0,
    status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_feedback_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'planned'::text, 'in_progress'::text, 'completed'::text]))),
    CONSTRAINT user_feedback_type_check CHECK ((type = ANY (ARRAY['feedback'::text, 'feature'::text, 'bug'::text])))
);


--
-- Name: user_milestones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    milestone_type text NOT NULL,
    achieved_at timestamp with time zone DEFAULT now(),
    reward_credits integer DEFAULT 0 NOT NULL
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    plan_id uuid,
    stripe_customer_id text,
    stripe_subscription_id text,
    status text DEFAULT 'inactive'::text,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'canceled'::text, 'past_due'::text])))
);


--
-- Name: avatar_analytics avatar_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_analytics
    ADD CONSTRAINT avatar_analytics_pkey PRIMARY KEY (id);


--
-- Name: avatar_memory avatar_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_memory
    ADD CONSTRAINT avatar_memory_pkey PRIMARY KEY (id);


--
-- Name: avatars avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatars
    ADD CONSTRAINT avatars_pkey PRIMARY KEY (id);


--
-- Name: chat_follow_up_suggestions chat_follow_up_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_follow_up_suggestions
    ADD CONSTRAINT chat_follow_up_suggestions_pkey PRIMARY KEY (id);


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chat_sessions chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: credit_packages credit_packages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_packages
    ADD CONSTRAINT credit_packages_pkey PRIMARY KEY (id);


--
-- Name: credit_requests credit_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_requests
    ADD CONSTRAINT credit_requests_pkey PRIMARY KEY (id);


--
-- Name: credit_transactions credit_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);


--
-- Name: credits credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_pkey PRIMARY KEY (id);


--
-- Name: credits credits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_user_id_key UNIQUE (user_id);


--
-- Name: feature_bids feature_bids_feedback_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_bids
    ADD CONSTRAINT feature_bids_feedback_id_user_id_key UNIQUE (feedback_id, user_id);


--
-- Name: feature_bids feature_bids_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_bids
    ADD CONSTRAINT feature_bids_pkey PRIMARY KEY (id);


--
-- Name: feedback_upvotes feedback_upvotes_feedback_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_upvotes
    ADD CONSTRAINT feedback_upvotes_feedback_id_user_id_key UNIQUE (feedback_id, user_id);


--
-- Name: feedback_upvotes feedback_upvotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_upvotes
    ADD CONSTRAINT feedback_upvotes_pkey PRIMARY KEY (id);


--
-- Name: mood_logs mood_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_logs
    ADD CONSTRAINT mood_logs_pkey PRIMARY KEY (id);


--
-- Name: pricing_plans pricing_plans_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_plans
    ADD CONSTRAINT pricing_plans_name_key UNIQUE (name);


--
-- Name: pricing_plans pricing_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_plans
    ADD CONSTRAINT pricing_plans_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_pkey PRIMARY KEY (id);


--
-- Name: referrals referrals_referrer_id_referred_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_referred_id_key UNIQUE (referrer_id, referred_id);


--
-- Name: user_avatars user_avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT user_avatars_pkey PRIMARY KEY (id);


--
-- Name: user_favorite_avatars user_favorite_avatars_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_avatars
    ADD CONSTRAINT user_favorite_avatars_pkey PRIMARY KEY (id);


--
-- Name: user_favorite_avatars user_favorite_avatars_user_id_avatar_id_avatar_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_avatars
    ADD CONSTRAINT user_favorite_avatars_user_id_avatar_id_avatar_type_key UNIQUE (user_id, avatar_id, avatar_type);


--
-- Name: user_feedback user_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_pkey PRIMARY KEY (id);


--
-- Name: user_milestones user_milestones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_milestones
    ADD CONSTRAINT user_milestones_pkey PRIMARY KEY (id);


--
-- Name: user_milestones user_milestones_user_id_milestone_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_milestones
    ADD CONSTRAINT user_milestones_user_id_milestone_type_key UNIQUE (user_id, milestone_type);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_subscriptions user_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: user_subscriptions user_subscriptions_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_key UNIQUE (user_id);


--
-- Name: idx_avatar_analytics_avatar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_analytics_avatar_id ON public.avatar_analytics USING btree (avatar_id);


--
-- Name: idx_avatar_analytics_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_analytics_updated_at ON public.avatar_analytics USING btree (updated_at DESC);


--
-- Name: idx_avatar_memory_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_memory_session ON public.avatar_memory USING btree (session_id);


--
-- Name: idx_avatar_memory_user_avatar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatar_memory_user_avatar ON public.avatar_memory USING btree (user_id, avatar_id);


--
-- Name: idx_avatars_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatars_deleted_at ON public.avatars USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_avatars_image_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatars_image_source ON public.avatars USING btree (image_source);


--
-- Name: idx_avatars_is_optimized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatars_is_optimized ON public.avatars USING btree (is_optimized);


--
-- Name: idx_avatars_strength; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatars_strength ON public.avatars USING btree (strength);


--
-- Name: idx_avatars_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_avatars_tags ON public.avatars USING gin (tags);


--
-- Name: idx_chat_messages_reply_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_reply_to ON public.chat_messages USING btree (reply_to);


--
-- Name: idx_chat_messages_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_messages_session_id ON public.chat_messages USING btree (session_id);


--
-- Name: idx_chat_sessions_avatar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_avatar_id ON public.chat_sessions USING btree (avatar_id);


--
-- Name: idx_chat_sessions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_created_at ON public.chat_sessions USING btree (created_at DESC);


--
-- Name: idx_chat_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions USING btree (user_id);


--
-- Name: idx_credit_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions USING btree (created_at DESC);


--
-- Name: idx_credit_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions USING btree (user_id);


--
-- Name: idx_credits_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_credits_user_id ON public.credits USING btree (user_id);


--
-- Name: idx_mood_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mood_logs_created_at ON public.mood_logs USING btree (created_at DESC);


--
-- Name: idx_mood_logs_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mood_logs_message_id ON public.mood_logs USING btree (message_id);


--
-- Name: idx_mood_logs_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mood_logs_session_id ON public.mood_logs USING btree (session_id);


--
-- Name: idx_user_avatars_deleted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_avatars_deleted_at ON public.user_avatars USING btree (deleted_at) WHERE (deleted_at IS NULL);


--
-- Name: idx_user_avatars_image_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_avatars_image_source ON public.user_avatars USING btree (image_source);


--
-- Name: idx_user_avatars_is_optimized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_avatars_is_optimized ON public.user_avatars USING btree (is_optimized);


--
-- Name: idx_user_avatars_knowledge_base; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_avatars_knowledge_base ON public.user_avatars USING btree (((knowledge_base IS NOT NULL)));


--
-- Name: idx_user_avatars_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_avatars_tags ON public.user_avatars USING gin (tags);


--
-- Name: idx_user_favorite_avatars_avatar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorite_avatars_avatar ON public.user_favorite_avatars USING btree (avatar_id, avatar_type);


--
-- Name: idx_user_favorite_avatars_user_avatar; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorite_avatars_user_avatar ON public.user_favorite_avatars USING btree (user_id, avatar_id);


--
-- Name: idx_user_favorite_avatars_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_favorite_avatars_user_id ON public.user_favorite_avatars USING btree (user_id);


--
-- Name: idx_user_feedback_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_status ON public.user_feedback USING btree (status);


--
-- Name: idx_user_feedback_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_feedback_user_id ON public.user_feedback USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: user_avatars award_avatar_milestones; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER award_avatar_milestones AFTER INSERT ON public.user_avatars FOR EACH ROW EXECUTE FUNCTION public.check_avatar_milestones();


--
-- Name: chat_messages award_first_chat_milestone; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER award_first_chat_milestone AFTER INSERT ON public.chat_messages FOR EACH ROW WHEN ((new.role = 'user'::text)) EXECUTE FUNCTION public.check_first_chat_milestone();


--
-- Name: avatar_memory avatar_memory_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_memory
    ADD CONSTRAINT avatar_memory_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: avatar_memory avatar_memory_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatar_memory
    ADD CONSTRAINT avatar_memory_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: avatars avatars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avatars
    ADD CONSTRAINT avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: chat_follow_up_suggestions chat_follow_up_suggestions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_follow_up_suggestions
    ADD CONSTRAINT chat_follow_up_suggestions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: chat_sessions chat_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_sessions
    ADD CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: credit_requests credit_requests_processed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_requests
    ADD CONSTRAINT credit_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES auth.users(id);


--
-- Name: credit_requests credit_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_requests
    ADD CONSTRAINT credit_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: credit_transactions credit_transactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_transactions
    ADD CONSTRAINT credit_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: credits credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credits
    ADD CONSTRAINT credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feature_bids feature_bids_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_bids
    ADD CONSTRAINT feature_bids_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.user_feedback(id) ON DELETE CASCADE;


--
-- Name: feature_bids feature_bids_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_bids
    ADD CONSTRAINT feature_bids_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: feedback_upvotes feedback_upvotes_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_upvotes
    ADD CONSTRAINT feedback_upvotes_feedback_id_fkey FOREIGN KEY (feedback_id) REFERENCES public.user_feedback(id) ON DELETE CASCADE;


--
-- Name: feedback_upvotes feedback_upvotes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback_upvotes
    ADD CONSTRAINT feedback_upvotes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: chat_messages fk_reply_to; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT fk_reply_to FOREIGN KEY (reply_to) REFERENCES public.chat_messages(id) ON DELETE SET NULL;


--
-- Name: user_avatars fk_user_avatars_user; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_avatars
    ADD CONSTRAINT fk_user_avatars_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mood_logs mood_logs_message_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_logs
    ADD CONSTRAINT mood_logs_message_id_fkey FOREIGN KEY (message_id) REFERENCES public.chat_messages(id) ON DELETE CASCADE;


--
-- Name: mood_logs mood_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mood_logs
    ADD CONSTRAINT mood_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.chat_sessions(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referred_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referred_id_fkey FOREIGN KEY (referred_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referrals referrals_referrer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referrals
    ADD CONSTRAINT referrals_referrer_id_fkey FOREIGN KEY (referrer_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_favorite_avatars user_favorite_avatars_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_favorite_avatars
    ADD CONSTRAINT user_favorite_avatars_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_feedback user_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_feedback
    ADD CONSTRAINT user_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_milestones user_milestones_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_milestones
    ADD CONSTRAINT user_milestones_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_subscriptions user_subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.pricing_plans(id) ON DELETE SET NULL;


--
-- Name: user_subscriptions user_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_subscriptions
    ADD CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credit_packages Admins can manage packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage packages" ON public.credit_packages USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: pricing_plans Admins can manage plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage plans" ON public.pricing_plans USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credits Admins can update all credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update all credits" ON public.credits FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: avatars Admins can update avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update avatars" ON public.avatars FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credit_requests Admins can update credit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update credit requests" ON public.credit_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_feedback Admins can update feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update feedback" ON public.user_feedback FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: avatar_analytics Admins can view all analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all analytics" ON public.avatar_analytics FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: credit_requests Admins can view all credit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all credit requests" ON public.credit_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_subscriptions Admins can view all subscriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all subscriptions" ON public.user_subscriptions FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: avatars Anyone can view active avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active avatars" ON public.avatars FOR SELECT USING ((is_active = true));


--
-- Name: credit_packages Anyone can view active packages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active packages" ON public.credit_packages FOR SELECT USING ((is_active = true));


--
-- Name: pricing_plans Anyone can view active plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active plans" ON public.pricing_plans FOR SELECT USING ((is_active = true));


--
-- Name: feature_bids Anyone can view bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view bids" ON public.feature_bids FOR SELECT USING (true);


--
-- Name: user_feedback Anyone can view feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view feedback" ON public.user_feedback FOR SELECT USING (true);


--
-- Name: profiles Anyone can view leaderboard opted-in profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view leaderboard opted-in profiles" ON public.profiles FOR SELECT USING ((show_on_leaderboard = true));


--
-- Name: feedback_upvotes Anyone can view upvotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view upvotes" ON public.feedback_upvotes FOR SELECT USING (true);


--
-- Name: user_avatars Authenticated users can create avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create avatars" ON public.user_avatars FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_messages Authenticated users can create own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create own chat messages" ON public.chat_messages FOR INSERT WITH CHECK ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.user_id = auth.uid()))));


--
-- Name: chat_sessions Authenticated users can create own chat sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create own chat sessions" ON public.chat_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: chat_follow_up_suggestions Authenticated users can insert suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert suggestions" ON public.chat_follow_up_suggestions FOR INSERT WITH CHECK ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.user_id = auth.uid()))));


--
-- Name: chat_sessions Authenticated users can update own chat sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update own chat sessions" ON public.chat_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: chat_messages Authenticated users can view own chat messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view own chat messages" ON public.chat_messages FOR SELECT USING ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.user_id = auth.uid()))));


--
-- Name: chat_sessions Authenticated users can view own chat sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view own chat sessions" ON public.chat_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: chat_follow_up_suggestions Authenticated users can view own suggestions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view own suggestions" ON public.chat_follow_up_suggestions FOR SELECT USING ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.user_id = auth.uid()))));


--
-- Name: user_milestones System can insert milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert milestones" ON public.user_milestones FOR INSERT WITH CHECK (true);


--
-- Name: mood_logs System can insert mood logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert mood logs" ON public.mood_logs FOR INSERT WITH CHECK (true);


--
-- Name: avatar_analytics System can update analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can update analytics" ON public.avatar_analytics USING (true);


--
-- Name: user_favorite_avatars Users can add own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can add own favorites" ON public.user_favorite_avatars FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: credit_requests Users can create credit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create credit requests" ON public.credit_requests FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (status = 'pending'::text)));


--
-- Name: user_avatars Users can delete own avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own avatars" ON public.user_avatars FOR DELETE USING ((user_id = auth.uid()));


--
-- Name: feedback_upvotes Users can delete own upvotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own upvotes" ON public.feedback_upvotes FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: feature_bids Users can insert own bids; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own bids" ON public.feature_bids FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: credits Users can insert own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own credits" ON public.credits FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_feedback Users can insert own feedback; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own feedback" ON public.user_feedback FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: avatar_memory Users can insert own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own memories" ON public.avatar_memory FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: feedback_upvotes Users can insert own upvotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own upvotes" ON public.feedback_upvotes FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_favorite_avatars Users can remove own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can remove own favorites" ON public.user_favorite_avatars FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_avatars Users can update own avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own avatars" ON public.user_avatars FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: avatar_memory Users can update own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own memories" ON public.avatar_memory FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- Name: user_avatars Users can view own and public avatars; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own and public avatars" ON public.user_avatars FOR SELECT USING (((deleted_at IS NULL) AND ((is_public = true) OR (user_id = auth.uid()))));


--
-- Name: credit_requests Users can view own credit requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credit requests" ON public.credit_requests FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: credits Users can view own credits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own credits" ON public.credits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_favorite_avatars Users can view own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own favorites" ON public.user_favorite_avatars FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: avatar_memory Users can view own memories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own memories" ON public.avatar_memory FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_milestones Users can view own milestones; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own milestones" ON public.user_milestones FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mood_logs Users can view own mood logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own mood logs" ON public.mood_logs FOR SELECT USING ((session_id IN ( SELECT chat_sessions.id
   FROM public.chat_sessions
  WHERE (chat_sessions.user_id = auth.uid()))));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: referrals Users can view own referrals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own referrals" ON public.referrals FOR SELECT USING (((auth.uid() = referrer_id) OR (auth.uid() = referred_id)));


--
-- Name: user_roles Users can view own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_subscriptions Users can view own subscription; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own subscription" ON public.user_subscriptions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: credit_transactions Users can view own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own transactions" ON public.credit_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: avatar_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatar_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: avatar_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatar_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_follow_up_suggestions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_follow_up_suggestions ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: chat_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_packages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: credits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_bids; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_bids ENABLE ROW LEVEL SECURITY;

--
-- Name: feedback_upvotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedback_upvotes ENABLE ROW LEVEL SECURITY;

--
-- Name: mood_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: pricing_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referrals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

--
-- Name: user_avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: user_favorite_avatars; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_favorite_avatars ENABLE ROW LEVEL SECURITY;

--
-- Name: user_feedback; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

--
-- Name: user_milestones; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_milestones ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--


