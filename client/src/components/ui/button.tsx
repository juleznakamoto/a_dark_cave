import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
  button_id?: string
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
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button"

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
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
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        onClick={handleClick}
        button_id={button_id}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
export { buttonVariants } from "./button-variants"