import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { updatePassword } from '@/game/auth';
import { getSupabaseClient } from "@/lib/supabase";

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Handle auth callback from URL hash
    const handleAuthCallback = async () => {
      const supabase = await getSupabaseClient();

      // Handle auth callback from URL hash
      const handleAuthCallback = async () => {
        // In production, wait for Supabase config to load and be properly initialized
        if (!import.meta.env.DEV) {
          logger.log('Waiting for Supabase to initialize...');
          // Wait up to 5 seconds for config to load
          let attempts = 0;
          while (attempts < 50) {
            try {
              // Try to get the session - this will use the real client once it's initialized
              const { data } = await supabase.auth.getSession();
              // Check if we got a valid response (not from placeholder client)
              if (data) {
                logger.log('Supabase client is ready');
                break;
              }
            } catch (e) {
              // Ignore errors during initialization
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
          }
          // Add extra delay to ensure config is fully loaded
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Check both URL hash and query params (Supabase can use either)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const searchParams = new URLSearchParams(window.location.search);

        const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
        const type = searchParams.get('type') || hashParams.get('type');

        logger.log('Reset password flow - type:', type, 'has token:', !!accessToken);

        if (type === 'recovery' && accessToken) {
          // Exchange the access_token for a session
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: accessToken,
            type: 'recovery'
          });

          if (error) {
            logger.error('Session error:', error);
            toast({
              title: 'Invalid or expired reset link',
              description: 'Please request a new password reset link.',
              variant: 'destructive',
            });
            setTimeout(() => setLocation('/'), 3000);
            return;
          }

          if (data.user) {
            setValidSession(true);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          // No token in URL, check for existing session
          const { data, error } = await supabase.auth.getSession();

          if (error || !data.session) {
            toast({
              title: 'Invalid or expired reset link',
              description: 'Please request a new password reset link.',
              variant: 'destructive',
            });
            setTimeout(() => setLocation('/'), 3000);
            return;
          }

          setValidSession(true);
        }

        setChecking(false);
      };

      handleAuthCallback();
    };

    handleAuthCallback();
  }, [setLocation, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Please make sure both passwords are the same.',
        variant: 'destructive',
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const supabase = await getSupabaseClient();
      await updatePassword(password);
      toast({
        title: 'Password updated successfully',
        description: 'You can now sign in with your new password.',
      });
      setTimeout(() => setLocation('/'), 2000);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update password',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Reset Link</CardTitle>
            <CardDescription>Please wait...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Only show invalid link after checking is complete and session is invalid
  if (!checking && !validSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription>Redirecting...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Your Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}