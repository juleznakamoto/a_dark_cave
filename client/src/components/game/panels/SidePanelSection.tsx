
import { useEffect, useRef, useState } from 'react';

interface SidePanelItem {
  id: string;
  label: string;
  value: string | number;
  testId?: string;
  visible?: boolean;
}

interface SidePanelSectionProps {
  title: string;
  items: SidePanelItem[];
  visible?: boolean;
  className?: string;
}

export default function SidePanelSection({ 
  title, 
  items, 
  visible = true, 
  className = "" 
}: SidePanelSectionProps) {
  const visibleItems = (items || []).filter(item => item.visible !== false);
  const [animatedItems, setAnimatedItems] = useState<Set<string>>(new Set());
  const prevValuesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const newAnimatedItems = new Set<string>();
    
    visibleItems.forEach((item) => {
      const currentValue = typeof item.value === 'number' ? item.value : parseInt(item.value.toString()) || 0;
      const prevValue = prevValuesRef.current.get(item.id) || 0;
      
      if (currentValue > prevValue) {
        newAnimatedItems.add(item.id);
        // Remove animation after 1 second
        setTimeout(() => {
          setAnimatedItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(item.id);
            return newSet;
          });
        }, 1000);
      }
      
      prevValuesRef.current.set(item.id, currentValue);
    });
    
    if (newAnimatedItems.size > 0) {
      setAnimatedItems(prev => new Set([...prev, ...newAnimatedItems]));
    }
  }, [visibleItems]);

  if (!visible || visibleItems.length === 0) {
    return null;
  }

  return (
    <div className={`px-4 py-3 border-t border-border ${className}`}>
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h3>
      <div className="space-y-1 text-sm">
        {visibleItems.map((item) => (
          <div key={item.id} className="flex justify-between">
            <span>{item.label}</span>
            <span 
              className={`font-mono transition-all duration-300 ${
                animatedItems.has(item.id) 
                  ? 'font-bold text-green-600 scale-110' 
                  : ''
              }`}
              data-testid={item.testId}
            >
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
