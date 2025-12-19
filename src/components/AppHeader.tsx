import { useState, useEffect } from "react";
import { Home, MessageSquare, Users, BarChart3, Shield, Flower2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";


export default function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [user]);

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: MessageSquare, label: "Chats", path: "/chat", protected: true },
    { icon: Users, label: "Avatars", path: "/avatars", protected: true },
    { icon: BarChart3, label: "Insights", path: "/leaderboard" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <svg width="0" height="0" className="absolute">
              <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--accent))" />
                </linearGradient>
              </defs>
            </svg>
            <Flower2 className="h-8 w-8" style={{ stroke: 'url(#logo-gradient)' }} />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              SageMitra
            </h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              if (item.protected && !user) return null;
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link key={item.path} to={item.path}>
                  <Button
                    variant={active ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "gap-2",
                      active && "shadow-md"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin">
                <Button
                  variant={isActive("/admin") ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "gap-2",
                    isActive("/admin") && "shadow-md"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
