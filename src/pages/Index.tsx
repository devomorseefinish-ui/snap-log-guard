import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Clock, Shield, Camera, Users } from 'lucide-react';
import CloudSetupWarning from '@/components/CloudSetupWarning';

const Index = () => {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();
  const hasSupabaseEnv = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!hasSupabaseEnv) {
    return <CloudSetupWarning />;
  }

  useEffect(() => {
    if (!loading && user) {
      if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, role, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Attendance System
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Professional attendance tracking with photo verification. 
            Secure, reliable, and easy to use.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate('/auth')} className="text-lg px-8">
              Get Started
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-8 pt-16">
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <Camera className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Photo Verification</h3>
              <p className="text-sm text-muted-foreground">
                Capture photos during check-in for foolproof verification
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <Shield className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Admin Control</h3>
              <p className="text-sm text-muted-foreground">
                Comprehensive dashboard for managing users and attendance
              </p>
            </div>
            
            <div className="p-6 rounded-lg bg-card border shadow-sm">
              <Users className="w-12 h-12 text-primary mb-4 mx-auto" />
              <h3 className="font-semibold text-lg mb-2">Real-time Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor attendance in real-time with instant notifications
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
