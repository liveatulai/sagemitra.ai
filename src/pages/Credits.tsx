import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Share2, Send } from "lucide-react";
import { toast } from "sonner";

export default function Credits() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [creditData, setCreditData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [creditRequests, setCreditRequests] = useState<any[]>([]);
  const [referralLink, setReferralLink] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadCredits();
    loadTransactions();
    loadCreditRequests();
    generateReferralLink();
  }, [user]);

  const loadCredits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credits')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (data) setCreditData(data);
  };

  const loadTransactions = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setTransactions(data);
  };

  const loadCreditRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('credit_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (data) setCreditRequests(data);
  };

  const generateReferralLink = () => {
    if (!user) return;
    const link = `${window.location.origin}/auth?ref=${user.id}`;
    setReferralLink(link);
  };

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied!");
  };

  const shareReferral = () => {
    const text = "Join me on SageMitra - Chat with divine AI companions! ✨";
    const url = referralLink;
    
    if (navigator.share) {
      navigator.share({ title: "SageMitra", text, url });
    } else {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    }
  };

  const handleRequestCredits = async () => {
    const amount = parseInt(requestAmount);
    
    if (!amount || amount <= 0 || amount > 10000) {
      toast.error("Amount must be between 1 and 10,000");
      return;
    }

    if (!requestReason || requestReason.trim().length < 10) {
      toast.error("Please provide a reason (at least 10 characters)");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-credits', {
        body: { amount, reason: requestReason }
      });

      if (error) throw error;

      toast.success("Credit request submitted successfully!");
      setRequestAmount("");
      setRequestReason("");
      loadCreditRequests();
    } catch (error) {
      console.error("Request error:", error);
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Credit Balance</CardTitle>
            <CardDescription>Manage your SageMitra credits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-3xl font-bold text-primary">{creditData?.balance || 0}</div>
                <div className="text-sm text-muted-foreground">Available Credits</div>
              </div>
              <div className="text-center p-4 bg-secondary/10 rounded-lg">
                <div className="text-3xl font-bold text-secondary">{creditData?.earned_from_referral || 0}</div>
                <div className="text-sm text-muted-foreground">Earned from Referrals</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{creditData?.spent || 0}</div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite & Earn</CardTitle>
            <CardDescription>Share SageMitra and earn 50 credits per referral</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-3 py-2 rounded-md border bg-muted text-sm"
              />
              <Button onClick={copyReferralLink} size="icon">
                <Copy className="w-4 h-4" />
              </Button>
              <Button onClick={shareReferral} size="icon" variant="secondary">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              When someone signs up using your link, you both earn 50 credits!
            </p>
          </CardContent>
        </Card>

        {/* Request Credits */}
        <Card>
          <CardHeader>
            <CardTitle>Request Credits</CardTitle>
            <CardDescription>Submit a request for additional credits (1 chat = 1 credit, 1 optimization = 5 credits)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (1-10,000 credits)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max="10000"
                value={requestAmount}
                onChange={(e) => setRequestAmount(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason (minimum 10 characters)</Label>
              <Textarea
                id="reason"
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="Please explain why you need additional credits..."
                rows={4}
              />
            </div>
            <Button 
              onClick={handleRequestCredits} 
              disabled={submitting}
              className="w-full"
            >
              <Send className="w-4 h-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </CardContent>
        </Card>

        {/* Credit Requests Status */}
        {creditRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Credit Requests</CardTitle>
              <CardDescription>Track the status of your requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {creditRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg bg-secondary/50 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{req.amount} credits</p>
                        <p className="text-sm text-muted-foreground">{req.reason}</p>
                      </div>
                      <Badge
                        variant={
                          req.status === 'approved'
                            ? 'default'
                            : req.status === 'rejected'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {req.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleString()}
                    </div>
                    {req.admin_notes && (
                      <div className="text-sm mt-2 p-2 bg-background rounded border">
                        <strong>Admin notes:</strong> {req.admin_notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions yet</p>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <div className="text-sm font-medium">{tx.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge variant={tx.type === 'credit' ? 'default' : 'secondary'}>
                      {tx.type === 'credit' ? '+' : '-'}{Math.abs(tx.amount)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
