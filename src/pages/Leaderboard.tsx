import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface LeaderboardEntry {
  display_name: string;
  earned_from_referral: number;
  referral_count: number;
}

export default function Leaderboard() {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      // Use the secure RPC function that only returns opted-in users
      const { data, error } = await supabase.rpc('get_public_leaderboard');

      if (error) throw error;
      setLeaders(data || []);
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      toast.error("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{index + 1}</span>;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-yellow-500">🥇 1st Place</Badge>;
      case 1:
        return <Badge className="bg-gray-400">🥈 2nd Place</Badge>;
      case 2:
        return <Badge className="bg-amber-600">🥉 3rd Place</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 p-4 sm:p-8">
      <div className="container mx-auto max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center space-y-4 mb-12">
          <Badge className="mx-auto" variant="secondary">
            <Trophy className="w-3 h-3 mr-1" />
            Top Contributors
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Credits Leaderboard</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Recognize our top users who earned the most credits from referrals
          </p>
        </div>

        {/* Top 3 Podium */}
        {!loading && leaders.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-12 max-w-2xl mx-auto">
            {/* 2nd Place */}
            <div className="flex flex-col items-center justify-end">
              <Card className="w-full bg-gradient-to-br from-gray-400/10 to-gray-400/5 border-gray-400">
                <CardContent className="p-4 text-center">
                  <Medal className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-bold truncate">{leaders[1]?.display_name || 'Anonymous'}</p>
                  <p className="text-2xl font-bold text-gray-400">{leaders[1]?.earned_from_referral}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </CardContent>
              </Card>
              <div className="w-full h-20 bg-gradient-to-b from-gray-400/20 to-gray-400/10 rounded-t-lg mt-2 flex items-center justify-center font-bold text-gray-400">
                2nd
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center justify-end -mt-8">
              <Card className="w-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/10 border-yellow-500 border-2">
                <CardContent className="p-4 text-center">
                  <Trophy className="w-10 h-10 text-yellow-500 mx-auto mb-2" />
                  <p className="font-bold truncate">{leaders[0]?.display_name || 'Anonymous'}</p>
                  <p className="text-3xl font-bold text-yellow-500">{leaders[0]?.earned_from_referral}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </CardContent>
              </Card>
              <div className="w-full h-32 bg-gradient-to-b from-yellow-500/20 to-yellow-500/10 rounded-t-lg mt-2 flex items-center justify-center font-bold text-yellow-500">
                1st
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center justify-end">
              <Card className="w-full bg-gradient-to-br from-amber-600/10 to-amber-600/5 border-amber-600">
                <CardContent className="p-4 text-center">
                  <Award className="w-8 h-8 text-amber-600 mx-auto mb-2" />
                  <p className="font-bold truncate">{leaders[2]?.display_name || 'Anonymous'}</p>
                  <p className="text-2xl font-bold text-amber-600">{leaders[2]?.earned_from_referral}</p>
                  <p className="text-xs text-muted-foreground">credits</p>
                </CardContent>
              </Card>
              <div className="w-full h-16 bg-gradient-to-b from-amber-600/20 to-amber-600/10 rounded-t-lg mt-2 flex items-center justify-center font-bold text-amber-600">
                3rd
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Rankings
            </CardTitle>
            <CardDescription>Complete leaderboard of users by referral credits earned</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="animate-pulse flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                    <div className="h-8 bg-muted rounded w-16" />
                  </div>
                ))}
              </div>
            ) : leaders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>No leaderboard data yet. Be the first to earn referral credits!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaders.map((leader, index) => (
                  <div
                    key={`${leader.display_name}-${index}`}
                    className={`flex items-center gap-4 p-4 rounded-lg transition-colors hover:bg-secondary/50 ${
                      index < 3 ? 'bg-secondary/30' : ''
                    }`}
                  >
                    <div className="w-10 flex items-center justify-center">
                      {getRankIcon(index)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{leader.display_name || 'Anonymous'}</p>
                        {getRankBadge(index)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {leader.referral_count} referral{leader.referral_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{leader.earned_from_referral}</p>
                      <p className="text-xs text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* CTA Section */}
        <Card className="mt-8 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-8 text-center space-y-4">
            <Trophy className="w-12 h-12 text-primary mx-auto" />
            <h3 className="text-2xl font-bold">Want to Climb the Leaderboard?</h3>
            <p className="text-muted-foreground">
              Share your referral link and earn 50 credits for each friend who signs up!
            </p>
            <Button onClick={() => navigate('/credits')}>
              Get Your Referral Link
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}