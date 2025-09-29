
import React, { useEffect, useState } from 'react';
import { capitalizeWords } from '@/lib/utils';

interface ResourceChange {
  resource: string;
  amount: number;
  timestamp: number;
}

interface ResourceChangeNotificationProps {
  changes: ResourceChange[];
}

export default function ResourceChangeNotification({ changes }: ResourceChangeNotificationProps) {
  const [visibleChanges, setVisibleChanges] = useState<ResourceChange[]>([]);

  useEffect(() => {
    if (changes.length > 0) {
      const latestChange = changes[changes.length - 1];
      setVisibleChanges([latestChange]);

      const timer = setTimeout(() => {
        setVisibleChanges([]);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [changes]);

  if (visibleChanges.length === 0) {
    return null;
  }

  return (
    <div className="absolute left-full ml-2 top-0 z-50 pointer-events-none">
      {visibleChanges.map((change) => (
        <div
          key={`${change.resource}-${change.timestamp}`}
          className={`
            font-mono text-sm
            animate-in fade-in-0 slide-in-from-left-2 duration-200
            ${change.amount > 0 
              ? 'text-green-600' 
              : 'text-red-600'
            }
          `}
        >
          {change.amount > 0 ? '+' : ''}{change.amount}
        </div>
      ))}
    </div>
  );
}
