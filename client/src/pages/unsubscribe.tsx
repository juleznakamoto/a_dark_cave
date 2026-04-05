import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/apiUrl";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type UnsubStatus = "loading" | "ok" | "message";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<UnsubStatus>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token")?.trim() ?? "";

    if (!token) {
      setStatus("message");
      setMessage(
        "This page needs a valid unsubscribe link from an email we sent you.",
      );
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/marketing/unsubscribe"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = (await res.json()) as {
          ok?: boolean;
          message?: string;
          status?: string;
        };
        if (cancelled) return;
        if (data.ok && data.status === "unsubscribed") {
          setStatus("ok");
          setMessage(
            "You've been unsubscribed from marketing emails.",
          );
        } else {
          setStatus("message");
          setMessage(
            typeof data.message === "string" && data.message.length > 0
              ? data.message
              : "This link is invalid, expired, or already used.",
          );
        }
      } catch {
        if (!cancelled) {
          setStatus("message");
          setMessage("Something went wrong. Please try again later.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Helmet>
        <title>Unsubscribe — A Dark Cave</title>
      </Helmet>
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Email preferences</CardTitle>
            <CardDescription>
              {status === "loading"
                ? "Processing your request…"
                : status === "ok"
                  ? "You're all set"
                  : "Unsubscribe"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {status === "loading" ? (
              <p className="text-sm text-muted-foreground">Please wait…</p>
            ) : (
              <p
                className={
                  status === "ok" ? "text-sm" : "text-sm text-muted-foreground"
                }
              >
                {message}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
