import { createContext, useContext } from "react";

/**
 * Lives in its own module so Vite HMR of `ProfileMenu.tsx` cannot create a
 * second context object. GameContainer may keep an older Provider while
 * GameHeader already imported newer consumers; a shared context identity
 * keeps them connected.
 */
export const ProfileMenuContext = createContext<unknown>(null);

export function useProfileMenuContext<T>(): T {
  const ctx = useContext(ProfileMenuContext);
  if (ctx == null) {
    throw new Error("GameHeaderControls must be used within ProfileMenuProvider");
  }
  return ctx as T;
}
