
import React, { useEffect, useState, useRef } from 'react';

interface ResourceChange {
  resource: string;
  amount: number;
  timestamp: number;
}

// Helper function to abbreviate large numbers
const abbreviateNumber = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  if (absNum >= 1000000000) {
    return sign + (absNum / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (absNum >= 1000000) {
    return sign + (absNum / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (absNum >= 1000) {
    return sign + (absNum / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
};

interface ResourceChangeNotificationProps {
  resource: string;
  changes: ResourceChange[];
}

export default function ResourceChangeNotification({ resource, changes }: ResourceChangeNotificationProps) {
  const [visibleChange, setVisibleChange] = useState<ResourceChange | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const microDelayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeTimestampRef = useRef<number>(0);

  useEffect(() => {
    // Find the latest change overall (not just for this resource)
    const latestChangeOverall = changes
      .sort((a, b) => b.timestamp - a.timestamp)[0];
    
    // Find the latest change for this specific resource
    const latestChangeForResource = changes
      .filter(change => change.resource === resource)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    // If there's ANY new change (different timestamp than our last one), clear the current notification
    if (latestChangeOverall && visibleChange && latestChangeOverall.timestamp !== lastChangeTimestampRef.current) {
      // Clear any existing timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (microDelayTimerRef.current) {
        clearTimeout(microDelayTimerRef.current);
        microDelayTimerRef.current = null;
      }
      
      // Immediately clear the old change
      setVisibleChange(null);
      lastChangeTimestampRef.current = 0; // Reset to allow new change to show
    }

    // Only update if we have a new change for THIS resource (different timestamp)
    if (latestChangeForResource && latestChangeForResource.timestamp !== lastChangeTimestampRef.current) {
      // Clear any existing timers
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (microDelayTimerRef.current) {
        clearTimeout(microDelayTimerRef.current);
        microDelayTimerRef.current = null;
      }

      // Immediately clear the old change before showing the new one
      setVisibleChange(null);
      
      // Use a micro-delay to ensure the DOM updates and the animation can restart
      microDelayTimerRef.current = setTimeout(() => {
        setVisibleChange(latestChangeForResource);
        lastChangeTimestampRef.current = latestChangeForResource.timestamp;

        // Set new timer
        timerRef.current = setTimeout(() => {
          setVisibleChange(null);
          timerRef.current = null;
        }, 3000);
        
        microDelayTimerRef.current = null;
      }, 10);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (microDelayTimerRef.current) {
        clearTimeout(microDelayTimerRef.current);
        microDelayTimerRef.current = null;
      }
    };
  }, [changes, resource, visibleChange]);

  // Also clear notification if changes array becomes empty
  useEffect(() => {
    if (changes.length === 0 && visibleChange) {
      setVisibleChange(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (microDelayTimerRef.current) {
        clearTimeout(microDelayTimerRef.current);
        microDelayTimerRef.current = null;
      }
    }
  }, [changes.length, visibleChange]);

  if (!visibleChange) {
    return null;
  }

  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 z-50 pointer-events-none">
      <div
        className={`
          text-xs font-mono
          animate-in fade-in-0 slide-in-from-left-2 duration-300
          ${visibleChange.amount > 0 
            ? 'text-green-800' 
            : 'text-red-800'
          }
        `}
      >
        {visibleChange.amount > 0 ? '+' : ''}{abbreviateNumber(Math.round(visibleChange.amount))}
      </div>
    </div>
  );
}
