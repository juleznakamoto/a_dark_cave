
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { signIn, signUp } from '@/game/auth';
import { useToast } from '@/hooks/use-toast';

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
  initialMode?: 'signin' | 'signup';
}

export default function AuthDialog({ isOpen, onClose, onAuthSuccess, initialMode = 'signin' }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { toast } = useToast();

  // Reset mode when initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Get referral code from URL
  const getReferralCode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('ref');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'signup' && !acceptedTerms) {
      toast({
        title: 'Terms required',
        description: 'You must accept the Terms of Service and Privacy Policy to create an account.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(email, password);
        toast({
          title: 'Signed in successfully',
          description: 'Your game will now sync across devices.',
        });
        onAuthSuccess();
        onClose();
      } else if (mode === 'signup') {
        const referralCode = getReferralCode();
        await signUp(email, password, referralCode || undefined);
        toast({
          title: 'Account created',
          description: 'Please check your email to verify your account. Also look in spam folder.',
        });
        onAuthSuccess();
        onClose();
      } else if (mode === 'reset') {
        const { resetPassword } = await import('@/game/auth');
        await resetPassword(email);
        toast({
          title: 'Password reset email sent',
          description: 'Check your email for a link to reset your password. Also look in spam folder.',
        });
        setMode('signin');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Authentication failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'signin'
              ? 'Sign in to sync your game across devices'
              : mode === 'signup'
              ? 'Create an account to save your progress in the cloud'
              : 'Enter your email to receive a password reset link'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          {mode !== 'reset' && (
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
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
          )}
          {mode === 'signup' && (
            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={acceptedTerms}
                onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                I accept the{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>
          )}
          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={loading}>
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link'}
            </Button>
            {mode === 'signin' && (
              <Button
                type="button"
                variant="link"
                className="text-sm"
                onClick={() => setMode('reset')}
              >
                Forgot password?
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setAcceptedTerms(false);
              }}
            >
              {mode === 'signin'
                ? "Don't have an account? Sign up"
                : mode === 'signup'
                ? 'Already have an account? Sign in'
                : 'Back to sign in'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
