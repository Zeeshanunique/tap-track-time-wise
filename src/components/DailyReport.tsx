
import React from 'react';
import { useTimer } from '@/context/TimerContext';
import { formatDuration, formatDate, getLastNDays } from '@/utils/timeUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const DailyReport = () => {
  const { getDailyTotal } = useTimer();
  const last7Days = getLastNDays(7);
  
  // Find the max duration for scaling the progress bars
  const maxDuration = Math.max(
    ...last7Days.map(date => getDailyTotal(date)),
    3600 // Minimum of 1 hour for scaling
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Daily Report</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {last7Days.map((date, index) => {
          const totalSeconds = getDailyTotal(date);
          const percentage = Math.min(100, Math.floor((totalSeconds / maxDuration) * 100));
          
          return (
            <div key={date} className="space-y-1">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium">
                  {index === 0 ? 'Today' : index === 1 ? 'Yesterday' : formatDate(date)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDuration(totalSeconds)}
                </div>
              </div>
              <Progress value={percentage} className="h-2" />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default DailyReport;
