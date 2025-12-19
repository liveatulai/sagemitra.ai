import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ScrollText } from "lucide-react";

export default function Terms() {
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
              <ScrollText className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              Terms of Service
            </h1>
            <p className="text-muted-foreground">Clear, transparent, and designed for your peace of mind ✨</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using SageMitra, you accept and agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. Description of Service</h2>
              <p>
                SageMitra provides AI-powered conversational companions based on historical, philosophical, 
                and spiritual archetypes. These are simulated personas for educational, reflective, and 
                guidance purposes only.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. User Responsibilities</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li>You must be at least 13 years old to use SageMitra</li>
                <li>You are responsible for maintaining the confidentiality of your account</li>
                <li>You agree not to misuse the service or violate any applicable laws</li>
                <li>You understand that AI responses are generated, not from actual historical figures</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Credits and Payment</h2>
              <p>
                SageMitra operates on a credit-based system. Credits are consumed for various actions 
                including chat messages and avatar creation. Credit purchases are non-refundable except 
                as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Intellectual Property</h2>
              <p>
                All content, features, and functionality of SageMitra are owned by us and are protected 
                by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Disclaimer of Warranties</h2>
              <p>
                SageMitra is provided "as is" without warranties of any kind. We do not guarantee that 
                the service will be uninterrupted, secure, or error-free. AI responses are for informational 
                and reflective purposes only and should not be considered professional advice.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Limitation of Liability</h2>
              <p>
                We shall not be liable for any indirect, incidental, special, consequential, or punitive 
                damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. Continued use of the service 
                after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Contact</h2>
              <p>
                For questions about these Terms of Service, please contact us through the feedback 
                section in the app.
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
