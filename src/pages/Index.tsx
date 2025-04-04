import React, { useEffect, useState } from 'react';
import Timer from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimer } from '@/context/TimerContext';
import { formatDuration, getTodayDateString } from '@/utils/timeUtils';

const Index = () => {
  const { getTotalWithRunningSession, isRunning, currentSession } = useTimer();
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<string>('');
  
  // Function to update today's total
  const updateTodayTotal = () => {
    const today = getTodayDateString();
    
    // If the date has changed, update the current date
    if (today !== currentDate) {
      setCurrentDate(today);
    }
    
    // Get total time for today including any active session
    const total = getTotalWithRunningSession(today);
    setTodayTotal(total);
  };
  
  // Update progress in real-time when a timer is running
  useEffect(() => {
    // Initial update
    updateTodayTotal();
    
    // Set up interval to update the running session time
    const progressInterval = isRunning ? 
      setInterval(updateTodayTotal, 1000) : null;
    
    return () => {
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [isRunning, currentSession]);
  
  // Initial load and set up date checking
  useEffect(() => {
    // Set initial date
    const today = getTodayDateString();
    setCurrentDate(today);
    updateTodayTotal();
    
    // Set up interval to check for date changes (every minute)
    const dateCheckInterval = setInterval(() => {
      const now = new Date();
      const today = getTodayDateString();
      
      // If the date has changed, update today's total
      if (today !== currentDate) {
        updateTodayTotal();
      }
    }, 60000);
    
    return () => clearInterval(dateCheckInterval);
  }, [currentDate]);

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-8 flex flex-col">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-center">TapTrack</h1>
          <p className="text-center text-muted-foreground">Track your productive time</p>
        </div>
        <Link to="/dashboard">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </Button>
        </Link>
      </header>

      <div className="flex-1 flex flex-col">
        <div className="mb-8 mx-auto p-4 bg-muted rounded-lg flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Today's Progress</p>
            <p className="text-xl font-bold text-primary">{formatDuration(todayTotal)}</p>
          </div>
        </div>
        
        <div className="flex-grow flex items-center justify-center">
          <Timer onSessionEnd={updateTodayTotal} />
        </div>
      </div>
    </div>
  );
};

export default Index;
