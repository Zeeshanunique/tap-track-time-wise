import React, { useState, useEffect } from 'react';
import { useTimer } from '@/context/TimerContext';
import { formatDuration, formatDate, getLastNDays } from '@/utils/timeUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

const DailyReport = () => {
  const { getDailyTotal, allSessions, syncPendingOperations } = useTimer();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState('');
  const [reportDays, setReportDays] = useState<string[]>([]);
  
  // Initialize days list and set up current date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setCurrentDate(today);
    setReportDays(getLastNDays(7));
  }, []);
  
  // Check for date changes periodically
  useEffect(() => {
    const dateCheckInterval = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // If the date has changed, update the days list
      if (today !== currentDate) {
        setCurrentDate(today);
        setReportDays(getLastNDays(7));
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(dateCheckInterval);
  }, [currentDate]);
  
  // Find the max duration for scaling the progress bars
  const maxDuration = Math.max(
    ...reportDays.map(date => getDailyTotal(date)),
    3600 // Minimum of 1 hour for scaling
  );

  // Function to determine progress bar color
  const getProgressColor = (totalSeconds: number) => {
    if (totalSeconds > 14400) return 'bg-purple-500'; // > 4 hours: purple
    if (totalSeconds > 10800) return 'bg-blue-500';   // > 3 hours: blue
    if (totalSeconds > 7200) return 'bg-green-500';   // > 2 hours: green
    if (totalSeconds > 3600) return 'bg-yellow-500';  // > 1 hour: yellow
    if (totalSeconds > 0) return 'bg-orange-500';     // > 0: orange
    return '';                                        // 0: default
  };

  // Force refresh data and sync with server
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncPendingOperations();
      // Allow UI to show the refresh animation for at least 800ms
      setTimeout(() => {
        setIsRefreshing(false);
      }, 800);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsRefreshing(false);
    }
  };

  // Refresh data whenever allSessions changes
  useEffect(() => {
    // This effect just exists to re-render the component when allSessions changes
  }, [allSessions]);

  return (
    <Card className="w-full">
      <CardHeader className="pb-2 flex flex-row justify-between items-center">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Report
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={isRefreshing ? 'animate-spin' : ''}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {reportDays.map((date, index) => {
          const totalSeconds = getDailyTotal(date);
          const percentage = Math.min(100, Math.floor((totalSeconds / maxDuration) * 100));
          const progressColor = getProgressColor(totalSeconds);
          
          return (
            <div key={date} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">
                  {index === 0 ? 'Today' : index === 1 ? 'Yesterday' : formatDate(date)}
                </div>
                <div className={`text-sm font-medium ${
                  totalSeconds > 10800 ? 'text-blue-500' : 
                  totalSeconds > 3600 ? 'text-green-500' : 
                  totalSeconds > 0 ? 'text-orange-500' : 'text-muted-foreground'
                }`}>
                  {formatDuration(totalSeconds)}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className={`h-2 ${progressColor}`} 
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DailyReport;
