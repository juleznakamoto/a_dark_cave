import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { signIn, signUp, signInWithGoogle } from "@/game/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

export default function AuthDialog({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthDialogProps) {
  // Get referral code from URL
  const getReferralCode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref");
  };

  // Default to signup if there's a referral code, otherwise signin
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(
    getReferralCode() ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSignupSuccess(false);
      setEmail("");
      setPassword("");
      setAcceptedTerms(false);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: "Terms required",
        description:
          "You must accept the Terms of Service and Privacy Policy to create an account.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast({
          title: "Signed in successfully",
          description: "Your game will now sync across devices.",
        });

        // Reload game from Supabase after sign-in
        const { useGameStore } = await import("@/game/state");
        await useGameStore.getState().loadGame();

        onAuthSuccess();
        onClose();
      } else if (mode === "signup") {
        const referralCode = getReferralCode();
        await signUp(email, password, referralCode || undefined);
        setSignupSuccess(true);
      } else if (mode === "reset") {
        const { resetPassword } = await import("@/game/auth");
        await resetPassword(email);
        toast({
          title: "Password reset email sent",
          description:
            "Check your email for a link to reset your password. Also look in spam folder.",
        });
        setMode("signin");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // Supabase will redirect to Google and then back to your app
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Google sign-in failed",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md z-[70]">
        <DialogHeader>
          <DialogTitle>
            {signupSuccess
              ? "Account Created successfully"
              : mode === "signin"
                ? "Sign In"
                : mode === "signup"
                  ? "Create Account"
                  : "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {!signupSuccess
              ? mode === "signin"
                ? "Sign in to sync your game across devices"
                : mode === "signup"
                  ? "Create an account to save your progress in the cloud"
                  : "Enter your email to receive a password reset link"
              : ""}
          </DialogDescription>
        </DialogHeader>
        {signupSuccess ? (
          <div className="space-y-6 py-2">
            <div className="text-center space-y-2">
              <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-red-600">
                  Please check your email to verify your account. Also check
                  your spam folder.
                </p>
              </div>
            </div>
          </div>
        ) : (
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
            {mode !== "reset" && (
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
            {mode === "signup" && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) =>
                    setAcceptedTerms(checked === true)
                  }
                />
                <label
                  htmlFor="terms"
                  className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  I accept the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Privacy Policy
                  </a>
                </label>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                className="font-medium text-sm"
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : mode === "signin"
                    ? "Sign In"
                    : mode === "signup"
                      ? "Sign Up"
                      : "Send Reset Link"}
              </Button>
              {mode !== "reset" && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        or continue with
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="font-medium text-sm"
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {mode === "signup"
                      ? "Sign up with Google"
                      : "Sign in with Google"}
                  </Button>
                </>
              )}

              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setAcceptedTerms(false);
                }}
              >
                {mode === "signin"
                  ? "Don't have an account? Sign up"
                  : mode === "signup"
                    ? "Already have an account? Sign in"
                    : "Back to sign in"}
              </Button>
              {mode === "signin" && (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs !m-0"
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </Button>
              )}
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
