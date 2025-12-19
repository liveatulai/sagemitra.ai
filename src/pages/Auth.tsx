import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import PermissionsModal from "@/components/PermissionsModal";
import ConsentModal from "@/components/ConsentModal";

// Validation schemas
const passwordSchema = z.string()
  .min(6, "Password must be at least 6 characters");

const emailSchema = z.string()
  .trim()
  .email("Please enter a valid email address");

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);

  // Redirect if already authenticated
  if (user) {
    navigate("/avatars");
    return null;
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return;
    }

    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    
    if (signInError) {
      setError(signInError.message || "Failed to sign in");
      setLoading(false);
    } else {
      navigate("/avatars");
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Validate consent
    if (!consentAccepted) {
      setError("You must agree to the Terms, Privacy Policy, and Guidelines");
      return;
    }
    
    // Validate email
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      setError(emailResult.error.errors[0].message);
      return;
    }
    
    // Validate password
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      setError(passwordResult.error.errors[0].message);
      return;
    }
    
    // Validate full name
    if (!fullName.trim()) {
      setError("Full name is required");
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName);
    
    if (signUpError) {
      setError(signUpError.message || "Failed to create account");
      setLoading(false);
    } else {
      // Show permissions modal
      setShowPermissionsModal(true);
      setLoading(false);
    }
  };

  const handlePermissionsComplete = () => {
    setShowPermissionsModal(false);
    navigate("/avatars");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-primary/5 to-accent/10 relative overflow-hidden">
      {/* Animated background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" 
             style={{ animationDuration: '4s' }} />
      </div>
      
      <Card className="w-full max-w-md relative z-10 shadow-elevated border-primary/20">
        <CardHeader className="text-center space-y-2 pb-6">
          <div className="flex justify-center mb-2">
            <div className="p-3 bg-gradient-to-br from-primary to-accent rounded-full">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to SageMitra ✨
          </CardTitle>
          <CardDescription className="text-base">
            Your wise companion awaits.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="px-4 sm:px-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signin">Email</Label>
                  <Input
                    id="email-signin"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password-signin">Password</Label>
                  <Input
                    id="password-signin"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11"
                  />
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname-signup">Full Name</Label>
                  <Input
                    id="fullname-signup"
                    type="text"
                    placeholder="Your Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email-signup">Email</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Password</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-11"
                  />
                </div>

                {/* Consent Checkbox */}
                <div className="flex items-start space-x-2 py-2">
                  <Checkbox
                    id="consent"
                    checked={consentAccepted}
                    onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                    disabled={loading}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor="consent"
                    className="text-sm font-normal leading-snug cursor-pointer"
                  >
                    I agree to the{" "}
                    <button
                      type="button"
                      onClick={() => setShowConsentModal(true)}
                      className="text-primary underline-offset-4 hover:underline font-medium"
                    >
                      Terms of Service, Privacy Policy, and AI Interaction Guidelines
                    </button>
                  </Label>
                </div>

                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-md hover:shadow-lg transition-all"
                  disabled={loading || !consentAccepted}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modals */}
      <PermissionsModal 
        open={showPermissionsModal} 
        onComplete={handlePermissionsComplete} 
      />
      
      <ConsentModal 
        open={showConsentModal} 
        onOpenChange={setShowConsentModal} 
      />
    </div>
  );
}
