import { useState, useEffect } from "react";
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
import {
  signIn,
  signUp,
  signInWithGoogle,
  clearPendingReferralCode,
  clearPendingSignupWelcome,
} from "@/game/auth";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/game/state";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";
import { parseRefParam } from "@shared/referralCode";
import { useTranslation } from "react-i18next";

interface AuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

function isFetchNetworkError(error: unknown, message?: string): boolean {
  if (!(error instanceof TypeError)) return false;
  const normalized = message?.toLowerCase() ?? "";
  return (
    normalized.includes("networkerror") ||
    normalized.includes("failed to fetch")
  );
}

export default function AuthDialog({
  isOpen,
  onClose,
  onAuthSuccess,
}: AuthDialogProps) {
  const { t } = useTranslation("ui");
  const signUpPromptEligibleForGold = useGameStore(
    (state) => state.signUpPromptEligibleForGold
  );

  const getReferralCode = () => {
    const params = new URLSearchParams(window.location.search);
    return parseRefParam(params.get("ref"));
  };

  const [mode, setMode] = useState<"signin" | "signup" | "reset">(
    getReferralCode() || signUpPromptEligibleForGold ? "signup" : "signin",
  );

  useEffect(() => {
    if (isOpen && signUpPromptEligibleForGold) {
      setMode("signup");
    }
  }, [isOpen, signUpPromptEligibleForGold]);

  const flushBeforeSignUp = async () => {
    if (useGameStore.getState().isUserSignedIn) return;
    try {
      await saveGame(buildGameState(useGameStore.getState()), false);
    } catch (e) {
      logger.error("[AUTH] Pre-sign-up save failed:", e);
    }
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSignupSuccess(false);
      setEmail("");
      setPassword("");
      setAcceptedTerms(false);
      setMarketingOptIn(false);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: t("auth.termsRequired"),
        description: t("auth.termsRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === "signin") {
        await signIn(email, password);
        toast({
          title: t("auth.signedInTitle"),
          description: t("auth.signedInDesc"),
        });

        const { useGameStore } = await import("@/game/state");
        await useGameStore.getState().loadGame();

        onAuthSuccess();
        onClose();
      } else if (mode === "signup") {
        await flushBeforeSignUp();
        clearPendingReferralCode();
        clearPendingSignupWelcome();
        const referralCode = getReferralCode();
        await signUp(email, password, referralCode || undefined, marketingOptIn);
        useGameStore.getState().setSignUpPromptEligibleForGold(false);
        setSignupSuccess(true);
      } else if (mode === "reset") {
        const { resetPassword } = await import("@/game/auth");
        await resetPassword(email);
        toast({
          title: t("auth.resetSent"),
          description: t("auth.resetSentDesc"),
        });
        setMode("signin");
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: t("auth.errorTitle"),
        description: isFetchNetworkError(error, err.message)
          ? t("auth.networkErrorDesc")
          : err.message || t("auth.authFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (mode === "signup" && !acceptedTerms) {
      toast({
        title: t("auth.termsRequired"),
        description: t("auth.termsRequiredDesc"),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await flushBeforeSignUp();
      }
      await signInWithGoogle({
        signupFlow: mode === "signup",
        marketingOptIn,
        referralCode: mode === "signup" ? getReferralCode() : undefined,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        title: t("auth.errorTitle"),
        description: isFetchNetworkError(error, err.message)
          ? t("auth.networkErrorDesc")
          : err.message || t("auth.googleSignInFailed"),
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const signupNeedsTerms = mode === "signup" && !acceptedTerms;

  const dialogTitle = signupSuccess
    ? t("auth.accountCreatedTitle")
    : mode === "signin"
      ? t("auth.signInTitle")
      : mode === "signup"
        ? t("auth.signUpTitle")
        : t("auth.resetPasswordTitle");

  const dialogDescription = !signupSuccess
    ? mode === "signin"
      ? t("auth.signInDesc")
      : mode === "signup"
        ? t("auth.signUpDesc")
        : t("auth.resetDesc")
    : "";

  const submitLabel = loading
    ? t("auth.loading")
    : mode === "signin"
      ? t("auth.signIn")
      : mode === "signup"
        ? t("auth.signUpButton")
        : t("auth.sendResetLink");

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="[--adc-dialog-max-w:28rem] z-[70]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>
        {signupSuccess ? (
          <div className="space-y-6 py-2">
            <div className="text-center space-y-2">
              <div className="bg-red-600/5 border border-red-600/50 rounded-lg p-3">
                <p className="text-md font-medium text-red-600">
                  {t("auth.verifyEmailReminder")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t("auth.emailPlaceholder")}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
                {mode === "signin" && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-xs text-muted-foreground hover:text-foreground/70 underline-offset-2 hover:underline"
                    >
                      {t("auth.forgotPassword")}
                    </button>
                  </div>
                )}
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
                  {t("auth.acceptTermsPrefix")}{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {t("auth.termsOfService")}
                  </a>{" "}
                  {t("auth.acceptTermsAnd")}{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {t("auth.privacyPolicy")}
                  </a>
                </label>
              </div>
            )}
            {mode === "signup" && (
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="marketing"
                  checked={marketingOptIn}
                  onCheckedChange={(checked) =>
                    setMarketingOptIn(checked === true)
                  }
                />
                <label
                  htmlFor="marketing"
                  className="text-sm leading-snug peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {t("auth.marketingOptIn")}
                </label>
              </div>
            )}
            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                className={cn(
                  "font-medium text-sm",
                  signupNeedsTerms && "opacity-50",
                )}
                disabled={loading}
                aria-disabled={signupNeedsTerms || undefined}
              >
                {submitLabel}
              </Button>
              {mode !== "reset" && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        {t("auth.orContinueWith")}
                      </span>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    aria-disabled={signupNeedsTerms || undefined}
                    className={cn(
                      "font-medium text-sm",
                      signupNeedsTerms && "opacity-50",
                    )}
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
                      ? t("auth.signUpWithGoogle")
                      : t("auth.signInWithGoogle")}
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
                  setMarketingOptIn(false);
                }}
              >
                {mode === "signin"
                  ? t("auth.noAccountSignUp")
                  : mode === "signup"
                    ? t("auth.hasAccountSignIn")
                    : t("auth.backToSignIn")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
