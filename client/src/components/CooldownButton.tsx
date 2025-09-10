
import React from 'react';
import { Button } from '@/components/ui/button';
import { useCooldown } from '@/hooks/useCooldown';

interface CooldownButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  cooldownMs: number;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  'data-testid'?: string;
}

export default function CooldownButton({
  children,
  onClick,
  cooldownMs,
  disabled = false,
  className = '',
  variant = 'default',
  size = 'default',
  'data-testid': testId,
  ...props
}: CooldownButtonProps) {
  const { isCoolingDown, progress, startCooldown } = useCooldown();

  const handleClick = () => {
    if (isCoolingDown || disabled) return;
    
    // Execute the action immediately
    onClick();
    
    // Start the cooldown
    startCooldown(cooldownMs);
  };

  const isButtonDisabled = disabled || isCoolingDown;

  return (
    <div className="relative inline-block">
      <Button
        onClick={handleClick}
        disabled={isButtonDisabled}
        variant={variant}
        size={size}
        className={`relative overflow-hidden transition-all duration-200 ${
          isCoolingDown ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
        data-testid={testId}
        {...props}
      >
        {/* Button content */}
        <span className="relative z-10">{children}</span>
        
        {/* Cooldown progress overlay */}
        {isCoolingDown && (
          <div
            className="absolute inset-0 bg-black/20 transition-all duration-75 ease-linear"
            style={{
              width: `${(1 - progress) * 100}%`,
              right: 0,
              left: 'auto',
            }}
          />
        )}
      </Button>
    </div>
  );
}
