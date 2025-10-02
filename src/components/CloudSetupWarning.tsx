import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export default function CloudSetupWarning() {
  const hasSupabaseEnv = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (hasSupabaseEnv) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20">
      <Alert className="max-w-2xl border-orange-200 bg-white dark:bg-card">
        <AlertCircle className="h-5 w-5 text-orange-600" />
        <AlertTitle className="text-xl font-semibold mb-2">Cloud Setup Required</AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-base">
            The attendance system requires Lovable Cloud to be fully configured. 
            Please complete these steps:
          </p>
          <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
            <li>Ensure Lovable Cloud is enabled in your project settings</li>
            <li>Wait for Cloud initialization to complete (may take a minute)</li>
            <li>Run the provided SQL script in the Cloud database</li>
            <li>Refresh this page</li>
          </ol>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => window.location.reload()} variant="default">
              Refresh Page
            </Button>
            <Button 
              onClick={() => window.open('https://docs.lovable.dev/features/cloud', '_blank')}
              variant="outline"
            >
              View Cloud Docs
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}
