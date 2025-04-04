import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, WifiOff } from 'lucide-react';
import { useTimer } from '@/context/TimerContext';
import { formatTime } from '@/utils/timeUtils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

interface TimerProps {
  onSessionEnd?: () => void;
}

const Timer = ({ onSessionEnd }: TimerProps) => {
  const { user } = useAuth();
  const { isRunning, startTimer, stopTimer, currentSession, syncPendingOperations } = useTimer();
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  // Track online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'You are back online',
        description: 'Syncing your data with the server...',
      });
      syncPendingOperations();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'You are offline',
        description: 'Your timer will work in offline mode until connection is restored',
        variant: 'destructive',
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, syncPendingOperations]);

  // Update elapsed time function and check if day changed
  const updateElapsedTime = useCallback(() => {
    if (isRunning && currentSession) {
      const startTime = new Date(currentSession.startTime);
      const now = new Date();
      setElapsedTime(Math.floor((now.getTime() - startTime.getTime()) / 1000));
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
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to track your time',
        variant: 'destructive',
      });
      return;
    }
    
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
      
      if (!isOnline) {
        toast({
          title: 'Offline mode',
          description: 'Your session will be synced when you reconnect',
          variant: 'default',
        });
      }
    } else {
      await startTimer();
      
      if (!isOnline) {
        toast({
          title: 'Offline mode',
          description: 'Your session will be synced when you reconnect',
          variant: 'default',
        });
      }
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
      {!isOnline && (
        <div className="flex items-center gap-2 bg-amber-100 text-amber-800 px-4 py-2 rounded-lg mb-4">
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline Mode</span>
        </div>
      )}
      
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
