import { useSyncExternalStore } from "react";

let inviteFriendsFloatingDismissed = false;
let inviteFriendsFloatingRendered = false;
const listeners = new Set<() => void>();

function emitInviteFriendsFloatingUi() {
  listeners.forEach((listener) => listener());
}

function subscribeInviteFriendsFloatingUi(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

export function dismissInviteFriendsFloating(): void {
  if (inviteFriendsFloatingDismissed) return;
  inviteFriendsFloatingDismissed = true;
  emitInviteFriendsFloatingUi();
}

export function isInviteFriendsFloatingDismissed(): boolean {
  return inviteFriendsFloatingDismissed;
}

/** Session-only dismiss of the web floating invite CTA. */
export function useInviteFriendsFloatingDismissed(): boolean {
  return useSyncExternalStore(
    subscribeInviteFriendsFloatingUi,
    isInviteFriendsFloatingDismissed,
    () => false,
  );
}

/**
 * Called by the floating invite while it is mounted and visible so the log
 * filter can sit above it and drop down when it disappears.
 */
export function setInviteFriendsFloatingRendered(rendered: boolean): void {
  if (inviteFriendsFloatingRendered === rendered) return;
  inviteFriendsFloatingRendered = rendered;
  emitInviteFriendsFloatingUi();
}

export function isInviteFriendsFloatingRendered(): boolean {
  return inviteFriendsFloatingRendered;
}

export function useInviteFriendsFloatingRendered(): boolean {
  return useSyncExternalStore(
    subscribeInviteFriendsFloatingUi,
    isInviteFriendsFloatingRendered,
    () => false,
  );
}
