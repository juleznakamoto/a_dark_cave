import { useToast } from "@/hooks/use-toast"
import { CheckmarkIcon } from "@/components/ui/checkmark-icon"
import { XMarkIcon } from "@/components/ui/x-mark-icon"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { GAME_HEADER_INSET_WITH_SAFE_AREA } from "@/components/game/gameChrome"
import { useIosEditionActive } from "@/hooks/useSteamEditionActive"
import { cn } from "@/lib/utils"

const TOAST_MARK_CLASS = "mr-1.5 h-[1.5em] w-[1.5em]"

/** Check or X on the title line. Notices such as a version update have neither. */
export function ToastStatusIcon({
  success,
  error,
}: {
  success?: boolean
  error?: boolean
}) {
  if (success) {
    return <CheckmarkIcon className={cn(TOAST_MARK_CLASS, "text-green-500")} />
  }
  if (error) {
    return (
      <XMarkIcon className={cn(TOAST_MARK_CLASS, "-translate-y-px text-red-500")} />
    )
  }
  return null
}

export function Toaster() {
  const { toasts } = useToast()
  // The iOS web view is edge to edge. top-0 lands inside the status bar,
  // which the header fills. Overlays already clear that strip.
  const iosEditionActive = useIosEditionActive()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, dismissible = true, success, ...props }) {
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
              {title && (
                <ToastTitle>
                  <ToastStatusIcon
                    success={success}
                    error={props.variant === "destructive"}
                  />
                  {title}
                </ToastTitle>
              )}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            {dismissible !== false && <ToastClose />}
          </Toast>
        )
      })}
      <ToastViewport
        className={iosEditionActive ? "top-[var(--adc-toast-top)]" : undefined}
        style={
          iosEditionActive
            ? { "--adc-toast-top": GAME_HEADER_INSET_WITH_SAFE_AREA }
            : undefined
        }
      />
    </ToastProvider>
  )
}
