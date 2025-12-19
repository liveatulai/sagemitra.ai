import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, TrendingUp, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const feedbackSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "Title is required")
    .max(200, "Title must be less than 200 characters"),
  message: z.string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(5000, "Message must be less than 5000 characters"),
  type: z.enum(['feedback', 'feature', 'bug'])
});

const bidAmountSchema = z.number()
  .int("Bid amount must be a whole number")
  .min(1, "Bid amount must be at least 1 credit")
  .max(10000, "Bid amount cannot exceed 10,000 credits");

export default function Feedback() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState(0);
  const [newFeedback, setNewFeedback] = useState({ title: "", message: "", type: "feedback" });

  useEffect(() => {
    loadFeedback();
    loadUserCredits();
  }, [user]);

  const loadFeedback = async () => {
    const { data, error } = await supabase
      .from('user_feedback')
      .select('*, profiles(full_name)')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (!error && data) setFeedbackList(data);
  };

  const loadUserCredits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .single();
    
    if (data) setUserCredits(data.balance);
  };

  const submitFeedback = async () => {
    if (!user) {
      toast.error("Please sign in to submit feedback");
      return;
    }

    setLoading(true);
    try {
      const validated = feedbackSchema.safeParse(newFeedback);
      
      if (!validated.success) {
        toast.error(validated.error.errors[0].message);
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('user_feedback').insert({
        user_id: user.id,
        title: validated.data.title,
        message: validated.data.message,
        type: validated.data.type,
        status: 'pending'
      });

      if (error) {
        console.error("Feedback submission error:", error);
        toast.error(error.message || "Failed to submit feedback");
        return;
      }
      
      toast.success("Feedback submitted!");
      setNewFeedback({ title: "", message: "", type: "feedback" });
      loadFeedback();
    } catch (error: any) {
      console.error("Feedback submission error:", error);
      toast.error(error.message || "Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  const upvoteFeedback = async (feedbackId: string) => {
    if (!user) {
      toast.error("Please sign in to upvote");
      return;
    }

    setLoading(true);
    try {
      // Check if already upvoted
      const { data: existing } = await supabase
        .from('feedback_upvotes')
        .select('id')
        .eq('feedback_id', feedbackId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Remove upvote
        await supabase.from('feedback_upvotes').delete().eq('id', existing.id);
        // Decrease upvote count
        const { data: feedback } = await supabase
          .from('user_feedback')
          .select('upvotes')
          .eq('id', feedbackId)
          .single();
        if (feedback) {
          await supabase
            .from('user_feedback')
            .update({ upvotes: Math.max(0, (feedback.upvotes || 0) - 1) })
            .eq('id', feedbackId);
        }
        toast.success("Upvote removed");
      } else {
        // Add upvote
        await supabase.from('feedback_upvotes').insert({
          feedback_id: feedbackId,
          user_id: user.id
        });
        // Increase upvote count
        const { data: feedback } = await supabase
          .from('user_feedback')
          .select('upvotes')
          .eq('id', feedbackId)
          .single();
        if (feedback) {
          await supabase
            .from('user_feedback')
            .update({ upvotes: (feedback.upvotes || 0) + 1 })
            .eq('id', feedbackId);
        }
        toast.success("Upvoted!");
      }
      loadFeedback();
    } catch (error: any) {
      console.error("Upvote error:", error);
      toast.error(error.message || "Failed to upvote");
    } finally {
      setLoading(false);
    }
  };

  const placeBid = async (feedbackId: string, bidAmount: number) => {
    if (!user) {
      toast.error("Please sign in to place a bid");
      return;
    }

    if (bidAmount > userCredits) {
      toast.error("Insufficient credits");
      return;
    }

    setLoading(true);
    try {
      // Use secure RPC function to deduct credits atomically
      const { data: creditResult, error: creditError } = await supabase
        .rpc('adjust_user_credits', {
          p_user_id: user.id,
          p_amount: -bidAmount,
          p_description: 'Feature request bid'
        });

      if (creditError) {
        console.error("Credit adjustment error:", creditError);
        toast.error(creditError.message || "Failed to deduct credits");
        return;
      }

      const result = creditResult as { success: boolean; error?: string; balance: number };
      if (!result?.success) {
        toast.error(result?.error || "Failed to deduct credits");
        return;
      }

      // Now create the bid
      const { error } = await supabase.from('feature_bids').insert({
        feedback_id: feedbackId,
        user_id: user.id,
        bid_credits: bidAmount
      });

      if (error) {
        console.error("Bid creation error:", error);
        toast.error(error.message || "Failed to place bid");
        return;
      }

      toast.success(`Bid placed: ${bidAmount} credits`);
      loadUserCredits();
      loadFeedback();
    } catch (error: any) {
      console.error("Bid placement error:", error);
      toast.error(error.message || "Failed to place bid");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Badge variant="secondary">Credits: {userCredits}</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Submit Feedback or Feature Request</CardTitle>
            <CardDescription>Help us improve SageMitra</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Title"
              value={newFeedback.title}
              onChange={(e) => setNewFeedback({ ...newFeedback, title: e.target.value })}
            />
            <Textarea
              placeholder="Describe your feedback or feature request..."
              value={newFeedback.message}
              onChange={(e) => setNewFeedback({ ...newFeedback, message: e.target.value })}
              rows={4}
            />
            <Select value={newFeedback.type} onValueChange={(v) => setNewFeedback({ ...newFeedback, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">Feedback</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={submitFeedback} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Community Feedback</h2>
          {feedbackList.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>
                      by {item.profiles?.full_name || "Anonymous"}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status}
                    </Badge>
                    <Badge variant="outline">{item.type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => upvoteFeedback(item.id)}
                    disabled={loading}
                  >
                    <ThumbsUp className="w-4 h-4 mr-1" />
                    {item.upvotes || 0}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const input = prompt("How many credits to bid?");
                      if (!input) return;
                      
                      const parsed = parseInt(input);
                      const validated = bidAmountSchema.safeParse(parsed);
                      
                      if (!validated.success) {
                        toast.error(validated.error.errors[0].message);
                        return;
                      }
                      
                      placeBid(item.id, validated.data);
                    }}
                    disabled={loading}
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Bid Credits
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
