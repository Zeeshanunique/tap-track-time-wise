
import React from 'react';
import { useTimer } from '@/context/TimerContext';
import { formatDuration, formatDate, getLastNDays } from '@/utils/timeUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

const DailyReport = () => {
  const { getDailyTotal } = useTimer();
  const last7Days = getLastNDays(7);
  
  // Find the max duration for scaling the progress bars
  const maxDuration = Math.max(
    ...last7Days.map(date => getDailyTotal(date)),
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Daily Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {last7Days.map((date, index) => {
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
