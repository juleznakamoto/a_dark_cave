import { useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiUrl";
import PublicDocPage from "@/pages/publicDocPage";

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
    <PublicDocPage path="/unsubscribe" heading={description}>
      {status === "confirm" ? (
        <>
          <p>
            Click below to stop receiving marketing emails from A Dark Cave.
          </p>
          <button
            type="button"
            onClick={handleUnsubscribe}
            className="rounded border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500"
          >
            Unsubscribe
          </button>
        </>
      ) : status === "loading" ? (
        <p className="text-neutral-500">Please wait…</p>
      ) : (
        <p>{message}</p>
      )}
    </PublicDocPage>
  );
}
