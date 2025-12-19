import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Landing from "./Landing";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate("/avatars");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-background animate-pulse" />;
  }

  if (user) {
    return null;
  }

  return <Landing />;
};

export default Index;
