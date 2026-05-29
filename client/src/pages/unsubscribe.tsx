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

  const description =
    status === "loading"
      ? "Processing your request…"
      : status === "ok"
        ? "You're all set"
        : "Unsubscribe";

  return (
    <>
      <Helmet>
        <title>Unsubscribe — A Dark Cave</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-2xl font-light text-gray-100">
              Email preferences
            </CardTitle>
            <CardDescription className="text-gray-400">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "loading" ? (
              <p className="text-sm text-gray-500">Please wait…</p>
            ) : (
              <p
                className={
                  status === "ok" ? "text-sm text-gray-300" : "text-sm text-gray-400"
                }
              >
                {message}
              </p>
            )}
            <a
              href="/"
              className="inline-block text-sm text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-4"
            >
              Return to the cave
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
