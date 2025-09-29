
import React, { useEffect, useState } from 'react';

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

  useEffect(() => {
    // Find the latest change for this specific resource
    const latestChangeForResource = changes
      .filter(change => change.resource === resource)
      .sort((a, b) => b.timestamp - a.timestamp)[0];

    if (latestChangeForResource) {
      setVisibleChange(latestChangeForResource);

      const timer = setTimeout(() => {
        setVisibleChange(null);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [changes, resource]);

  if (!visibleChange) {
    return null;
  }

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full ml-10 z-50 pointer-events-none">
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
        {visibleChange.amount > 0 ? '+' : ''}{visibleChange.amount}
      </div>
    </div>
  );
}
