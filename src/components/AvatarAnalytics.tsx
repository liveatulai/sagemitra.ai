import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, MessageSquare, Heart, Clock, Users, Sparkles } from "lucide-react";

interface AnalyticsData {
  avatar_id: string;
  avatar_name?: string;
  total_chats: number;
  avg_session_length: number;
  avg_likes: number;
  retention_rate: number;
  top_emotions: any;
  sentiment_ratio: any;
}

export default function AvatarAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalChatsToday: 0,
    avgRetention: 0,
    mostLovedAvatar: ""
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      // Fetch avatar analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from("avatar_analytics")
        .select("*")
        .order("total_chats", { ascending: false });

      if (analyticsError) throw analyticsError;

      // Fetch avatar names
      const avatarIds = analyticsData?.map(a => a.avatar_id) || [];
      const { data: avatars } = await supabase
        .from("avatars")
        .select("id, name")
        .in("id", avatarIds);

      const enrichedData = analyticsData?.map(stat => ({
        ...stat,
        avatar_name: avatars?.find(a => a.id === stat.avatar_id)?.name || "Unknown"
      })) || [];

      setAnalytics(enrichedData);

      // Calculate global stats
      const totalChats = enrichedData.reduce((sum, a) => sum + a.total_chats, 0);
      const avgRet = enrichedData.reduce((sum, a) => sum + a.retention_rate, 0) / (enrichedData.length || 1);
      const mostLoved = enrichedData.sort((a, b) => b.avg_likes - a.avg_likes)[0]?.avatar_name || "N/A";

      setGlobalStats({
        totalChatsToday: totalChats,
        avgRetention: Math.round(avgRet),
        mostLovedAvatar: mostLoved
      });

      setLoading(false);
    } catch (error) {
      console.error("Failed to load analytics:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Global Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card hover-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Chats Today</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.totalChatsToday}</div>
            <p className="text-xs text-muted-foreground">Across all avatars</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Retention</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalStats.avgRetention}%</div>
            <p className="text-xs text-muted-foreground">Return sessions</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover-glow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Most Loved Avatar</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{globalStats.mostLovedAvatar}</div>
            <p className="text-xs text-muted-foreground">Highest engagement</p>
          </CardContent>
        </Card>
      </div>

      {/* Engagement Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Avatar Engagement Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="avatar_name" angle={-45} textAnchor="end" height={100} fontSize={12} />
              <YAxis />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="total_chats" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-Avatar Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {analytics.map((stat) => (
          <Card key={stat.avatar_id} className="glass-card hover-glow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {stat.avatar_name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Total Conversations
                </span>
                <span className="font-semibold">{stat.total_chats}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Avg. Session Length
                </span>
                <span className="font-semibold">{stat.avg_session_length} min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Avg. Likes
                </span>
                <span className="font-semibold">{stat.avg_likes.toFixed(1)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Retention Rate
                </span>
                <span className="font-semibold">{stat.retention_rate}%</span>
              </div>
              {stat.top_emotions && Array.isArray(stat.top_emotions) && stat.top_emotions.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Top Emotions</span>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {stat.top_emotions.slice(0, 3).map((emotion: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 rounded-full bg-primary/10 text-xs">
                        {emotion}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Last updated: {new Date().toLocaleString()}
      </p>
    </div>
  );
}
