import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      {/* Floating stars animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          >
            <Sparkles className="h-4 w-4 text-primary/30" />
          </div>
        ))}
      </div>

      <div className="text-center z-10 px-4">
        <div className="mb-6">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in">
            404
          </h1>
          <div className="text-6xl my-4">🕊️</div>
        </div>
        
        <h2 className="text-2xl font-semibold mb-4 text-foreground">
          Oops, this page wandered off the path of wisdom
        </h2>
        
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          The page you're looking for has transcended to another realm. 
          Let's guide you back to your sanctuary.
        </p>

        <Button
          onClick={() => navigate("/avatars")}
          size="lg"
          className="shadow-lg hover:shadow-xl transition-all"
        >
          <Sparkles className="mr-2 h-5 w-5" />
          Return to Sanctuary
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
