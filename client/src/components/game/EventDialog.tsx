import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/game/state';
import { LogEntry } from '@/game/rules/events';
import { getTotalKnowledge } from '@/game/rules/effects';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface EventDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: LogEntry | null;
}

export default function EventDialog({ isOpen, onClose, event }: EventDialogProps) {
  const { applyEventChoice } = useGameStore();
  const gameState = useGameStore();

  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [totalTime, setTotalTime] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const fallbackExecutedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const executeFallback = useCallback(() => {
    if (fallbackExecutedRef.current || !event?.fallbackChoice) return;
    
    fallbackExecutedRef.current = true;
    setIsTimerActive(false);
    
    const eventId = event.id.split('-')[0];
    applyEventChoice(event.fallbackChoice.id, eventId);
    onClose();
  }, [event, applyEventChoice, onClose]);

  // Initialize timer for timed choices
  useEffect(() => {
    // Clear any existing timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!event || !event.isTimedChoice || !isOpen) {
      setTimeRemaining(0);
      setTotalTime(0);
      setIsTimerActive(false);
      fallbackExecutedRef.current = false;
      return;
    }

    const knowledge = getTotalKnowledge(gameState);
    const decisionTime = (event.baseDecisionTime || 15) + (0.5 * knowledge);
    
    setTotalTime(decisionTime);
    setTimeRemaining(decisionTime * 1000); // Convert to milliseconds for precision
    setIsTimerActive(true);
    fallbackExecutedRef.current = false;

    // Use 50ms intervals for smooth updates, similar to cooldown system
    intervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newRemaining = Math.max(0, prev - 50);
        
        if (newRemaining <= 0) {
          // Timer expired, execute fallback
          setTimeout(() => executeFallback(), 0);
          return 0;
        }
        
        return newRemaining;
      });
    }, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen, gameState, executeFallback]);

  if (!event || !event.choices) return null;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) return;
    
    // Stop the timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    fallbackExecutedRef.current = true;
    setIsTimerActive(false);
    
    const eventId = event.id.split('-')[0];
    applyEventChoice(choiceId, eventId);
    onClose();
  };

  // Calculate progress (0 = just started, 100 = finished)
  const progress = event?.isTimedChoice && totalTime > 0 
    ? ((totalTime * 1000 - timeRemaining) / (totalTime * 1000)) * 100 
    : 0;
    
  const displayTimeRemaining = Math.ceil(Math.max(0, timeRemaining / 1000));

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md [&>button]:hidden" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {event.title || "Strange Encounter"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-2">
            {event.message}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {event.choices.map((choice) => (
            <Button
              key={choice.id}
              onClick={() => handleChoice(choice.id)}
              variant="outline"
              className="w-full text-left justify-start"
              disabled={!isTimerActive && event.isTimedChoice && timeRemaining <= 0}
            >
              {choice.label}
            </Button>
          ))}
        </div>

        {/* Timer bar for timed choices */}
        {event.isTimedChoice && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{displayTimeRemaining}s</span>
              <span>Decision Time</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}