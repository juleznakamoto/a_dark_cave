import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TextShimmer } from "@/components/ui/text-shimmer";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  signIn,
  signUp,
  signInWithGoogle,
  clearPendingReferralCode,
  clearPendingSignupWelcome,
  markPendingSignupWelcomeFromSignupFlow,
} from "@/game/auth";
import { saveGame } from "@/game/save";
import { buildGameState } from "@/game/stateHelpers";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/game/state";
import { logger } from "@/lib/logger";
import { parseRefParam } from "@shared/referralCode";
import { Trans, useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";

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
  const emailInputRef = useRef<HTMLInputElement>(null);

  const getReferralCode = () => {
    const params = new URLSearchParams(window.location.search);
    return parseRefParam(params.get("ref"));
  };

  const [mode, setMode] = useState<"signin" | "signup" | "reset">(() =>
    getReferralCode() || useGameStore.getState().signUpPromptEligibleForGold
      ? "signup"
      : "signin",
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const { toast } = useToast();

  // Profile opens Auth without the flag → sign-in. Rewards / referral / shop
  // signup CTAs set signUpPromptEligibleForGold (or have ?ref=) before open → signup.
  useEffect(() => {
    if (!isOpen) return;
    const preferSignup =
      Boolean(getReferralCode()) ||
      useGameStore.getState().signUpPromptEligibleForGold;
    setMode(preferSignup ? "signup" : "signin");
  }, [isOpen]);

  // DialogContent suppresses Radix open autofocus; focus email ourselves.
  useEffect(() => {
    if (!isOpen || signupSuccess) return;
    const id = window.setTimeout(() => {
      emailInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [isOpen, signupSuccess]);

  const flushBeforeSignUp = async () => {
    if (useGameStore.getState().isUserSignedIn) return;
    try {
      await saveGame(buildGameState(useGameStore.getState()), false);
    } catch (e) {
      logger.error("[AUTH] Pre-sign-up save failed:", e);
    }
  };

  const authErrorMessage = (error: unknown, fallback: string) => {
    const err = error as { message?: string };
    return isFetchNetworkError(error, err.message)
      ? t("auth.networkErrorDesc")
      : err.message || fallback;
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSignupSuccess(false);
      setEmail("");
      setPassword("");
      setShowPassword(false);
      setFormError(null);
      setMarketingOptIn(false);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
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
        markPendingSignupWelcomeFromSignupFlow();
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
      setFormError(authErrorMessage(error, t("auth.authFailed")));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setFormError(null);
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
      setFormError(authErrorMessage(error, t("auth.googleSignInFailed")));
      setLoading(false);
    }
  };

  const switchMode = (next: "signin" | "signup" | "reset") => {
    setMode(next);
    setFormError(null);
    setShowPassword(false);
    if (next !== "signup") setMarketingOptIn(false);
  };

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
      <DialogContent
        className="[--adc-dialog-max-w:28rem] z-[70]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
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
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Input
                ref={emailInputRef}
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (formError) setFormError(null);
                }}
                required
                autoComplete="email"
                placeholder={t("auth.email")}
                aria-label={t("auth.email")}
              />
            </div>
            {mode !== "reset" && (
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formError) setFormError(null);
                    }}
                    required
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    placeholder={t("auth.password")}
                    aria-label={t("auth.password")}
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      showPassword
                        ? t("auth.hidePassword")
                        : t("auth.showPassword")
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {mode === "signin" && (
                  <div className="flex justify-end pt-0.5">
                    <button
                      type="button"
                      onClick={() => switchMode("reset")}
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
            {formError && (
              <p
                role="alert"
                className="text-sm text-red-600 leading-snug"
              >
                {formError}
              </p>
            )}
            <div className="flex flex-col space-y-2">
              <Button
                type="submit"
                className="font-medium text-sm"
                disabled={loading}
              >
                {loading ? <TextShimmer>{submitLabel}</TextShimmer> : submitLabel}
              </Button>
              {mode !== "reset" && (
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
                  {loading ? (
                    <TextShimmer tone="onSurface">
                      {mode === "signup"
                        ? t("auth.signUpWithGoogle")
                        : t("auth.signInWithGoogle")}
                    </TextShimmer>
                  ) : mode === "signup" ? (
                    t("auth.signUpWithGoogle")
                  ) : (
                    t("auth.signInWithGoogle")
                  )}
                </Button>
              )}
              {mode === "signup" && (
                <p className="text-xs text-center text-muted-foreground leading-snug px-1">
                  <Trans
                    i18nKey="auth.signupTermsHint"
                    ns="ui"
                    components={{
                      terms: (
                        <a
                          href="/terms"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground/80"
                        />
                      ),
                      privacy: (
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-foreground/80"
                        />
                      ),
                    }}
                  />
                </p>
              )}

              <Button
                type="button"
                variant="ghost"
                className="text-sm"
                onClick={() =>
                  switchMode(mode === "signin" ? "signup" : "signin")
                }
              >
                {mode === "signin" ? (
                  <Trans
                    i18nKey="auth.noAccountSignUp"
                    ns="ui"
                    components={{ bold: <span className="font-bold" /> }}
                  />
                ) : mode === "signup" ? (
                  <Trans
                    i18nKey="auth.hasAccountSignIn"
                    ns="ui"
                    components={{ bold: <span className="font-bold" /> }}
                  />
                ) : (
                  t("auth.backToSignIn")
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
