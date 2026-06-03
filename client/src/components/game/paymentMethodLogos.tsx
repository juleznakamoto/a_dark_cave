import React from "react";

const logoClass = "block h-[18px] w-auto shrink-0";

export function VisaLogo() {
  return (
    <svg
      className={logoClass}
      viewBox="0 0 48 16"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Visa"
    >
      <path
        fill="#FFFFFF"
        d="M19.5 15.2h-3.1l-2.2-13h3.1l2.2 13zm8.9-8.8c-.6 0-1.1.3-1.1 1.1 0 .9 1.2 1.2 1.2 1.9 0 .4-.4.6-.9.6-.8 0-1.4-.2-2-.5l-.4 2.1c.7.3 1.4.4 2.2.4 2.3 0 3.8-1.2 3.8-3.1 0-1.3-1.2-2-2.4-2.6-1-.5-1.3-.8-1.3-1.2 0-.4.4-.7 1-.7.6 0 1.1.1 1.6.3l.4-2.1c-.5-.2-1.2-.3-1.9-.3-2.2 0-3.7 1.2-3.7 3 .1 1.9 2.7 2 2.7 3 0 .3-.3.7-1 .7zm9.1 5.3h2.9l-1.8-13h-2.7l-1.1 7-2.7-7h-3.2l4.3 13h3.3l2-13zm11.2-13-2.8 13h2.8l2.8-13h-2.8zM9.9.2 6.6 8.8 6.3 7.2C5.5 4.2 3.2 2.1.5 1.2l2.5 12h3.1l4.8-13H9.9z"
      />
    </svg>
  );
}

export function MastercardLogo() {
  return (
    <svg
      className={logoClass}
      viewBox="0 0 38 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mastercard"
    >
      <circle cx="15" cy="12" r="10" fill="#EB001B" />
      <circle cx="23" cy="12" r="10" fill="#F79E1B" />
    </svg>
  );
}

export function PayPalLogo() {
  return (
    <svg
      className={logoClass}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="PayPal"
    >
      <path
        fill="#003087"
        d="M7.38 20.1H3.6a.9.9 0 0 1-.8-.9L5.2 3.5c0-.5.5-.9 1-.9h3.6c2.4 0 4.1 1.2 4.5 3.5.5 2.8-1.3 4.3-3.8 4.3H8.8l-.9 5.6z"
      />
      <path
        fill="#009CDE"
        d="M18.2 20.1h-3.6a.9.9 0 0 1-.8-.9l1.2-7.6c0-.5.5-.9 1-.9h3.6c2.4 0 4 1.2 4.4 3.5.5 2.7-1.2 4.3-3.6 4.3h-1.4l-.8 5.6z"
      />
    </svg>
  );
}

export function ApplePayLogo() {
  return (
    <svg
      className={logoClass}
      viewBox="0 0 50 20"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Apple Pay"
    >
      <rect width="50" height="20" rx="4" fill="#FFFFFF" />
      <path
        fill="#000000"
        d="M10.3 6.1c.05-.7.55-1.3 1.15-1.7-.55-.45-1.4-.7-2.15-.65-.45.65-.6 1.4-.55 2.15.7.05 1.4-.35 1.55-.85zm-1.2 1.4c-1.05-.05-1.95.55-2.45 1.3-.5.8-.7 1.95-.1 2.95.5.8 1.4 1.2 2.25 1.15.1-.75.4-1.5 1.1-2-.5-.2-1.1-.5-1.45-1 .9-.05 1.65-.45 2-1.15-.55-.25-1.2-.4-1.85-.35.1.6-.5 1.15-1.35 1.1z"
      />
      <path
        fill="#000000"
        d="M17.6 7.4h1.15l1.55 6.6h-1.05l-.35-1.65h-1.25c-1.45 0-2.55-.75-2.85-2.35l-.2-.95c-.3-1.35.45-2.25 1.85-2.25h1.75zm.25 1h-.95c-.85 0-1.25.45-1.05 1.15l.2.85c.15.65.75.65 1.3.65h.85l-.55-2.65zm5.35 5.6h1.05l.3-1.25h1.15c1.15 0 1.95-.55 2.2-1.55l.2-1.05c.25-1.05-.4-1.75-1.55-1.75h-2.7l-1.05 5.6zm1.65-4.55h1c.65 0 .95.35.85.95l-.45 2.35h-1.05l-.35-2.3zm5.95 4.55h.95l.45-2.35h1.05c1.55 0 2.55-.75 2.9-2.15l.25-1.3c.35-1.45-.5-2.4-1.95-2.4h-2.8l-1.2 6.2zm1.75-4.9h.95c.75 0 1.1.4.95 1l-.45 2.35h-1.05l-.45-3.35z"
      />
    </svg>
  );
}

export function GooglePayLogo() {
  return (
    <svg
      className={logoClass}
      viewBox="0 0 42 17"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Google Pay"
    >
      <path
        fill="#4285F4"
        d="M17.6 8.5V5.9h4.8c0 2.3-1.9 4.1-4.2 4.1-1.1 0-2.1-.4-2.9-1.1l-1.6 1.6c1.1 1 2.6 1.6 4.2 1.6 3.5 0 6.2-2.8 6.2-6.3S22.8 0 19.3 0 13 2.8 13 6.3v2.2h4.6z"
      />
      <path
        fill="#34A853"
        d="M6.5 10.1 3.9 12.3C5.5 13.8 7.7 14.8 10 14.8c1.5 0 2.9-.5 4-1.3l-1.6-1.6c-.6.4-1.3.6-2.1.6-1.6 0-3-1-3.5-2.4z"
      />
      <path
        fill="#FBBC04"
        d="M3.9 4.7C3.3 5.8 3 7 3 8.3s.3 2.5.9 3.6l2.6-2.6C5.9 8.9 5.9 7.7 6.5 6.5 7.1 5.3 8.4 4.5 10 4.5c.8 0 1.5.2 2.1.6l1.6-1.6C12.9 2.7 11.5 2.2 10 2.2 7.7 2.2 5.5 3.2 3.9 4.7z"
      />
      <path
        fill="#EA4335"
        d="M10 14.8c2.3 0 4.5-1 6.1-2.7l-2.6-2.6c-.8.6-1.8.9-2.9.9-1.6 0-3-1-3.5-2.4l-2.6 2.6c1.5 1.5 3.6 2.2 5.5 2.2z"
      />
      <path
        fill="#5F6368"
        d="M25.2 4.2h1.5l1.2 8.6h-1.4l-.3-1.2h-1.4c-1.6 0-2.8-.85-3.1-2.55l-.15-.75c-.25-1.2.4-2 1.7-2h1.9l.2-1.35zm.35.95h-1.05c-.75 0-1.1.4-.95 1.05l.15.7c.15.6.65.6 1.15.6h.95l-.35-2.35zm4.1 7.65h1.35l.35-2.35h1.25c1.75 0 2.85-.9 3.2-2.45l.2-1.15c.3-1.25-.45-2.1-1.85-2.1h-2.95l-1.15 6.05zm1.85-4.55h1.05c.8 0 1.15.4 1 .95l-.4 2.35h-1.15l-.5-3.3zm5.35 4.55h1.25l.55-3.3h1.2c1.7 0 2.8-.85 3.15-2.35l.25-1.2c.35-1.3-.5-2.15-1.95-2.15h-2.75l-1.25 6.05zm1.7-4.55h1.05c.8 0 1.15.4 1 .95l-.55 3.3h-1.2l-.3-4.25z"
      />
    </svg>
  );
}

export function PaymentMethodLogos({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex flex-wrap items-center justify-center gap-1.5 ${className}`.trim()}
    >
      <VisaLogo />
      <MastercardLogo />
      <PayPalLogo />
      <ApplePayLogo />
      <GooglePayLogo />
    </span>
  );
}
