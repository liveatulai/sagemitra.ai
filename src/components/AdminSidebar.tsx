import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  ImageIcon, 
  Users, 
  MessageSquare, 
  CreditCard, 
  BarChart3,
  Shield,
  Menu,
  X,
  ChevronLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const sidebarItems = [
  { id: "analytics", label: "Dashboard", icon: LayoutDashboard },
  { id: "avatars", label: "Avatars", icon: ImageIcon },
  { id: "users", label: "Users", icon: Users },
  { id: "feedback", label: "Feedback", icon: MessageSquare },
  { id: "requests", label: "Credit Requests", icon: CreditCard },
  { id: "credits", label: "Credit Management", icon: CreditCard },
  { id: "transactions", label: "Transactions", icon: BarChart3 },
];

export default function AdminSidebar({ activeTab, onTabChange, isOpen, onToggle }: AdminSidebarProps) {
  const navigate = useNavigate();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed left-0 top-0 h-full bg-card border-r z-50 transition-all duration-300",
          "flex flex-col",
          isOpen ? "w-64" : "w-0 lg:w-16"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between min-h-[65px]">
          {isOpen && (
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <span className="font-bold">Admin Panel</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onToggle}
            className={cn(!isOpen && "lg:mx-auto")}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <div className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-all",
                    !isOpen && "lg:justify-center lg:px-2",
                    isActive && "bg-gradient-to-r from-primary to-accent shadow-md"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {isOpen && <span className="truncate">{item.label}</span>}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="p-2 border-t">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3",
              !isOpen && "lg:justify-center lg:px-2"
            )}
            onClick={() => navigate("/avatars")}
          >
            <ChevronLeft className="h-5 w-5 shrink-0" />
            {isOpen && <span>Back to Avatars</span>}
          </Button>
        </div>
      </aside>
    </>
  );
}
