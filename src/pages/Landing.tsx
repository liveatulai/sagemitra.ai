import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, MessageSquare, Users, Trophy, Zap, Shield, ArrowRight, Star, CheckCircle } from "lucide-react";
import buddhaImg from "@/assets/avatars/buddha.jpg";
import ramanaImg from "@/assets/avatars/ramana.jpg";
import teslaImg from "@/assets/avatars/tesla.jpg";
import einsteinImg from "@/assets/avatars/einstein.jpg";
import jobsImg from "@/assets/avatars/jobs.jpg";
import muskImg from "@/assets/avatars/musk.jpg";
import krishnamurtiImg from "@/assets/avatars/krishnamurti.jpg";


export default function Landing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const avatarPreviews = [
    { name: "Buddha", image: buddhaImg },
    { name: "Ramana", image: ramanaImg },
    { name: "Tesla", image: teslaImg },
    { name: "Einstein", image: einsteinImg },
    { name: "Jobs", image: jobsImg },
    { name: "Musk", image: muskImg },
    { name: "Krishnamurti", image: krishnamurtiImg }
  ];

  const features = [
    {
      icon: MessageSquare,
      title: "AI Companions",
      description: "Chat with divine sages and modern thought leaders"
    },
    {
      icon: Sparkles,
      title: "Personalized Wisdom",
      description: "Get tailored guidance based on your questions"
    },
    {
      icon: Users,
      title: "Multiple Avatars",
      description: "Create and customize your own AI companions"
    },
    {
      icon: Trophy,
      title: "Earn Credits",
      description: "Refer friends and unlock milestone rewards"
    }
  ];

  const testimonials = [
    {
      name: "Priya S.",
      role: "Meditation Practitioner",
      content: "The Buddha avatar has transformed my mindfulness practice. It's like having a personal guide.",
      rating: 5
    },
    {
      name: "Rahul K.",
      role: "Entrepreneur",
      content: "Steve Jobs avatar helps me think differently about my business challenges. Incredible insights!",
      rating: 5
    },
    {
      name: "Anjali M.",
      role: "Spiritual Seeker",
      content: "Ramana Maharshi's wisdom has brought clarity to my spiritual journey. Highly recommend!",
      rating: 5
    }
  ];

  const stats = [
    { value: "10K+", label: "Active Users" },
    { value: "50K+", label: "Conversations" },
    { value: "14", label: "AI Avatars" },
    { value: "4.9/5", label: "User Rating" }
  ];

  // Auto-scroll testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 sm:py-24 animate-fade-in">
        <div className="text-center space-y-8 max-w-4xl mx-auto">
          
          <Badge className="mx-auto" variant="secondary">
            <Sparkles className="w-3 h-3 mr-1" />
            AI-Powered Wisdom Platform
          </Badge>
          
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent balance-text">
            Chat with Divine Sages & Visionary Leaders
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect with AI companions powered by the wisdom of spiritual masters and modern innovators. 
            Get personalized guidance, earn rewards, and embark on your journey of growth.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
              <Button 
                size="lg" 
                className="relative text-lg px-8 py-6 group"
                onClick={() => navigate(user ? "/avatars" : "/auth")}
              >
                {user ? "Start Chatting" : "Get Started Free"}
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <Button 
              size="lg" 
              variant="outline" 
              className="text-lg px-8 py-6"
              onClick={() => scrollToSection("pricing")}
            >
              View Pricing
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="text-3xl sm:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Social Proof */}
          <div className="pt-8">
            <p className="text-sm text-muted-foreground mb-4">Trusted by seekers worldwide</p>
            <div className="flex justify-center gap-8 opacity-50 grayscale">
              <div className="text-2xl">🧘</div>
              <div className="text-2xl">💡</div>
              <div className="text-2xl">🌟</div>
              <div className="text-2xl">🚀</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-16 bg-secondary/20 rounded-3xl my-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary">
            <Zap className="w-3 h-3 mr-1" />
            Features
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">Why Choose SageMitra?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the perfect blend of ancient wisdom and cutting-edge AI technology
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <Card key={idx} className="border-2 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Avatars Preview */}
      <section id="avatars" className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary">
            <Users className="w-3 h-3 mr-1" />
            Meet Your Guides
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">Diverse AI Companions</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            From Buddha to Einstein, from Ramana to Musk - wisdom across ages
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {avatarPreviews.map((avatar) => (
            <Card key={avatar.name} className="hover:scale-105 transition-transform cursor-pointer hover:shadow-lg">
              <CardContent className="p-4 text-center space-y-2">
                <img 
                  src={avatar.image} 
                  alt={avatar.name}
                  loading="lazy"
                  className="w-16 h-16 rounded-full object-cover mx-auto ring-2 ring-primary/20"
                />
                <p className="font-medium text-sm">{avatar.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button onClick={() => navigate(user ? "/avatars" : "/auth")}>
            Explore All Avatars
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Chat Demo Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary">
            <MessageSquare className="w-3 h-3 mr-1" />
            See It In Action
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">Experience AI Wisdom</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See how our AI companions provide personalized guidance and insights
          </p>
        </div>

        <Card className="max-w-3xl mx-auto border-2 border-primary/20 shadow-xl">
          <CardHeader className="border-b bg-secondary/20">
            <div className="flex items-center gap-3">
              <img 
                src={buddhaImg} 
                alt="Buddha"
                className="w-12 h-12 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div>
                <h3 className="font-semibold">Buddha</h3>
                <p className="text-sm text-muted-foreground">Enlightened Teacher</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* User Message */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm">How can I find peace in daily life amidst all the chaos?</p>
              </div>
            </div>

            {/* Avatar Response */}
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-sm leading-relaxed">
                  Peace is not found in external circumstances, but within your own mind. 
                  The chaos you perceive is often a reflection of inner turbulence. 
                  Practice mindfulness - observe your thoughts without judgment, like watching clouds pass in the sky. 
                  When you cultivate inner stillness through meditation and awareness, 
                  you'll discover that peace exists independent of external conditions. 
                  Start with just five minutes of mindful breathing each day.
                </p>
              </div>
            </div>

            {/* User Follow-up */}
            <div className="flex justify-end">
              <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%]">
                <p className="text-sm">What if my mind keeps wandering during meditation?</p>
              </div>
            </div>

            {/* Avatar Response */}
            <div className="flex justify-start">
              <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 max-w-[85%]">
                <p className="text-sm leading-relaxed">
                  A wandering mind is not failure - it is the nature of mind. 
                  The practice lies not in stopping thoughts, but in gently returning awareness to your breath each time you notice distraction. 
                  Each return is a moment of mindfulness, a small victory. 
                  Be patient and compassionate with yourself, as you would with a child learning to walk.
                </p>
              </div>
            </div>
          </CardContent>
          <div className="p-4 border-t bg-secondary/10 text-center">
            <p className="text-sm text-muted-foreground mb-3">Ready to start your own conversation?</p>
            <Button onClick={() => navigate(user ? "/avatars" : "/auth")}>
              {user ? "Chat Now" : "Sign Up Free"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16 bg-secondary/20 rounded-3xl my-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary">
            <Star className="w-3 h-3 mr-1" />
            Testimonials
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">What Our Users Say</h2>
        </div>

        {/* Desktop: Grid View */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial, idx) => (
            <Card key={idx} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6 space-y-4">
                <div className="flex gap-1">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-sm italic">"{testimonial.content}"</p>
                <div>
                  <p className="font-semibold">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="sm:hidden relative">
          <Card className="transition-opacity duration-500">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-1">
                {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                ))}
              </div>
              <p className="text-sm italic">"{testimonials[currentTestimonial].content}"</p>
              <div>
                <p className="font-semibold">{testimonials[currentTestimonial].name}</p>
                <p className="text-xs text-muted-foreground">{testimonials[currentTestimonial].role}</p>
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-center gap-2 mt-4">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTestimonial(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentTestimonial ? "bg-primary w-6" : "bg-muted"
                }`}
                aria-label={`Go to testimonial ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary">
            <CheckCircle className="w-3 h-3 mr-1" />
            Simple Process
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">Get Started in 3 Steps</h2>
        </div>

        <div className="grid sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { num: 1, title: "Sign Up", desc: "Create your free account and get 100 credits" },
            { num: 2, title: "Choose Avatar", desc: "Select from 14+ divine sages and visionaries" },
            { num: 3, title: "Start Chatting", desc: "Ask questions and receive personalized wisdom" }
          ].map((step, idx) => (
            <div key={idx} className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto text-2xl font-bold">
                {step.num}
              </div>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="container mx-auto px-4 py-16">
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/10 to-primary/10 blur-3xl opacity-30"></div>
          <CardContent className="relative p-8 sm:p-12 text-center space-y-6">
            <Shield className="w-16 h-16 text-primary mx-auto" />
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to Begin Your Journey?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of seekers finding wisdom through AI. Get 100 free credits when you sign up today!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-primary rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <Button 
                  size="lg" 
                  className="relative text-lg px-8 py-6"
                  onClick={() => navigate(user ? "/avatars" : "/auth")}
                >
                  {user ? "Go to Dashboard" : "Start Free Trial"}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate("/leaderboard")}
              >
                <Trophy className="mr-2 h-5 w-5" />
                View Leaderboard
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg px-8 py-6"
                onClick={() => navigate("/blog")}
              >
                📚 Resources
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
