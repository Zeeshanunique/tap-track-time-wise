
import React, { useEffect, useState } from 'react';
import Timer from '@/components/Timer';
import { Button } from '@/components/ui/button';
import { BarChart3, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTimer } from '@/context/TimerContext';
import { formatDuration } from '@/utils/timeUtils';

const Index = () => {
  const { getDailyTotal } = useTimer();
  const [todayTotal, setTodayTotal] = useState<number>(0);
  
  useEffect(() => {
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];
    // Get total time for today
    const total = getDailyTotal(today);
    setTodayTotal(total);
  }, [getDailyTotal]);

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
          <Timer onSessionEnd={() => {
            // Update today's total time whenever a session ends
            const today = new Date().toISOString().split('T')[0];
            setTodayTotal(getDailyTotal(today));
          }} />
        </div>
      </div>
    </div>
  );
};

export default Index;
