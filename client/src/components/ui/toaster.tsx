import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  const { toasts } = useToast()

  console.log('[TOASTER] Rendering Toaster component');
  console.log('[TOASTER] Number of toasts:', toasts.length);
  console.log('[TOASTER] Toasts:', toasts);

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        console.log('[TOASTER] Rendering toast:', id, 'title:', title);
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
