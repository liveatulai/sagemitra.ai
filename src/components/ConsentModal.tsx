import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollText, Shield, Sparkles } from "lucide-react";

interface ConsentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ConsentModal({ open, onOpenChange }: ConsentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Legal Information
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="terms" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3 px-6">
            <TabsTrigger value="terms" className="text-xs sm:text-sm">
              <ScrollText className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Terms
            </TabsTrigger>
            <TabsTrigger value="privacy" className="text-xs sm:text-sm">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="guidelines" className="text-xs sm:text-sm">
              <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Guidelines
            </TabsTrigger>
          </TabsList>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="terms" className="mt-0 space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">1. Acceptance of Terms</h3>
                <p>By accessing SageMitra, you accept these Terms. If you disagree, please do not use our service.</p>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">2. Description of Service</h3>
                <p>SageMitra provides AI-powered conversational companions based on historical and spiritual archetypes for educational and reflective purposes.</p>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">3. User Responsibilities</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Must be at least 13 years old</li>
                  <li>Maintain account confidentiality</li>
                  <li>Not misuse the service or violate laws</li>
                  <li>Understand AI responses are generated, not from actual historical figures</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">4. Credits and Payment</h3>
                <p>SageMitra operates on a credit-based system. Credits are consumed for actions including chat messages. Purchases are non-refundable except as required by law.</p>
              </section>
              
              <p className="text-xs text-muted-foreground pt-4">Last updated: January 2025</p>
            </TabsContent>
            
            <TabsContent value="privacy" className="mt-0 space-y-4 text-sm text-muted-foreground">
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">1. Information We Collect</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Account:</strong> Email, name, password</li>
                  <li><strong>Conversations:</strong> Messages with AI avatars</li>
                  <li><strong>Usage:</strong> Platform interactions</li>
                  <li><strong>Technical:</strong> Device info, IP address</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">2. How We Use Your Information</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Provide and improve services</li>
                  <li>Personalize experience</li>
                  <li>Process transactions</li>
                  <li>Send notifications and support</li>
                  <li>Analyze usage patterns</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">3. Conversation Privacy</h3>
                <p>Your conversations are private and stored securely. We do not share content with third parties. Conversations may be used in aggregate (anonymized) to improve AI.</p>
              </section>
              
              <p className="text-xs text-muted-foreground pt-4">Last updated: January 2025</p>
            </TabsContent>
            
            <TabsContent value="guidelines" className="mt-0 space-y-4 text-sm text-muted-foreground">
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-foreground">
                  SageMitra's AI companions are <strong>simulated archetypes</strong> inspired by historical figures. They are <strong>not</strong> the actual individuals.
                </p>
              </div>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">What SageMitra Is For</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Personal reflection and perspective</li>
                  <li>Philosophical guidance</li>
                  <li>Educational exploration</li>
                  <li>Emotional support</li>
                  <li>Creative inspiration</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">What SageMitra Is NOT For</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Medical, legal, or financial advice</li>
                  <li>Crisis intervention (contact emergency services)</li>
                  <li>Replacement for professional therapy</li>
                </ul>
              </section>
              
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">Understanding AI Limitations</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>AI can make mistakes</li>
                  <li>Responses are generated, not from lived experience</li>
                  <li>No genuine consciousness or feelings</li>
                  <li>Historical accuracy is approximated</li>
                </ul>
              </section>
              
              <p className="text-xs text-muted-foreground pt-4">Last updated: January 2025</p>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
