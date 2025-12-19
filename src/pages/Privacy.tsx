import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

export default function Privacy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 p-4 md:p-8 animate-fade-in">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="bg-card/95 backdrop-blur rounded-2xl p-6 md:p-10 shadow-elevated border border-primary/10">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-3">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">Clear, transparent, and designed for your peace of mind ✨</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Information We Collect</h2>
              <p>We collect information you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Account Information:</strong> Email address, name, and password</li>
                <li><strong>Conversation Data:</strong> Messages exchanged with AI avatars</li>
                <li><strong>Usage Data:</strong> Interactions with the platform, feature usage</li>
                <li><strong>Technical Data:</strong> Device information, IP address, browser type</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve SageMitra services</li>
                <li>Personalize your experience and avatar interactions</li>
                <li>Process transactions and manage your credits</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your feedback and requests</li>
                <li>Analyze usage patterns to enhance the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Data Storage and Security</h2>
              <p>
                Your data is stored securely using industry-standard encryption. We use Supabase 
                for data storage, which provides enterprise-grade security measures. However, no 
                method of transmission over the internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Conversation Privacy</h2>
              <p>
                Your conversations with AI avatars are private and stored securely. We do not share 
                your conversation content with third parties. Conversations may be used in aggregate 
                form (anonymized) to improve AI responses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Third-Party Services</h2>
              <p>We use the following third-party services:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Google Gemini:</strong> For AI conversation generation</li>
                <li><strong>Supabase:</strong> For authentication and data storage</li>
                <li><strong>Analytics:</strong> To understand usage patterns (anonymized)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Your Rights</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Access your personal data</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your account and data</li>
                <li>Opt out of marketing communications</li>
                <li>Export your conversation history</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Data Retention</h2>
              <p>
                We retain your information for as long as your account is active or as needed to 
                provide services. You may request deletion of your account at any time through 
                account settings.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Children's Privacy</h2>
              <p>
                SageMitra is not intended for users under 13. We do not knowingly collect information 
                from children under 13. If you are a parent and believe your child has provided us 
                with information, please contact us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Changes to Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant 
                changes by email or through the platform. Continued use after changes constitutes 
                acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights, please contact us through 
                the feedback section in the app or email privacy@sagemitra.com.
              </p>
            </section>

            <div className="mt-12 pt-6 border-t border-border/50 text-center space-y-2">
              <p className="text-xs text-muted-foreground italic">
                All avatars on SageMitra are simulated entities for reflective and educational purposes only.
              </p>
              <p className="text-sm text-muted-foreground font-medium">
                SageMitra © 2025 • Designed with ✨ for seekers and thinkers
              </p>
              <p className="text-xs text-muted-foreground">
                Effective Date: January 2025
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
