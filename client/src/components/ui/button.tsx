import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import {
  destroyedChromeMaskStyle,
  gameChromeBoxClassName,
  gameChromeTinyClassName,
  useDestroyedChrome,
} from "@/components/game/gameChrome"
import { armClickHaptic, playButtonHaptic } from "@/lib/haptics"
import { cn } from "@/lib/utils"
import { DialogButtonSurfaceContext } from "@/components/ui/dialogButtonSurface"
import { buttonVariants } from "./button-variants"

/** Dialog action buttons share the panel-button wash. Ghost, link, and danger stay as they are. */
function dialogButtonFill(variant: ButtonProps["variant"]): string | null {
  if (variant === "ghost" || variant === "link" || variant === "destructive") {
    return null;
  }
  return "bg-neutral-600/15 hover:bg-accent";
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  button_id?: string
  /** Tiny −/+/preset squares: cropped tiles, less push-out, Extreme keeps ≥2 corners. */
  compactChrome?: boolean
  /**
   * iOS haptic. `auto` is a light tap inside a dialog. `light` is a light tap
   * for event choices that are not inside a dialog. `off` stays silent.
   */
  haptic?: "auto" | "light" | "off"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      onClick,
      button_id,
      compactChrome = false,
      haptic = "auto",
      style,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"
    const chromeSeed = React.useId()
    const inDialogSurface = React.useContext(DialogButtonSurfaceContext)
    const destroyedOutline = useDestroyedChrome() && variant === "outline"
    const tiny = destroyedOutline && compactChrome

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      armClickHaptic();
      // Read from the prop, not the DOM. `asChild` renders a Slot and the
      // click target (e.g. an inner <a> or icon) may not carry `button_id`.
      if (button_id) {
        void import("@/game/state")
          .then(({ useGameStore }) => {
            useGameStore.getState().trackButtonClick(button_id);
          })
          .catch(() => {
            // Silently ignore analytics failures
          });
      }

      onClick?.(e);

      if (haptic === "off") return;
      const el = e.currentTarget;
      if (!el) return;
      const blocked =
        el.getAttribute("aria-disabled") === "true" ||
        ("disabled" in el && Boolean((el as HTMLButtonElement).disabled));
      if (blocked) return;
      const inDialog = el.closest("[role='dialog'],[role='alertdialog']") != null;
      if (haptic === "light" || inDialog) {
        playButtonHaptic();
      }
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size }),
          destroyedOutline && gameChromeBoxClassName(),
          tiny && gameChromeTinyClassName(),
          inDialogSurface && dialogButtonFill(variant),
          className,
          destroyedOutline && "border-transparent",
        )}
        ref={ref}
        onClick={handleClick}
        button_id={button_id}
        {...props}
        style={{
          ...(destroyedOutline
            ? destroyedChromeMaskStyle(
                button_id ?? chromeSeed,
                tiny ? { small: true } : undefined,
              )
            : {}),
          ...style,
        }}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
export { buttonVariants } from "./button-variants"