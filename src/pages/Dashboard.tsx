
import React, { useMemo } from 'react';
import { useTimer } from '@/context/TimerContext';
import { ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDuration, formatDate, getLastNDays } from '@/utils/timeUtils';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { allSessions, getDailyTotal } = useTimer();
  const last30Days = getLastNDays(30);

  // Group sessions by date - memoized to improve performance
  const sessionsByDate = useMemo(() => {
    return allSessions.reduce((acc: Record<string, any[]>, session) => {
      if (!acc[session.date]) {
        acc[session.date] = [];
      }
      acc[session.date].push(session);
      return acc;
    }, {});
  }, [allSessions]);

  // Calculate total duration for each day - memoized to improve performance
  const dailyTotals = useMemo(() => {
    return last30Days.map(date => {
      const sessions = sessionsByDate[date] || [];
      const completedSessions = sessions.filter(session => session.duration !== null);
      const totalDuration = completedSessions.reduce((total, session) => total + (session.duration || 0), 0);
      const sessionCount = completedSessions.length;
      
      return {
        date,
        totalDuration,
        sessionCount
      };
    });
  }, [last30Days, sessionsByDate]);

  // Calculate grand total of time tracked
  const grandTotal = useMemo(() => {
    return dailyTotals.reduce((total, day) => total + day.totalDuration, 0);
  }, [dailyTotals]);

  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-8 flex flex-col">
      <header className="mb-8 flex items-center">
        <Link to="/">
          <Button variant="ghost" size="icon" className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">TapTrack Dashboard</h1>
          <p className="text-muted-foreground">Detailed productivity tracking</p>
        </div>
      </header>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Total Time Tracked</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {formatDuration(grandTotal)}
          </div>
          <p className="text-muted-foreground mt-1">
            {dailyTotals.filter(day => day.sessionCount > 0).length} active days
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <span>Monthly Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>Total Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyTotals.map(day => (
                <TableRow key={day.date} className={day.totalDuration > 0 ? '' : 'opacity-50'}>
                  <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                  <TableCell>{day.sessionCount}</TableCell>
                  <TableCell className={
                    day.totalDuration > 10800 ? 'text-green-500 font-medium' : 
                    day.totalDuration > 3600 ? 'text-blue-500' : 
                    day.totalDuration > 0 ? 'text-orange-500' : ''
                  }>
                    {formatDuration(day.totalDuration)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
