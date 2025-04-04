
import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square } from 'lucide-react';
import { useTimer } from '@/context/TimerContext';
import { formatTime } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface TimerProps {
  onSessionEnd?: () => void;
}

const Timer = ({ onSessionEnd }: TimerProps) => {
  const { isRunning, startTimer, stopTimer, currentSession } = useTimer();
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  // Update elapsed time function
  const updateElapsedTime = useCallback(() => {
    if (isRunning && currentSession) {
      const startTime = new Date(currentSession.startTime);
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }
  }, [isRunning, currentSession]);

  // Set up interval to update elapsed time
  useEffect(() => {
    if (!isRunning) {
      setElapsedTime(0);
      return;
    }
    
    // Update initially
    updateElapsedTime();
    
    // Then set interval
    const intervalId = window.setInterval(updateElapsedTime, 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [isRunning, updateElapsedTime]);

  const toggleTimer = async () => {
    if (isRunning) {
      const duration = elapsedTime;
      await stopTimer();
      
      // Call the onSessionEnd callback if provided
      if (onSessionEnd) {
        onSessionEnd();
      }
      
      // Show toast when time is added to today's progress
      toast({
        title: 'Session completed',
        description: `${formatTime(duration)} added to today's progress`,
      });
    } else {
      await startTimer();
    }
  };

  // Determine button color based on state and elapsed time
  const getButtonClasses = () => {
    if (isRunning) {
      // Different shades of red based on elapsed time
      if (elapsedTime > 3600) { // More than 1 hour
        return 'bg-red-700 hover:bg-red-800';
      } else if (elapsedTime > 1800) { // More than 30 minutes
        return 'bg-red-600 hover:bg-red-700';
      } else {
        return 'bg-red-500 hover:bg-red-600';
      }
    } else {
      // Different shades of green for start button
      return 'bg-emerald-500 hover:bg-emerald-600';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="text-5xl font-medium tracking-tight text-primary">
        {formatTime(elapsedTime)}
      </div>
      
      <Button
        onClick={toggleTimer}
        className={`rounded-full w-40 h-40 flex items-center justify-center shadow-lg ${
          getButtonClasses()
        } transition-colors duration-300`}
        size="lg"
      >
        {isRunning ? (
          <Square className="h-16 w-16" />
        ) : (
          <Play className="h-16 w-16 ml-2" />
        )}
      </Button>
      
      <p className="text-lg text-muted-foreground">
        {isRunning ? "Tap to stop tracking" : "Tap to start tracking"}
      </p>
    </div>
  );
};

export default Timer;
