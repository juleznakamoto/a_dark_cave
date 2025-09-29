
import React, { useEffect, useState, useRef } from 'react';

interface ResourceChange {
  resource: string;
  amount: number;
  timestamp: number;
}

interface ResourceChangeNotificationProps {
  resource: string;
  changes: ResourceChange[];
}

export default function ResourceChangeNotification({ resource, changes }: ResourceChangeNotificationProps) {
  const [visibleChange, setVisibleChange] = useState<ResourceChange | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastChangeTimestampRef = useRef<number>(0);

  useEffect(() => {
    // Find the latest change for this specific resource
    const latestChangeForResource = changes
      .filter(change => change.resource === resource)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    // Only update if we have a new change (different timestamp)
    if (latestChangeForResource && latestChangeForResource.timestamp !== lastChangeTimestampRef.current) {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setVisibleChange(latestChangeForResource);
      lastChangeTimestampRef.current = latestChangeForResource.timestamp;

      // Set new timer
      timerRef.current = setTimeout(() => {
        setVisibleChange(null);
        timerRef.current = null;
      }, 2500);
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [changes, resource]);

  // Also clear notification if changes array becomes empty
  useEffect(() => {
    if (changes.length === 0 && visibleChange) {
      setVisibleChange(null);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
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
          font-mono text-sm
          animate-in fade-in-0 slide-in-from-left-2 duration-200
          ${visibleChange.amount > 0 
            ? 'text-green-600' 
            : 'text-red-600'
          }
        `}
      >
        {visibleChange.amount > 0 ? '+' : ''}{Math.round(visibleChange.amount)}
      </div>
    </div>
  );
}
