
import React, { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { useTimer } from '@/context/TimerContext';
import { formatTime } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Timer = () => {
  const { isRunning, startTimer, stopTimer, currentSession } = useTimer();
  const [elapsedTime, setElapsedTime] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    let intervalId: number | undefined;

    if (isRunning && currentSession) {
      // Update elapsed time initially
      const startTime = new Date(currentSession.startTime);
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));

      // Set up interval to update elapsed time every second
      intervalId = window.setInterval(() => {
        const startTime = new Date(currentSession.startTime);
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isRunning, currentSession]);

  const toggleTimer = () => {
    if (isRunning) {
      stopTimer();
      // Show toast when time is added to today's progress
      toast({
        title: 'Session completed',
        description: `${formatTime(elapsedTime)} added to today's progress`,
      });
    } else {
      startTimer();
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
