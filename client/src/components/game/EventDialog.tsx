import React, { useState, useEffect, useRef } from 'react';
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

  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState<number>(0);
  const startTimeRef = useRef<number>(0);
  const fallbackExecutedRef = useRef(false);

  // Initialize timer for timed choices
  useEffect(() => {
    if (!event || !event.isTimedChoice || !isOpen) {
      setTimeRemaining(null);
      setTotalTime(0);
      fallbackExecutedRef.current = false;
      return;
    }

    const knowledge = getTotalKnowledge(gameState);
    const decisionTime = (event.baseDecisionTime || 15) + (0.5 * knowledge);
    setTotalTime(decisionTime);
    setTimeRemaining(decisionTime);
    startTimeRef.current = Date.now();
    fallbackExecutedRef.current = false;

    const interval = setInterval(() => {
      if (fallbackExecutedRef.current) return;
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, decisionTime - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0 && !fallbackExecutedRef.current) {
        fallbackExecutedRef.current = true;
        clearInterval(interval);
        
        // Time expired, execute fallback choice
        if (event.fallbackChoice) {
          const eventId = event.id.split('-')[0];
          applyEventChoice(event.fallbackChoice.id, eventId);
          onClose();
        }
      }
    }, 100);

    return () => {
      clearInterval(interval);
      fallbackExecutedRef.current = false;
    };
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen]);

  if (!event || !event.choices) return null;

  const handleChoice = (choiceId: string) => {
    if (fallbackExecutedRef.current) return;
    fallbackExecutedRef.current = true;
    const eventId = event.id.split('-')[0];
    applyEventChoice(choiceId, eventId);
    onClose();
  };

  const progress = event.isTimedChoice && timeRemaining !== null && totalTime > 0 
    ? ((totalTime - timeRemaining) / totalTime) * 100 
    : 0;

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
              disabled={timeRemaining === 0 || fallbackExecutedRef.current}
            >
              {choice.label}
            </Button>
          ))}
        </div>

        {/* Timer bar for timed choices */}
        {event.isTimedChoice && timeRemaining !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Time remaining:</span>
              <span>{Math.ceil(Math.max(0, timeRemaining))}s</span>
            </div>
            <Progress 
              value={progress} 
              className="h-2"
            />
            {timeRemaining <= 3 && timeRemaining > 0 && (
              <div className="text-xs text-red-500 font-medium">
                Warning: Time is running out!
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}