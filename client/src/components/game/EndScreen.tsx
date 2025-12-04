import { useEffect } from "react";

export default function EndScreen() {
  useEffect(() => {
    // Navigate to the dedicated end screen page
    window.location.replace("/end-screen");
  }, []);

  return null;
}