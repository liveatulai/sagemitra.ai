import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { 
  Shield, Users, ImageIcon, MessageSquare, CreditCard, TrendingUp, BarChart3, 
  Trash2, Eye, EyeOff, Filter, Search
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AdminSidebar from "@/components/AdminSidebar";
import AvatarAnalytics from "@/components/AvatarAnalytics";

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics");
  const [avatars, setAvatars] = useState<any[]>([]);
  const [customAvatars, setCustomAvatars] = useState<any[]>([]);
  const [avatarFilter, setAvatarFilter] = useState<'all' | 'active' | 'disabled'>('all');
  const [avatarSearch, setAvatarSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<any[]>([]);
  const [creditRequests, setCreditRequests] = useState<any[]>([]);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const [creditAdjustment, setCreditAdjustment] = useState<{ [key: string]: string }>({});
  const [analytics, setAnalytics] = useState<any>({
    userGrowth: [],
    chatStats: {},
    creditTrends: [],
    topAvatars: []
  });
  const [transactionFilter, setTransactionFilter] = useState({
    search: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  });
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, [user]);

  const checkAdminAccess = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-admin');

      if (error || !data?.isAdmin) {
        if (!sessionStorage.getItem('admin-access-denied')) {
          toast.error("Admin access required.");
          sessionStorage.setItem('admin-access-denied', 'true');
        }
        navigate("/avatars");
        return;
      }
      
      sessionStorage.removeItem('admin-access-denied');

      setIsAdmin(true);
      await Promise.all([
        loadAvatars(), 
        loadCustomAvatars(),
        loadUsers(), 
        loadFeedback(), 
        loadCreditRequests(), 
        loadAnalytics(), 
        loadAllTransactions()
      ]);
    } catch (error) {
      console.error("Error checking admin access:", error);
      toast.error("Failed to verify admin access");
      navigate("/avatars");
    } finally {
      setLoading(false);
    }
  };

  const loadAvatars = async () => {
    const { data, error } = await supabase
      .from("avatars")
      .select("*")
      .order("name");

    if (error) {
      console.error("Error loading avatars:", error);
      toast.error("Failed to load avatars");
      return;
    }

    setAvatars(data || []);
  };

  const loadCustomAvatars = async () => {
    const { data, error } = await supabase
      .from("user_avatars")
      .select("*, profiles(full_name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading custom avatars:", error);
      return;
    }

    setCustomAvatars(data || []);
  };

  const loadUsers = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: roles } = await supabase
      .from("user_roles")
      .select("*");

    const { data: creditsData } = await supabase
      .from("credits")
      .select("*");

    const usersWithRoles = (profiles || []).map((profile) => ({
      ...profile,
      roles: (roles || [])
        .filter((r) => r.user_id === profile.id)
        .map((r) => r.role),
      credits: creditsData?.find((c) => c.user_id === profile.id)?.balance || 0
    }));

    setUsers(usersWithRoles);
  };

  const toggleAvatarStatus = async (avatarId: string, currentStatus: boolean, isCustom: boolean = false) => {
    try {
      if (isCustom) {
        const { error } = await supabase
          .from('user_avatars')
          .update({ is_active: !currentStatus })
          .eq('id', avatarId);

        if (error) throw error;
      } else {
        const { error } = await supabase.functions.invoke('admin-update-avatar', {
          body: { avatarId, isActive: !currentStatus }
        });

        if (error) throw error;
      }

      toast.success(`Avatar ${!currentStatus ? "enabled" : "disabled"}`);
      await loadAvatars();
      await loadCustomAvatars();
    } catch (error) {
      toast.error("Failed to update avatar status");
    }
  };

  const toggleAvatarVisibility = async (avatarId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('user_avatars')
        .update({ is_public: !currentStatus })
        .eq('id', avatarId);

      if (error) throw error;

      toast.success(`Avatar is now ${!currentStatus ? "public" : "private"}`);
      await loadCustomAvatars();
    } catch (error) {
      toast.error("Failed to update avatar visibility");
    }
  };

  const deleteAvatar = async (avatarId: string, isCustom: boolean = false) => {
    try {
      if (isCustom) {
        const { error } = await supabase
          .from('user_avatars')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', avatarId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('avatars')
          .delete()
          .eq('id', avatarId);

        if (error) throw error;
      }

      toast.success("Avatar deleted successfully");
      await loadAvatars();
      await loadCustomAvatars();
    } catch (error) {
      toast.error("Failed to delete avatar");
    }
  };

  const updateUserRole = async (userId: string, role: string) => {
    // Prevent self-downgrade
    if (user?.id === userId && role !== 'admin') {
      toast.error("You cannot remove your own admin privileges", {
        description: "This is a security measure to prevent accidental lockout.",
        duration: 5000,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-assign-role', {
        body: { userId, role }
      });

      if (error) throw error;
      
      // Check for backend self-downgrade prevention
      if (data?.code === 'SELF_DOWNGRADE_DENIED') {
        toast.error("You cannot remove your own admin privileges");
        return;
      }

      toast.success("User role updated");
      loadUsers();
    } catch (error: any) {
      console.error("Update role error:", error);
      toast.error(error.message || "Failed to update user role");
    }
  };

  const loadFeedback = async () => {
    const { data } = await supabase
      .from('user_feedback')
      .select('*, profiles(full_name)')
      .order('upvotes', { ascending: false })
      .order('created_at', { ascending: false });
    
    if (data) setFeedback(data);
  };

  const loadCreditRequests = async () => {
    const { data } = await supabase
      .from('credit_requests')
      .select('*, profiles(full_name, email)')
      .order('created_at', { ascending: false });
    
    if (data) setCreditRequests(data);
  };

  const updateFeedbackStatus = async (feedbackId: string, status: string) => {
    const { error } = await supabase
      .from('user_feedback')
      .update({ status })
      .eq('id', feedbackId);

    if (error) {
      toast.error("Failed to update feedback status");
      return;
    }

    toast.success("Feedback status updated");
    loadFeedback();
  };

  const adjustUserCredits = async (userId: string, adjustment: number) => {
    try {
      const { error } = await supabase.functions.invoke('admin-adjust-credits', {
        body: { userId, adjustment }
      });

      if (error) throw error;

      toast.success(`Credits adjusted: ${adjustment > 0 ? '+' : ''}${adjustment}`);
      setCreditAdjustment({ ...creditAdjustment, [userId]: '' });
      loadUsers();
    } catch (error) {
      toast.error("Failed to adjust credits");
    }
  };

  const processCreditRequest = async (requestId: string, approve: boolean) => {
    setProcessingRequest(requestId);
    try {
      const { error } = await supabase.functions.invoke('process-credit-request', {
        body: { 
          requestId, 
          approve,
          adminNotes: adminNotes[requestId] || undefined
        }
      });

      if (error) throw error;

      toast.success(`Request ${approve ? 'approved' : 'rejected'}`);
      setAdminNotes({ ...adminNotes, [requestId]: '' });
      loadCreditRequests();
      loadUsers();
    } catch (error) {
      console.error("Process request error:", error);
      toast.error("Failed to process request");
    } finally {
      setProcessingRequest(null);
    }
  };

  const loadAllTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Transaction load error:", error);
        setAllTransactions([]);
        setFilteredTransactions([]);
        return;
      }
      
      setAllTransactions(data || []);
      setFilteredTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
      setAllTransactions([]);
      setFilteredTransactions([]);
    }
  };

  useEffect(() => {
    filterTransactions();
  }, [transactionFilter, allTransactions]);

  const filterTransactions = () => {
    let filtered = [...allTransactions];

    if (transactionFilter.search) {
      filtered = filtered.filter(tx => 
        (tx.profiles?.full_name?.toLowerCase().includes(transactionFilter.search.toLowerCase())) ||
        (tx.description?.toLowerCase().includes(transactionFilter.search.toLowerCase()))
      );
    }

    if (transactionFilter.startDate) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) >= new Date(transactionFilter.startDate)
      );
    }
    if (transactionFilter.endDate) {
      const endDate = new Date(transactionFilter.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) <= endDate
      );
    }

    if (transactionFilter.minAmount) {
      filtered = filtered.filter(tx => 
        Math.abs(tx.amount) >= parseInt(transactionFilter.minAmount)
      );
    }
    if (transactionFilter.maxAmount) {
      filtered = filtered.filter(tx => 
        Math.abs(tx.amount) <= parseInt(transactionFilter.maxAmount)
      );
    }

    setFilteredTransactions(filtered);
  };

  const loadAnalytics = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      const userGrowthMap = new Map();
      profilesData?.forEach(profile => {
        const date = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        userGrowthMap.set(date, (userGrowthMap.get(date) || 0) + 1);
      });

      const userGrowth = Array.from(userGrowthMap.entries()).map(([date, count]) => ({
        date,
        users: count
      }));

      const { data: sessionsData, count: totalSessions } = await supabase
        .from('chat_sessions')
        .select('*', { count: 'exact' });

      const { data: messagesData, count: totalMessages } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact' });

      const { data: recentSessions } = await supabase
        .from('chat_sessions')
        .select('created_at')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const { data: transactionsData } = await supabase
        .from('credit_transactions')
        .select('amount, type, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at');

      const creditTrendsMap = new Map();
      transactionsData?.forEach(tx => {
        const date = new Date(tx.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const current = creditTrendsMap.get(date) || { date, credits: 0, debits: 0 };
        if (tx.type === 'earned') {
          current.credits += tx.amount;
        } else {
          current.debits += Math.abs(tx.amount);
        }
        creditTrendsMap.set(date, current);
      });

      const creditTrends = Array.from(creditTrendsMap.values());

      const { data: sessionsForAvatars } = await supabase
        .from('chat_sessions')
        .select('avatar_id');

      const { data: allAvatarsData } = await supabase
        .from('avatars')
        .select('id, name');

      const avatarMap = new Map(allAvatarsData?.map(a => [a.id, a.name]) || []);
      const avatarCountMap = new Map();
      
      sessionsForAvatars?.forEach(session => {
        const name = avatarMap.get(session.avatar_id) || 'Unknown';
        avatarCountMap.set(name, (avatarCountMap.get(name) || 0) + 1);
      });

      const topAvatars = Array.from(avatarCountMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setAnalytics({
        userGrowth,
        chatStats: {
          totalSessions: totalSessions || 0,
          totalMessages: totalMessages || 0,
          activeSessions: recentSessions?.length || 0,
          avgMessagesPerSession: totalSessions ? Math.round((totalMessages || 0) / totalSessions) : 0
        },
        creditTrends,
        topAvatars
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
      toast.error("Failed to load analytics");
    }
  };

  const filteredAvatarsList = () => {
    const allAvatarsList = [
      ...avatars.map(a => ({ ...a, isCustom: false })),
      ...customAvatars.map(a => ({ ...a, isCustom: true }))
    ];

    let filtered = allAvatarsList;

    // Apply status filter
    if (avatarFilter === 'active') {
      filtered = filtered.filter(a => a.is_active);
    } else if (avatarFilter === 'disabled') {
      filtered = filtered.filter(a => !a.is_active);
    }

    // Apply search filter
    if (avatarSearch) {
      filtered = filtered.filter(a => 
        a.name?.toLowerCase().includes(avatarSearch.toLowerCase()) ||
        a.title?.toLowerCase().includes(avatarSearch.toLowerCase()) ||
        a.tags?.some((tag: string) => tag.toLowerCase().includes(avatarSearch.toLowerCase()))
      );
    }

    return filtered;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content - only offset on large screens */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'}`}>
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
          {/* Header with mobile menu toggle */}
          <div className="flex items-center gap-3 mb-6 sm:mb-8 pl-12 lg:pl-0">
            <Shield className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Manage avatars, users, feedback, and credits</p>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">

            {/* Analytics Tab */}
            <TabsContent value="analytics">
                <div className="grid gap-4 md:gap-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="hover-glow transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Total Users
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {users.length}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-glow transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Total Chats
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {analytics.chatStats.totalSessions}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-glow transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        Total Messages
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {analytics.chatStats.totalMessages}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="hover-glow transition-all hover:shadow-lg">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Active Sessions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                        {analytics.chatStats.activeSessions}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>User Growth (Last 30 Days)</CardTitle>
                    <CardDescription>New user registrations over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.userGrowth}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="date" className="text-xs" />
                          <YAxis className="text-xs" />
                          <Tooltip />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="users" 
                            stroke="hsl(var(--primary))" 
                            strokeWidth={2}
                            name="New Users"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Credit Usage Trends</CardTitle>
                      <CardDescription>Credits earned vs spent</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={analytics.creditTrends}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="date" className="text-xs" />
                            <YAxis className="text-xs" />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="credits" fill="hsl(var(--primary))" name="Credits Earned" />
                            <Bar dataKey="debits" fill="hsl(var(--destructive))" name="Credits Spent" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Top 5 Avatars</CardTitle>
                      <CardDescription>Most popular avatars by chat sessions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={analytics.topAvatars}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              outerRadius={80}
                              fill="hsl(var(--primary))"
                              dataKey="value"
                            >
                              {analytics.topAvatars.map((entry: any, index: number) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Avatar-Specific Analytics */}
                <div className="mt-6">
                  <AvatarAnalytics />
                </div>
              </div>
            </TabsContent>

            {/* Avatars Tab */}
            <TabsContent value="avatars">
              <Card>
                <CardHeader className="space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <CardTitle>Avatars Management</CardTitle>
                      <CardDescription>Manage all avatars - Total: {filteredAvatarsList().length} avatars</CardDescription>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1 sm:flex-none">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or tag..."
                          value={avatarSearch}
                          onChange={(e) => setAvatarSearch(e.target.value)}
                          className="pl-9 w-full sm:w-[220px]"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Select value={avatarFilter} onValueChange={(v: any) => setAvatarFilter(v)}>
                          <SelectTrigger className="w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="active">Active Only</SelectItem>
                            <SelectItem value="disabled">Disabled Only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredAvatarsList().length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <p className="text-lg mb-2">No avatars found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  ) : (
                    filteredAvatarsList().map((avatar) => (
                    <div key={avatar.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                          {avatar.image_url && (
                          <div className="h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={avatar.image_url}
                              alt={avatar.name}
                              className="w-full h-full object-cover"
                              style={{ aspectRatio: '1/1' }}
                              loading="lazy"
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{avatar.name}</p>
                            {avatar.isCustom && (
                              <Badge variant="outline" className="text-xs">
                                {avatar.is_public ? "Public" : "Private"}
                              </Badge>
                            )}
                            {avatar.isCustom && (
                              <span className="text-xs text-muted-foreground truncate">
                                by {avatar.profiles?.full_name || "Unknown"}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {avatar.category} {avatar.strength && `• ${avatar.strength}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={avatar.is_active ? "default" : "secondary"}>
                          {avatar.is_active ? "Active" : "Disabled"}
                        </Badge>
                        <Switch
                          checked={avatar.is_active}
                          onCheckedChange={() => toggleAvatarStatus(avatar.id, avatar.is_active, avatar.isCustom)}
                        />
                        {avatar.isCustom && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAvatarVisibility(avatar.id, avatar.is_public)}
                            title={avatar.is_public ? "Make Private" : "Make Public"}
                          >
                            {avatar.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Avatar?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{avatar.name}". This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteAvatar(avatar.id, avatar.isCustom)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <Card>
                <CardHeader>
                  <CardTitle>Users Management</CardTitle>
                  <CardDescription>Assign roles and manage permissions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name || user.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        <Badge variant="outline" className="mt-1">Credits: {user.credits}</Badge>
                      </div>
                      <Select
                        value={user.roles[0] || "user"}
                        onValueChange={(value) => updateUserRole(user.id, value)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Feedback Tab */}
            <TabsContent value="feedback">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Feedback Hub 🪶</CardTitle>
                      <CardDescription>User feedback, feature requests, and bug reports - {feedback.length} total</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {feedback.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p className="text-lg mb-2">No feedback yet</p>
                      <p className="text-sm">User feedback will appear here</p>
                    </div>
                  ) : (
                    feedback.map((item) => (
                    <div key={item.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            by {item.profiles?.full_name || item.profiles?.email || "Anonymous"}
                          </p>
                          <p className="text-sm mt-2">{item.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 items-end flex-shrink-0">
                          <Badge variant="outline">{item.type}</Badge>
                          <Badge>{item.upvotes || 0} upvotes</Badge>
                        </div>
                      </div>
                      <Select
                        value={item.status}
                        onValueChange={(value) => updateFeedbackStatus(item.id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="planned">Planned</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credit Requests Tab */}
            <TabsContent value="requests">
              <Card>
                <CardHeader>
                  <CardTitle>Credit Requests</CardTitle>
                  <CardDescription>Review and process user credit requests</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {creditRequests.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No credit requests</p>
                  ) : (
                    creditRequests.map((req) => (
                      <div key={req.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium truncate">{req.profiles?.full_name || req.profiles?.email || "Unknown"}</p>
                              <Badge
                                variant={
                                  req.status === 'approved'
                                    ? 'default'
                                    : req.status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Requested: <span className="font-medium">{req.amount} credits</span>
                            </p>
                            <p className="text-sm mt-2">{req.reason}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(req.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        {req.status === 'pending' && (
                          <div className="space-y-2 pt-2 border-t">
                            <Input
                              placeholder="Admin notes (optional)"
                              value={adminNotes[req.id] || ''}
                              onChange={(e) => setAdminNotes({ ...adminNotes, [req.id]: e.target.value })}
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => processCreditRequest(req.id, true)}
                                disabled={processingRequest === req.id}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => processCreditRequest(req.id, false)}
                                disabled={processingRequest === req.id}
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        {req.admin_notes && (
                          <div className="text-sm p-2 bg-secondary/20 rounded border">
                            <strong>Admin notes:</strong> {req.admin_notes}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Credits Tab */}
            <TabsContent value="credits">
              <Card>
                <CardHeader>
                  <CardTitle>Credits Management</CardTitle>
                  <CardDescription>Adjust user credit balances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {users.map((user) => (
                    <div key={user.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{user.full_name || user.email}</p>
                        <Badge variant="secondary" className="mt-1">Balance: {user.credits} credits</Badge>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Input
                          type="number"
                          placeholder="±Amount"
                          value={creditAdjustment[user.id] || ''}
                          onChange={(e) => setCreditAdjustment({ ...creditAdjustment, [user.id]: e.target.value })}
                          className="w-24"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            const amount = parseInt(creditAdjustment[user.id] || '0');
                            if (amount !== 0) adjustUserCredits(user.id, amount);
                          }}
                        >
                          Adjust
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Credit Transactions</CardTitle>
                  <CardDescription>Search and filter all credit transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-secondary/20 rounded-lg">
                    <div className="lg:col-span-2">
                      <Label htmlFor="search">Search</Label>
                      <Input
                        id="search"
                        placeholder="User name or description..."
                        value={transactionFilter.search}
                        onChange={(e) => setTransactionFilter({ ...transactionFilter, search: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={transactionFilter.startDate}
                        onChange={(e) => setTransactionFilter({ ...transactionFilter, startDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={transactionFilter.endDate}
                        onChange={(e) => setTransactionFilter({ ...transactionFilter, endDate: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 lg:col-span-1 flex gap-2">
                      <div className="flex-1">
                        <Label htmlFor="minAmount">Min</Label>
                        <Input
                          id="minAmount"
                          type="number"
                          placeholder="0"
                          value={transactionFilter.minAmount}
                          onChange={(e) => setTransactionFilter({ ...transactionFilter, minAmount: e.target.value })}
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor="maxAmount">Max</Label>
                        <Input
                          id="maxAmount"
                          type="number"
                          placeholder="999"
                          value={transactionFilter.maxAmount}
                          onChange={(e) => setTransactionFilter({ ...transactionFilter, maxAmount: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-sm text-muted-foreground">
                      Showing {filteredTransactions.length} of {allTransactions.length} transactions
                    </div>
                    {filteredTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 border rounded-lg flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tx.profiles?.full_name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground truncate">{tx.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant={tx.amount > 0 ? "default" : "secondary"} className="flex-shrink-0">
                          {tx.amount > 0 ? '+' : ''}{tx.amount}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
