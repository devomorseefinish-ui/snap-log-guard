import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase, AttendanceRecord, Profile, UserRole } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  LogOut, 
  Users, 
  Calendar, 
  TrendingUp, 
  Shield,
  CheckCircle2,
  XCircle,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UserWithRole extends Profile {
  user_roles: UserRole[];
}

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [records, setRecords] = useState<(AttendanceRecord & { profiles: Profile })[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, todayCheckIns: 0, totalCheckIns: 0 });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
    fetchRecords();
    fetchStats();
  }, []);

  const fetchUsers = async () => {
    const { data } = await (supabase as any)
      .from('profiles')
      .select('*, user_roles(*)');
    
    if (data) setUsers(data);
  };

  const fetchRecords = async () => {
    const { data } = await supabase
      .from('attendance_records' as any)
      .select('*, profiles(*)')
      .order('check_in_time', { ascending: false })
      .limit(50);
    
    if (data) setRecords(data as any);
  };

  const fetchStats = async () => {
    const { count: totalUsers } = await supabase
      .from('profiles' as any)
      .select('*', { count: 'exact', head: true });

    const today = new Date().toISOString().split('T')[0];
    const { count: todayCheckIns } = await supabase
      .from('attendance_records' as any)
      .select('*', { count: 'exact', head: true })
      .gte('check_in_time', today);

    const { count: totalCheckIns } = await supabase
      .from('attendance_records' as any)
      .select('*', { count: 'exact', head: true });

    setStats({
      totalUsers: totalUsers || 0,
      todayCheckIns: todayCheckIns || 0,
      totalCheckIns: totalCheckIns || 0,
    });
  };

  const toggleUserRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    
    const { error } = await supabase
      .from('user_roles' as any)
      .update({ role: newRole } as any)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `User role updated to ${newRole}` });
      fetchUsers();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.todayCheckIns}</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Check-ins</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCheckIns}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="attendance">Attendance Records</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>All Attendance Records</CardTitle>
                <CardDescription>View and manage user check-ins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {records.map((record) => (
                    <div key={record.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex flex-col md:flex-row gap-4">
                        <img 
                          src={record.photo_url} 
                          alt="Check-in"
                          className="w-32 h-32 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedImage(record.photo_url)}
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{record.profiles?.full_name || 'Unknown'}</h3>
                            <span className={`text-xs px-3 py-1 rounded-full ${
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {record.status}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{record.profiles?.email}</p>
                          <p className="text-sm">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {format(new Date(record.check_in_time), 'PPp')}
                          </p>
                          {record.notes && (
                            <p className="text-sm border-l-2 pl-2 text-muted-foreground">
                              {record.notes}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage user roles and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                      <div>
                        <p className="font-semibold">{user.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3 py-1 rounded-full ${
                          user.user_roles?.[0]?.role === 'admin'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {user.user_roles?.[0]?.role || 'user'}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleUserRole(user.id, user.user_roles?.[0]?.role || 'user')}
                        >
                          {user.user_roles?.[0]?.role === 'admin' ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              Remove Admin
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Make Admin
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Image Preview Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Check-in Photo</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img src={selectedImage} alt="Full size" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
