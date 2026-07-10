import type { FooterSocialPlatformId } from "@/lib/gameFooterSocialLinks";
import { GameUiIcon } from "@/components/game/GameUiIcon";

/** SVG icons matching [`GameFooter`](./GameFooter.tsx) right-row order. */
export function FooterSocialIcon({
  platform,
  className = "w-4 h-4",
  variant = "default",
}: {
  platform: FooterSocialPlatformId;
  className?: string;
  variant?: "default" | "brand";
}) {
  const brandClassName =
    variant === "brand"
      ? platform === "reddit"
        ? `${className} text-[#FF4500]`
        : platform === "steam"
          ? `${className} text-[#66c0f4]`
          : platform === "contact"
            ? `${className} text-white`
            : className
      : className;

  switch (platform) {
    case "reddit":
      return (
        <svg className={brandClassName} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
        </svg>
      );
    case "steam":
      return (
        <svg className={brandClassName} viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.984c0-2.318 1.881-4.199 4.199-4.199 2.317 0 4.199 1.881 4.199 4.199 0 2.317-1.882 4.199-4.199 4.199h-.06l-4.24 2.896c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.387 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.88 20.307 6.514 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.351l-1.915-.791c.524 1.066 1.604 1.792 2.846 1.792.72 0 1.384-.234 1.923-.627l-1.847-1.222a2.961 2.961 0 0 1-1.007.848zM21.98 11.987c0-1.595-1.296-2.892-2.892-2.892-1.595 0-2.892 1.297-2.892 2.892s1.297 2.892 2.892 2.892 2.892-1.297 2.892-2.892z" />
        </svg>
      );
    case "contact":
      return (
        <GameUiIcon
          name="email"
          className={brandClassName}
          sizeClassName="w-4 h-4"
        />
      );
    default: {
      const _exhaustive: never = platform;
      return _exhaustive;
    }
  }
}
