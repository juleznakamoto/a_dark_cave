import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Track analytics if button_id is provided
      const buttonId = (e.currentTarget as HTMLButtonElement).getAttribute('button_id');
      if (buttonId) {
        // Lazy import to avoid circular dependencies
        import('@/game/state').then((mod) => {
          // #region agent log
          // Hypothesis C: Check if useGameStore is defined from dynamic import
          fetch('http://127.0.0.1:7242/ingest/33ba3fb0-527b-48ba-8316-dce19cab51cb',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'button.tsx:handleClick',message:'dynamic import resolved',data:{buttonId,moduleKeys:Object.keys(mod).join(','),hasUseGameStore:'useGameStore' in mod,useGameStoreType:typeof mod.useGameStore},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
          // #endregion
          const { useGameStore } = mod;
          if (useGameStore && typeof useGameStore.getState === 'function') {
            useGameStore.getState().trackButtonClick(buttonId);
          }
        });
      }
      
      // Call original onClick
      if (onClick) {
        onClick(e);
      }
    };
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
export { buttonVariants } from "./button-variants"