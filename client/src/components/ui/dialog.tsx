"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  DIALOG_OPEN_CLICK_LOCK_MS,
  useDialogOpenClickLock,
} from "@/hooks/useDialogOpenClickLock"

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideClose?: boolean;
  hideOverlay?: boolean;
  customBackground?: React.ReactNode;
  /** When true, skip inline width/maxWidth (e.g. dialogs that use `w-max` / intrinsic sizing). */
  skipViewportWidthClamp?: boolean;
  /** Backdrop classes — pair with elevated content z-index (e.g. overlay `z-[69]` + content `z-[70]`). */
  overlayClassName?: string;
  /**
   * Stacking above other modals (e.g. sleep at z-60). Uses inline z-index so third-party
   * CSS (e.g. Playlight) cannot strip arbitrary Tailwind z utilities from the panel.
   */
  layerZIndex?: number;
  /** How long to ignore leftover clicks after the dialog appears. */
  openClickLockMs?: number;
  /** Changing this restarts the open click lock (e.g. a new event in the same dialog). */
  openClickLockKey?: string | number;
};

const defaultOpenClickLockMs =
  import.meta.env.MODE === "test" ? 0 : DIALOG_OPEN_CLICK_LOCK_MS;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({
  className,
  children,
  hideClose,
  hideOverlay,
  customBackground,
  style,
  skipViewportWidthClamp,
  overlayClassName,
  layerZIndex,
  openClickLockMs = defaultOpenClickLockMs,
  openClickLockKey,
  onPointerDownCapture,
  onPointerUpCapture,
  onClickCapture,
  onAuxClickCapture,
  onKeyDownCapture,
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,
  onEscapeKeyDown,
  onOpenAutoFocus,
  ...props
}, ref) => {
  const {
    lockActive,
    onActivationCapture,
    onKeyDownCapture: onLockKeyDownCapture,
    preventDismiss,
  } = useDialogOpenClickLock(openClickLockMs, openClickLockKey);

  const guardActivation = (
    event: React.SyntheticEvent,
    next?: (event: React.SyntheticEvent) => void,
  ) => {
    onActivationCapture(event);
    if (!event.defaultPrevented) next?.(event);
  };

  return (
    <DialogPortal>
      {customBackground}
      {!hideOverlay && (
        <DialogOverlay
          className={overlayClassName}
          style={
            layerZIndex != null
              ? { zIndex: layerZIndex - 1 }
              : undefined
          }
          onPointerDownCapture={onActivationCapture}
          onPointerUpCapture={onActivationCapture}
          onClickCapture={onActivationCapture}
          onAuxClickCapture={onActivationCapture}
        />
      )}
      <DialogPrimitive.Content
        ref={ref}
        data-adc-open-click-lock={lockActive ? "true" : undefined}
        onOpenAutoFocus={(e) => {
          // Prevent auto-focus during animation
          e.preventDefault();
          onOpenAutoFocus?.(e);
        }}
        onPointerDownCapture={(event) => guardActivation(event, onPointerDownCapture)}
        onPointerUpCapture={(event) => guardActivation(event, onPointerUpCapture)}
        onClickCapture={(event) => guardActivation(event, onClickCapture)}
        onAuxClickCapture={(event) => guardActivation(event, onAuxClickCapture)}
        onKeyDownCapture={(event) => {
          onLockKeyDownCapture(event);
          if (!event.defaultPrevented) onKeyDownCapture?.(event);
        }}
        onPointerDownOutside={(event) => {
          preventDismiss(event);
          if (!event.defaultPrevented) onPointerDownOutside?.(event);
        }}
        onInteractOutside={(event) => {
          preventDismiss(event);
          if (!event.defaultPrevented) onInteractOutside?.(event);
        }}
        onFocusOutside={(event) => {
          preventDismiss(event);
          if (!event.defaultPrevented) onFocusOutside?.(event);
        }}
        onEscapeKeyDown={(event) => {
          preventDismiss(event);
          if (!event.defaultPrevented) onEscapeKeyDown?.(event);
        }}
        className={cn(
          // Width/max-width use inline style below so third-party CSS (e.g. Playlight's Tailwind bundle)
          // cannot override our modal sizing via conflicting utility classes.
          "fixed left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%] gap-1 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
          lockActive && "adc-dialog-open-click-lock",
          className
        )}
        style={{
          ...(skipViewportWidthClamp
            ? {}
            : {
              boxSizing: "border-box",
              width: "min(95vw, var(--adc-dialog-max-w, 32rem))",
              maxWidth: "min(95vw, var(--adc-dialog-max-w, 32rem))",
            }),
          ...(layerZIndex != null ? { zIndex: layerZIndex } : {}),
          ...style,
        }}
        {...props}
      >
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="adc-dialog-close absolute right-3 top-3 flex items-center justify-center rounded-sm p-0 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="adc-dialog-close-icon" aria-hidden="true" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
})
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-left", className)}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      // Reserve space for the absolute close control on the title only. Padding the whole
      // DialogHeader made descriptions look right-heavy, especially when close is hidden.
      "pr-8 text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}