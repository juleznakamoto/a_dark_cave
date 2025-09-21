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
      console.log('EventDialog: Timer disabled - event:', !!event, 'isTimedChoice:', event?.isTimedChoice, 'isOpen:', isOpen);
      setTimeRemaining(null);
      setTotalTime(0);
      fallbackExecutedRef.current = false;
      return;
    }

    const knowledge = getTotalKnowledge(gameState);
    const decisionTime = (event.baseDecisionTime || 15) + (0.5 * knowledge);
    console.log('EventDialog: Starting timer -', {
      eventId: event.id,
      baseDecisionTime: event.baseDecisionTime,
      knowledge,
      totalDecisionTime: decisionTime,
      fallbackChoice: event.fallbackChoice
    });
    
    setTotalTime(decisionTime);
    setTimeRemaining(decisionTime);
    startTimeRef.current = Date.now();
    fallbackExecutedRef.current = false;

    const interval = setInterval(() => {
      if (fallbackExecutedRef.current) {
        console.log('EventDialog: Timer stopped - fallback already executed');
        return;
      }
      
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, decisionTime - elapsed);
      
      setTimeRemaining(remaining);
      
      if (remaining <= 0 && !fallbackExecutedRef.current) {
        console.log('EventDialog: Timer expired! Executing fallback -', {
          remaining,
          fallbackChoice: event.fallbackChoice,
          eventId: event.id.split('-')[0]
        });
        
        fallbackExecutedRef.current = true;
        clearInterval(interval);
        
        // Time expired, execute fallback choice
        if (event.fallbackChoice) {
          const eventId = event.id.split('-')[0];
          console.log('EventDialog: Applying fallback choice:', event.fallbackChoice.id, 'for event:', eventId);
          applyEventChoice(event.fallbackChoice.id, eventId);
          onClose();
        } else {
          console.log('EventDialog: No fallback choice defined!');
        }
      }
    }, 100);

    return () => {
      console.log('EventDialog: Cleaning up timer for event:', event.id);
      clearInterval(interval);
      fallbackExecutedRef.current = false;
    };
  }, [event?.id, event?.isTimedChoice, event?.baseDecisionTime, isOpen]);

  if (!event || !event.choices) return null;

  const handleChoice = (choiceId: string) => {
    console.log('EventDialog: Manual choice selected -', {
      choiceId,
      eventId: event?.id,
      fallbackAlreadyExecuted: fallbackExecutedRef.current
    });
    
    if (fallbackExecutedRef.current) {
      console.log('EventDialog: Ignoring manual choice - fallback already executed');
      return;
    }
    
    fallbackExecutedRef.current = true;
    const eventId = event!.id.split('-')[0];
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
              disabled={(timeRemaining !== null && timeRemaining <= 0) || fallbackExecutedRef.current}
            >
              {choice.label}
            </Button>
          ))}
        </div>

        {/* Timer bar for timed choices */}
        {event.isTimedChoice && timeRemaining !== null && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{Math.ceil(Math.max(0, timeRemaining))}s</span>
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