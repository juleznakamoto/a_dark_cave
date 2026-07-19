import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, dismissible = true, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            className={cn(
              props.className,
              dismissible === false &&
              "pr-6 data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-0 data-[swipe=move]:translate-x-0"
            )}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {dismissible !== false && <ToastClose />}
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
