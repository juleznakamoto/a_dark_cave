
import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-medium ring-offset-background transition-[color,transform] duration-100 ease-out active:scale-[0.97] focus-visible:outline-none cursor-pointer disabled:cursor-default aria-disabled:cursor-default disabled:pointer-events-none disabled:opacity-50 select-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        // Heights use --adc-control-scale (see index.css .adc-btn-size-*).
        // Padding stays as Tailwind px-* so it beats preflight `button { padding: 0 }`
        // (scaled padding inside :where() has 0 specificity and was dropped).
        // Call sites that force fixed h-* / p-0 (header icon chrome) still win via twMerge.
        default: "adc-btn-size-default px-4 py-2",
        xs: "adc-btn-size-xs rounded-md px-2",
        sm: "adc-btn-size-sm rounded-md px-3",
        lg: "adc-btn-size-lg rounded-md px-8",
        icon: "adc-btn-size-icon",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
