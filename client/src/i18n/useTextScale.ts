import { useCallback, useEffect, useState } from "react";
import {
  TEXT_SCALE_CHANGE_EVENT,
  TEXT_SCALE_OPTIONS,
  getStoredTextScale,
  setTextScale as persistTextScale,
  type TextScale,
} from "@/lib/textScale";

export function useTextScale() {
  const [textScale, setTextScaleState] = useState<TextScale>(() =>
    getStoredTextScale(),
  );

  useEffect(() => {
    const sync = () => setTextScaleState(getStoredTextScale());
    window.addEventListener(TEXT_SCALE_CHANGE_EVENT, sync);
    return () => window.removeEventListener(TEXT_SCALE_CHANGE_EVENT, sync);
  }, []);

  const setTextScale = useCallback((scale: TextScale) => {
    persistTextScale(scale);
    setTextScaleState(scale);
  }, []);

  return {
    textScale,
    setTextScale,
    textScaleOptions: TEXT_SCALE_OPTIONS,
  };
}
