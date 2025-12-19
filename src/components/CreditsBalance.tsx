import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, AlertTriangle } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function CreditsBalance() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBalance(null);
      setLoading(false);
      return;
    }

    loadBalance();

    // Subscribe to credit changes
    const channel = supabase
      .channel('credits-balance')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'credits',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new && 'balance' in payload.new) {
            setBalance(payload.new.balance as number);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data } = await supabase
      .from('credits')
      .select('balance')
      .eq('user_id', user.id)
      .maybeSingle();
    
    setBalance(data?.balance ?? null);
    setLoading(false);
  };

  if (!user || balance === null) return null;

  const isLow = balance < 20;
  const isCritical = balance < 10;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => navigate('/credits')}
            variant={isCritical ? "destructive" : isLow ? "outline" : "ghost"}
            size="sm"
            className="h-9 sm:h-10 px-2 sm:px-4 gap-1.5 sm:gap-2"
          >
            {isCritical ? (
              <AlertTriangle className="w-4 h-4 animate-pulse" />
            ) : (
              <Coins className={`w-4 h-4 ${isLow ? 'text-warning' : ''}`} />
            )}
            <span className="font-semibold tabular-nums">
              {loading ? '...' : balance}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">
            {isCritical 
              ? '⚠️ Critical: Running out of credits!' 
              : isLow 
              ? '⚡ Low balance - consider adding credits'
              : `${balance} credits available`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to manage credits
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
