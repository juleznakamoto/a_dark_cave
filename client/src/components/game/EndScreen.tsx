import { useEffect } from "react";

export default function EndScreen() {
  useEffect(() => {
    // Navigate to the dedicated end screen page
    window.location.href = "/end-screen";
  }, []);

  return null;
}