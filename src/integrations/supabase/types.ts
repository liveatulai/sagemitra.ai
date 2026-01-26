export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      avatar_analytics: {
        Row: {
          avatar_id: string
          avg_likes: number | null
          avg_session_length: number | null
          created_at: string | null
          id: string
          retention_rate: number | null
          sentiment_ratio: Json | null
          top_emotions: Json | null
          total_chats: number | null
          updated_at: string | null
        }
        Insert: {
          avatar_id: string
          avg_likes?: number | null
          avg_session_length?: number | null
          created_at?: string | null
          id?: string
          retention_rate?: number | null
          sentiment_ratio?: Json | null
          top_emotions?: Json | null
          total_chats?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar_id?: string
          avg_likes?: number | null
          avg_session_length?: number | null
          created_at?: string | null
          id?: string
          retention_rate?: number | null
          sentiment_ratio?: Json | null
          top_emotions?: Json | null
          total_chats?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      avatar_memory: {
        Row: {
          avatar_id: string
          created_at: string | null
          emotional_context: string | null
          id: string
          memory_summary: string
          message_count: number | null
          session_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_id: string
          created_at?: string | null
          emotional_context?: string | null
          id?: string
          memory_summary: string
          message_count?: number | null
          session_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_id?: string
          created_at?: string | null
          emotional_context?: string | null
          id?: string
          memory_summary?: string
          message_count?: number | null
          session_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avatar_memory_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      avatars: {
        Row: {
          category: string
          created_at: string | null
          custom_voice_id: string | null
          deleted_at: string | null
          description: string | null
          growth_metrics: Json | null
          id: string
          image_source: string | null
          image_url: string | null
          is_active: boolean | null
          is_optimized: boolean | null
          knowledge_base: string | null
          name: string
          needs_image_regeneration: boolean | null
          persona_profile: Json | null
          personality_evolution: Json | null
          personality_prompt: string
          strength: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string | null
          voice_id: string | null
          voice_provider: string | null
          voice_sample_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          custom_voice_id?: string | null
          deleted_at?: string | null
          description?: string | null
          growth_metrics?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_optimized?: boolean | null
          knowledge_base?: string | null
          name: string
          needs_image_regeneration?: boolean | null
          persona_profile?: Json | null
          personality_evolution?: Json | null
          personality_prompt: string
          strength?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string | null
          voice_provider?: string | null
          voice_sample_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          custom_voice_id?: string | null
          deleted_at?: string | null
          description?: string | null
          growth_metrics?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_optimized?: boolean | null
          knowledge_base?: string | null
          name?: string
          needs_image_regeneration?: boolean | null
          persona_profile?: Json | null
          personality_evolution?: Json | null
          personality_prompt?: string
          strength?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          voice_id?: string | null
          voice_provider?: string | null
          voice_sample_url?: string | null
        }
        Relationships: []
      }
      chat_follow_up_suggestions: {
        Row: {
          created_at: string | null
          id: string
          session_id: string
          suggestion: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          session_id: string
          suggestion: string
        }
        Update: {
          created_at?: string | null
          id?: string
          session_id?: string
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_follow_up_suggestions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          reactions: Json | null
          reply_preview: string | null
          reply_to: string | null
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          reply_preview?: string | null
          reply_to?: string | null
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          reactions?: Json | null
          reply_preview?: string | null
          reply_to?: string | null
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_reply_to"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          avatar_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          created_at: string | null
          credits: number
          features: string[] | null
          id: string
          is_active: boolean | null
          is_popular: boolean | null
          name: string
          price_usd: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name: string
          price_usd: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits?: number
          features?: string[] | null
          id?: string
          is_active?: boolean | null
          is_popular?: boolean | null
          name?: string
          price_usd?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      credit_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string | null
          id: string
          processed_at: string | null
          processed_by: string | null
          reason: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string | null
          id?: string
          processed_at?: string | null
          processed_by?: string | null
          reason?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number | null
          created_at: string | null
          earned_from_referral: number | null
          id: string
          spent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          earned_from_referral?: number | null
          id?: string
          spent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          earned_from_referral?: number | null
          id?: string
          spent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      feature_bids: {
        Row: {
          bid_credits: number
          created_at: string | null
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          bid_credits: number
          created_at?: string | null
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          bid_credits?: number
          created_at?: string | null
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_bids_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "public_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_bids_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_upvotes: {
        Row: {
          created_at: string | null
          feedback_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          feedback_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          feedback_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_upvotes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "public_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_upvotes_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      mood_logs: {
        Row: {
          created_at: string | null
          detected_mood: string
          id: string
          keywords: string[] | null
          message_id: string
          sentiment_score: number | null
          session_id: string
        }
        Insert: {
          created_at?: string | null
          detected_mood: string
          id?: string
          keywords?: string[] | null
          message_id: string
          sentiment_score?: number | null
          session_id: string
        }
        Update: {
          created_at?: string | null
          detected_mood?: string
          id?: string
          keywords?: string[] | null
          message_id?: string
          sentiment_score?: number | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_logs_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mood_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          monthly_credits: number
          name: string
          price_usd: number
          stripe_price_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_credits: number
          name: string
          price_usd: number
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          monthly_credits?: number
          name?: string
          price_usd?: number
          stripe_price_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_avatar_id: string | null
          full_name: string | null
          id: string
          leaderboard_display_name: string | null
          onboarding_completed: boolean | null
          preferred_vibe: string | null
          show_on_leaderboard: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_avatar_id?: string | null
          full_name?: string | null
          id: string
          leaderboard_display_name?: string | null
          onboarding_completed?: boolean | null
          preferred_vibe?: string | null
          show_on_leaderboard?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_avatar_id?: string | null
          full_name?: string | null
          id?: string
          leaderboard_display_name?: string | null
          onboarding_completed?: boolean | null
          preferred_vibe?: string | null
          show_on_leaderboard?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string
          referrer_id: string
          reward_credits: number | null
          rewarded: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id: string
          referrer_id: string
          reward_credits?: number | null
          rewarded?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string
          referrer_id?: string
          reward_credits?: number | null
          rewarded?: boolean | null
        }
        Relationships: []
      }
      user_avatars: {
        Row: {
          category: string
          created_at: string | null
          custom_category: string | null
          custom_voice_id: string | null
          deleted_at: string | null
          description: string | null
          growth_metrics: Json | null
          id: string
          image_source: string | null
          image_url: string | null
          is_active: boolean | null
          is_optimized: boolean | null
          is_public: boolean | null
          knowledge_base: string | null
          name: string
          persona_profile: Json
          personality_evolution: Json | null
          personality_prompt: string
          strength: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          user_id: string
          voice_provider: string | null
          voice_sample_url: string | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          custom_category?: string | null
          custom_voice_id?: string | null
          deleted_at?: string | null
          description?: string | null
          growth_metrics?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_optimized?: boolean | null
          is_public?: boolean | null
          knowledge_base?: string | null
          name: string
          persona_profile?: Json
          personality_evolution?: Json | null
          personality_prompt: string
          strength?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          user_id: string
          voice_provider?: string | null
          voice_sample_url?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          custom_category?: string | null
          custom_voice_id?: string | null
          deleted_at?: string | null
          description?: string | null
          growth_metrics?: Json | null
          id?: string
          image_source?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_optimized?: boolean | null
          is_public?: boolean | null
          knowledge_base?: string | null
          name?: string
          persona_profile?: Json
          personality_evolution?: Json | null
          personality_prompt?: string
          strength?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          user_id?: string
          voice_provider?: string | null
          voice_sample_url?: string | null
        }
        Relationships: []
      }
      user_favorite_avatars: {
        Row: {
          avatar_id: string
          avatar_type: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_id: string
          avatar_type: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_id?: string
          avatar_type?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          created_at: string | null
          id: string
          message: string
          status: string | null
          title: string
          type: string
          updated_at: string | null
          upvotes: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          status?: string | null
          title: string
          type: string
          updated_at?: string | null
          upvotes?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          status?: string | null
          title?: string
          type?: string
          updated_at?: string | null
          upvotes?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          achieved_at: string | null
          id: string
          milestone_type: string
          reward_credits: number
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          id?: string
          milestone_type: string
          reward_credits?: number
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          id?: string
          milestone_type?: string
          reward_credits?: number
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_feedback: {
        Row: {
          author_display: string | null
          created_at: string | null
          id: string | null
          message: string | null
          status: string | null
          title: string | null
          type: string | null
          upvotes: number | null
        }
        Insert: {
          author_display?: never
          created_at?: string | null
          id?: string | null
          message?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          upvotes?: number | null
        }
        Update: {
          author_display?: never
          created_at?: string | null
          id?: string | null
          message?: string | null
          status?: string | null
          title?: string | null
          type?: string | null
          upvotes?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adjust_user_credits: {
        Args: { p_amount: number; p_description: string; p_user_id: string }
        Returns: Json
      }
      check_and_award_milestone: {
        Args: {
          p_milestone_type: string
          p_reward_credits: number
          p_user_id: string
        }
        Returns: boolean
      }
      get_public_leaderboard: {
        Args: never
        Returns: {
          display_name: string
          earned_from_referral: number
          referral_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_feedback_upvote: { Args: { p_feedback_id: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
