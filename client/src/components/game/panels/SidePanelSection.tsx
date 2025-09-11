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
  const visibleItems = items.filter(item => item.visible !== false);
  
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
            <span className="font-mono" data-testid={item.testId}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
