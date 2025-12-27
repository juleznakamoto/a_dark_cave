
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { onINP } from 'web-vitals';

// Monitor INP with detailed logging
onINP((metric) => {
  console.log('📊 INP Metric:', {
    value: `${Math.round(metric.value)}ms`,
    rating: metric.rating,
    attribution: metric.attribution,
  });
  
  if (metric.value > 200) {
    console.warn('⚠️ Poor INP detected!', {
      'INP Value': `${Math.round(metric.value)}ms`,
      'Target': '<200ms',
      'Status': metric.rating,
      'Interaction': metric.entries[0]?.name,
      'Element': metric.entries[0]?.target,
    });
  }
}, { reportAllChanges: true });

createRoot(document.getElementById("root")!).render(<App />);
