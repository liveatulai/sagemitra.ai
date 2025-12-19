import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Sparkles } from "lucide-react";

export default function Guidelines() {
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
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              AI Interaction Guidelines 🕊️
            </h1>
            <p className="text-muted-foreground">Cultivating respectful conversations with AI guides ✨</p>
          </div>

          <div className="prose prose-sm max-w-none space-y-6 text-muted-foreground">
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <Heart className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Important Understanding</h3>
                  <p className="text-sm">
                    SageMitra's AI companions are <strong>simulated archetypes</strong> inspired by historical 
                    figures, philosophers, and spiritual teachers. They are <strong>not</strong> the actual 
                    individuals, nor do they channel their spirits. These are AI-generated personas designed 
                    for reflection, guidance, and educational exploration.
                  </p>
                </div>
              </div>
            </div>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">1. What SageMitra Is For</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Personal reflection:</strong> Explore ideas and gain new perspectives</li>
                <li><strong>Philosophical guidance:</strong> Discuss life questions and ethical dilemmas</li>
                <li><strong>Educational exploration:</strong> Learn about different wisdom traditions</li>
                <li><strong>Emotional support:</strong> Receive compassionate, thoughtful responses</li>
                <li><strong>Creative inspiration:</strong> Generate ideas and creative insights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">2. What SageMitra Is NOT For</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Medical advice:</strong> Consult qualified healthcare professionals</li>
                <li><strong>Legal counsel:</strong> Seek licensed legal advisors for legal matters</li>
                <li><strong>Financial guidance:</strong> Consult certified financial advisors</li>
                <li><strong>Crisis intervention:</strong> Contact emergency services or crisis hotlines</li>
                <li><strong>Replacement for therapy:</strong> See licensed mental health professionals</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">3. Understanding AI Limitations</h2>
              <p>Please remember:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>AI can make mistakes or provide inaccurate information</li>
                <li>Responses are generated based on patterns, not lived experience</li>
                <li>The AI doesn't have feelings, consciousness, or genuine understanding</li>
                <li>Historical accuracy is approximated but not guaranteed</li>
                <li>Cultural and spiritual practices are simplified for accessibility</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">4. Best Practices for Engagement</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Be specific:</strong> Clear questions lead to better responses</li>
                <li><strong>Stay curious:</strong> Approach conversations with openness</li>
                <li><strong>Think critically:</strong> Reflect on advice before acting on it</li>
                <li><strong>Respect boundaries:</strong> Avoid sensitive personal crises</li>
                <li><strong>Verify important information:</strong> Cross-check with reliable sources</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">5. Prohibited Use</h2>
              <p>Do not use SageMitra to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Generate harmful, illegal, or unethical content</li>
                <li>Impersonate real individuals or spread misinformation</li>
                <li>Harass, abuse, or manipulate others</li>
                <li>Violate intellectual property or privacy rights</li>
                <li>Bypass security measures or exploit vulnerabilities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">6. Cultural Sensitivity</h2>
              <p>
                SageMitra draws from diverse spiritual and philosophical traditions. We strive for 
                respectful representation but acknowledge that AI simplifications cannot capture the 
                full depth of any tradition. We welcome feedback to improve cultural accuracy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">7. Emotional Well-being</h2>
              <p>
                While our AI companions offer compassionate responses, they are not substitutes for 
                professional mental health support. If you're experiencing distress:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>US Crisis Line:</strong> 988 (Suicide & Crisis Lifeline)</li>
                <li><strong>Crisis Text Line:</strong> Text "HELLO" to 741741</li>
                <li><strong>International:</strong> Find resources at findahelpline.com</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">8. Privacy Reminder</h2>
              <p>
                Your conversations are private and stored securely. However, avoid sharing highly 
                sensitive personal information (passwords, financial details, etc.) in any online 
                platform, including SageMitra.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">9. Continuous Improvement</h2>
              <p>
                We actively work to improve AI responses, cultural accuracy, and safety measures. 
                Your feedback helps us create a more meaningful and responsible experience. Please 
                report any concerning interactions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">10. Agreement to Guidelines</h2>
              <p>
                By using SageMitra, you agree to use the platform responsibly and in accordance with 
                these guidelines. We reserve the right to suspend accounts that violate these terms.
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
