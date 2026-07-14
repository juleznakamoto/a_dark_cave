import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiUrl";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

// "confirm" waits for an explicit click before hitting the server. This is
// deliberate: email link scanners/prefetchers (Outlook & Defender Safe Links,
// antivirus, etc.) load the page automatically, so auto-unsubscribing on mount
// would let them silently unsubscribe people and burn one-time links.
type UnsubStatus = "confirm" | "loading" | "ok" | "message";

export default function UnsubscribePage() {
  const [status, setStatus] = useState<UnsubStatus>("confirm");
  const [message, setMessage] = useState("");
  const tokenRef = useRef("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token")?.trim() ?? "";
    tokenRef.current = token;

    if (!token) {
      setStatus("message");
      setMessage(
        "This page needs a valid unsubscribe link from an email we sent you.",
      );
    }
  }, []);

  const handleUnsubscribe = async () => {
    const token = tokenRef.current;
    if (!token || status === "loading") return;
    setStatus("loading");
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
      if (data.ok && data.status === "unsubscribed") {
        setStatus("ok");
        setMessage("You've been unsubscribed from marketing emails.");
      } else {
        setStatus("message");
        setMessage(
          typeof data.message === "string" && data.message.length > 0
            ? data.message
            : "This link is invalid or expired.",
        );
      }
    } catch {
      setStatus("message");
      setMessage("Something went wrong. Please try again later.");
    }
  };

  const description =
    status === "loading"
      ? "Processing your request…"
      : status === "ok"
        ? "You're all set"
        : "Unsubscribe from Email Updates";

  return (
    <>
      <Helmet>
        <title>Unsubscribe — A Dark Cave</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-black text-gray-300 flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader>
            <CardDescription className="text-2xl font-light text-gray-100">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {status === "confirm" ? (
              <>
                <p className="text-sm text-gray-400">
                  Click below to stop receiving marketing emails from A Dark
                  Cave.
                </p>
                <button
                  type="button"
                  onClick={handleUnsubscribe}
                  className="inline-block rounded border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-100 hover:bg-gray-700 transition-colors"
                >
                  Unsubscribe
                </button>
              </>
            ) : status === "loading" ? (
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
