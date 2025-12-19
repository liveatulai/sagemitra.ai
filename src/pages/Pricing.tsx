import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Check, Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function Pricing() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_packages')
        .select('*')
        .eq('is_active', true)
        .order('credits');

      if (error) throw error;
      setPackages(data || []);
    } catch (error) {
      console.error("Error loading packages:", error);
      toast.error("Failed to load pricing packages");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (pkg: any) => {
    toast.info("Payment integration coming soon! Contact support for manual purchase.");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 p-4 sm:p-8">
      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <div className="text-center space-y-4 mb-12">
          <Badge className="mx-auto" variant="secondary">
            <Sparkles className="w-3 h-3 mr-1" />
            Flexible Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold">Choose Your Credit Package</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get more credits for your AI conversations. No subscriptions, pay only for what you need.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <Card key={idx} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                </CardHeader>
                <CardContent>
                  <div className="h-16 bg-muted rounded mb-4" />
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 bg-muted rounded" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            packages.map((pkg) => (
              <Card 
                key={pkg.id} 
                className={`relative ${pkg.is_popular ? 'border-2 border-primary shadow-xl scale-105' : ''}`}
              >
                {pkg.is_popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  <CardDescription>
                    Perfect for {pkg.name === 'Starter' ? 'trying out' : pkg.name === 'Popular' ? 'regular users' : 'power users'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <div className="text-4xl font-bold">
                      ${pkg.price_usd}
                      <span className="text-lg font-normal text-muted-foreground">/package</span>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {pkg.credits} credits
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {pkg.features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    variant={pkg.is_popular ? 'default' : 'outline'}
                    onClick={() => handlePurchase(pkg)}
                  >
                    Purchase Now
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    One-time payment • No subscription
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Usage Info */}
        <Card className="bg-secondary/20">
          <CardHeader>
            <CardTitle>How Credits Work</CardTitle>
            <CardDescription>Transparent pricing for all features</CardDescription>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">1 Credit</div>
              <div className="text-sm font-medium">Chat Message</div>
              <div className="text-xs text-muted-foreground">
                Each message you send to an AI avatar
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">5 Credits</div>
              <div className="text-sm font-medium">Avatar Optimization</div>
              <div className="text-xs text-muted-foreground">
                Enhance your custom avatar with AI
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-primary">10 Credits</div>
              <div className="text-sm font-medium">Avatar Generation</div>
              <div className="text-xs text-muted-foreground">
                Create a new AI avatar image
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-16 space-y-6">
          <h2 className="text-3xl font-bold text-center">Frequently Asked Questions</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Do credits expire?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  No! Your credits never expire. Use them at your own pace.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I earn free credits?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes! Earn 50 credits per referral, plus milestone rewards for using the platform.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We accept all major credit cards, UPI, and digital wallets. Payment integration coming soon.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I get a refund?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Yes, we offer a 7-day money-back guarantee if you're not satisfied.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}