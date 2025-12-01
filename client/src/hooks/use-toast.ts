import * as React from "react"

import type {
  ToastActionElement,
  ToastProps,
} from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type ActionType = typeof actionTypes

type Action =
  | {
      type: ActionType["ADD_TOAST"]
      toast: ToasterToast
    }
  | {
      type: ActionType["UPDATE_TOAST"]
      toast: Partial<ToasterToast>
    }
  | {
      type: ActionType["DISMISS_TOAST"]
      toastId?: ToasterToast["id"]
    }
  | {
      type: ActionType["REMOVE_TOAST"]
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: "REMOVE_TOAST",
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  console.log('[TOAST REDUCER] Action received:', action.type);
  console.log('[TOAST REDUCER] Current state:', state);
  
  switch (action.type) {
    case "ADD_TOAST":
      console.log('[TOAST REDUCER] Adding toast:', action.toast);
      const newState = {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };
      console.log('[TOAST REDUCER] New state after ADD_TOAST:', newState);
      return newState;

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action

      // ! Side effects ! - This could be extracted into a dismissToast() action,
      // but I'll keep it here for simplicity
      if (toastId) {
        addToRemoveQueue(toastId)
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  console.log('[TOAST DISPATCH] Dispatching action:', action.type);
  console.log('[TOAST DISPATCH] Before reducer - memoryState:', memoryState);
  console.log('[TOAST DISPATCH] Listeners count:', listeners.length);
  
  memoryState = reducer(memoryState, action)
  
  console.log('[TOAST DISPATCH] After reducer - memoryState:', memoryState);
  console.log('[TOAST DISPATCH] Notifying', listeners.length, 'listeners');
  
  listeners.forEach((listener, index) => {
    console.log('[TOAST DISPATCH] Calling listener', index);
    listener(memoryState)
  })
  
  console.log('[TOAST DISPATCH] All listeners notified');
}

type Toast = Omit<ToasterToast, "id"> & {
  action?: {
    label: string;
    onClick: () => void;
  };
}

function toast({ action, ...props }: Toast) {
  console.log('[TOAST] ========================================');
  console.log('[TOAST] toast() function called');
  console.log('[TOAST] Props:', props);
  console.log('[TOAST] Action:', action);
  
  const id = genId()
  console.log('[TOAST] Generated ID:', id);

  const update = (props: ToasterToast) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => {
    console.log('[TOAST] Dismiss called for toast:', id);
    dispatch({ type: "DISMISS_TOAST", toastId: id });
  }

  // Convert action to ToastActionElement if provided
  let actionElement: ToastActionElement | undefined;
  if (action) {
    console.log('[TOAST] Creating action element for action:', action);
    actionElement = React.createElement(
      'button',
      {
        onClick: () => {
          console.log('[TOAST] Action button clicked');
          action.onClick();
          dismiss();
        },
        className: 'inline-flex h-8 shrink-0 items-center justify-center rounded-md border-0 bg-primary hover:bg-primary/90 text-white px-3 text-sm font-medium ring-offset-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      },
      action.label
    ) as unknown as ToastActionElement;
    console.log('[TOAST] Action element created:', actionElement);
  }

  const toastConfig = {
    ...props,
    id,
    open: true,
    action: actionElement,
    onOpenChange: (open: boolean) => {
      console.log('[TOAST] onOpenChange called, open:', open);
      if (!open) dismiss()
    },
  };
  
  console.log('[TOAST] Dispatching ADD_TOAST with config:', toastConfig);
  console.log('[TOAST] Current toasts before dispatch:', memoryState.toasts.length);

  dispatch({
    type: "ADD_TOAST",
    toast: toastConfig,
  })
  
  console.log('[TOAST] After dispatch, toasts count:', memoryState.toasts.length);
  console.log('[TOAST] Current toasts:', memoryState.toasts);
  console.log('[TOAST] Listeners count:', listeners.length);
  console.log('[TOAST] ========================================');

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    console.log('[USE_TOAST] useToast hook mounted');
    console.log('[USE_TOAST] Initial state:', state);
    console.log('[USE_TOAST] Adding listener, current count:', listeners.length);
    
    listeners.push(setState)
    
    console.log('[USE_TOAST] Listener added, new count:', listeners.length);
    
    return () => {
      console.log('[USE_TOAST] useToast hook unmounting');
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
        console.log('[USE_TOAST] Listener removed, remaining count:', listeners.length);
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
