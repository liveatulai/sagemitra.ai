import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Sparkles, Brain, TrendingUp, Clock } from "lucide-react";

export default function Blog() {
  const navigate = useNavigate();

  const articles = [
    {
      id: 1,
      title: "The Science Behind AI Companions: How They Learn and Adapt",
      category: "AI Technology",
      excerpt: "Discover how modern AI companions use advanced language models to provide personalized guidance and maintain consistent personalities across conversations.",
      author: "SageMitra Team",
      date: "2024-11-01",
      readTime: "8 min read",
      icon: Brain
    },
    {
      id: 2,
      title: "Ancient Wisdom Meets Modern Technology: The Future of Spiritual Guidance",
      category: "Spiritual Wisdom",
      excerpt: "Explore how AI technology is making the teachings of Buddha, Ramana Maharshi, and other spiritual masters accessible to everyone, anytime, anywhere.",
      author: "Dr. Priya Sharma",
      date: "2024-10-28",
      readTime: "6 min read",
      icon: Sparkles
    },
    {
      id: 3,
      title: "Getting Started with SageMitra: A Complete Beginner's Guide",
      category: "Getting Started",
      excerpt: "Learn how to choose the right avatar, craft effective questions, and make the most of your conversations with AI companions on SageMitra.",
      author: "Rahul Krishnan",
      date: "2024-10-25",
      readTime: "10 min read",
      icon: BookOpen
    },
    {
      id: 4,
      title: "Maximizing Your Credits: Smart Tips for Extended Conversations",
      category: "Tips & Tricks",
      excerpt: "Practical strategies to get the most value from your credits, including milestone rewards, referral bonuses, and conversation optimization techniques.",
      author: "SageMitra Team",
      date: "2024-10-20",
      readTime: "5 min read",
      icon: TrendingUp
    },
    {
      id: 5,
      title: "The Philosophy of Self-Inquiry: Lessons from Ramana Maharshi",
      category: "Spiritual Wisdom",
      excerpt: "Dive deep into the practice of self-inquiry as taught by Ramana Maharshi and how AI companions can guide you through this transformative journey.",
      author: "Anjali Menon",
      date: "2024-10-15",
      readTime: "12 min read",
      icon: Sparkles
    },
    {
      id: 6,
      title: "Innovation and Intuition: Wisdom from Steve Jobs and Elon Musk",
      category: "Modern Visionaries",
      excerpt: "Learn how to apply the innovative thinking patterns of tech visionaries to solve your own creative and business challenges.",
      author: "Vikram Patel",
      date: "2024-10-10",
      readTime: "7 min read",
      icon: Brain
    }
  ];

  const categories = ["All", "AI Technology", "Spiritual Wisdom", "Getting Started", "Tips & Tricks", "Modern Visionaries"];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">SageMitra Resources</h1>
            <p className="text-sm text-muted-foreground">Wisdom, guides, and insights</p>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-16">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <Badge variant="secondary" className="mb-2">
            <BookOpen className="w-3 h-3 mr-1" />
            Knowledge Base
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold">Explore Wisdom & Learn</h2>
          <p className="text-lg text-muted-foreground">
            Discover articles, guides, and insights about spiritual wisdom, AI companions, 
            and how to make the most of your journey with SageMitra.
          </p>
        </div>
      </section>

      <Separator className="container mx-auto" />

      {/* Categories */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <Badge
              key={category}
              variant={category === "All" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
            >
              {category}
            </Badge>
          ))}
        </div>
      </section>

      {/* Articles Grid */}
      <section className="container mx-auto px-4 py-8 pb-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const IconComponent = article.icon;
            return (
              <Card 
                key={article.id} 
                className="hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group"
                onClick={() => navigate(`/blog/${article.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {article.category}
                    </Badge>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {article.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {article.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{article.readTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Articles
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-12 mb-16">
        <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-8 sm:p-12 text-center space-y-4">
            <h3 className="text-2xl sm:text-3xl font-bold">Ready to Experience SageMitra?</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Start your journey with AI companions and get 100 free credits to explore wisdom from divine sages and modern visionaries.
            </p>
            <Button size="lg" onClick={() => navigate("/auth")}>
              Get Started Free
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
