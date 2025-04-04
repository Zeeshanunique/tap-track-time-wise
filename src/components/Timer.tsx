
import React, { useState, useEffect } from 'react';
import { Play, Square } from 'lucide-react';
import { useTimer } from '@/context/TimerContext';
import { formatTime } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';

const Timer = () => {
  const { isRunning, startTimer, stopTimer, currentSession } = useTimer();
  const [elapsedTime, setElapsedTime] = useState(0);

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
    } else {
      startTimer();
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
          isRunning ? 'bg-destructive hover:bg-destructive/90' : 'bg-primary hover:bg-primary/90 pulse-animation'
        }`}
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
