import { createContext } from "react";

/** True while rendered inside DialogContent. Buttons read this for the shared fill. */
export const DialogButtonSurfaceContext = createContext(false);
