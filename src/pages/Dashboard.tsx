import React, { useEffect, useMemo, useState } from 'react';
import { useTimer } from '@/context/TimerContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Calendar, LogOut, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDuration, formatDate, getLastNDays, getTodayDateString, formatDateShort } from '@/utils/timeUtils';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { allSessions, getDailyTotal, getTotalWithRunningSession, isRunning, currentSession } = useTimer();
  const today = getTodayDateString();
  const last30Days = getLastNDays(30);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaysProgress, setTodaysProgress] = useState(0);
  const [tableUpdateTrigger, setTableUpdateTrigger] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    setRefreshKey(Date.now());

    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 700);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);

      const currentDay = getTodayDateString();
      const previousDay = refreshKey ? new Date(refreshKey).toISOString().split('T')[0] : '';

      if (currentDay !== previousDay && refreshKey !== 0) {
        setRefreshKey(Date.now());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [refreshKey]);

  // Update today's progress in real-time
  useEffect(() => {
    // Function to update today's progress
    const updateProgress = () => {
      try {
        const newProgress = getTotalWithRunningSession(today);
        setTodaysProgress(newProgress);
      } catch (error) {
        console.error("Error updating today's progress:", error);
      }
    };
    
    // Initial update
    updateProgress();
    
    // Set up interval for updates - use more frequent updates when timer is running
    const progressInterval = setInterval(() => {
      if (isRunning && currentSession?.date === today) {
        updateProgress();
      }
    }, 1000); // Update every second when active
    
    // Additional polling at lower frequency for general sync
    const syncInterval = setInterval(updateProgress, 10000); // Every 10 seconds for general sync
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(syncInterval);
    };
  }, [isRunning, currentSession, allSessions, today, getTotalWithRunningSession]);

  // Force update data when dashboard becomes visible
  useEffect(() => {
    // This will run whenever the Dashboard component mounts (becomes visible)
    const updateDashboardData = () => {
      setTodaysProgress(getTotalWithRunningSession(today));
      setRefreshKey(Date.now());
    };

    // Run immediately when component mounts
    updateDashboardData();

    // Also set up a short interval to ensure data is loaded properly
    const initialLoadTimer = setInterval(updateDashboardData, 500);
    
    // Clear after 2 seconds - by then data should be loaded
    setTimeout(() => {
      clearInterval(initialLoadTimer);
    }, 2000);

    return () => {
      clearInterval(initialLoadTimer);
    };
  }, [getTotalWithRunningSession, today]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey(Date.now());

    toast({
      title: "Data refreshed",
      description: "Your time tracking data has been updated.",
      duration: 3000,
    });

    setTimeout(() => {
      setIsLoading(false);
    }, 700);
  };

  const sessionsByDate = useMemo(() => {
    if (!user || !allSessions) return {};

    return allSessions.reduce((acc: Record<string, any[]>, session) => {
      if (!acc[session.date]) {
        acc[session.date] = [];
      }
      acc[session.date].push(session);
      return acc;
    }, {});
  }, [allSessions, user]);

  const tableData = useMemo(() => {
    if (!user || !allSessions) return [];

    try {
      // Create a properly sorted array of days
      const sortedDays = [...last30Days].sort((a, b) => {
        // Parse the ISO format dates (YYYY-MM-DD) and compare them
        // This ensures proper chronological sorting regardless of month boundaries
        return b.localeCompare(a); // Sort in descending order (newest first)
      });

      return sortedDays
        .map(date => {
          try {
            const formattedDate = formatDateShort(date);
            // Use getTotalWithRunningSession instead of getDailyTotal to include active session
            const totalSeconds = date === today && isRunning 
              ? getTotalWithRunningSession(date)
              : getDailyTotal(date);
            const sessions = allSessions.filter(s => s.date === date);
            
            // Count active session for today
            const sessionCount = date === today && isRunning && currentSession?.date === today
              ? sessions.length + 1  // +1 for the active session
              : sessions.length;

            const taskGroups: Record<string, number> = {};
            sessions.forEach(session => {
              try {
                const taskName = session.taskName || 'Unnamed Task';
                if (!taskGroups[taskName]) {
                  taskGroups[taskName] = 0;
                }
                if (session.duration) {
                  taskGroups[taskName] += session.duration;
                }
              } catch (sessionError) {
                console.error("Error processing session:", sessionError);
              }
            });

            // Include current running session in tasks if it exists
            if (date === today && isRunning && currentSession?.date === today) {
              try {
                const taskName = currentSession.taskName || 'Unnamed Task';
                if (!taskGroups[taskName]) {
                  taskGroups[taskName] = 0;
                }
                
                // Calculate current duration
                const startTime = new Date(currentSession.startTime);
                const now = new Date();
                const currentDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
                
                taskGroups[taskName] += currentDuration;
              } catch (error) {
                console.error("Error calculating current session duration:", error);
              }
            }

            return {
              date,
              formattedDate,
              totalTime: formatDuration(totalSeconds),
              totalSessions: sessionCount,
              isToday: date === today,
              tasks: Object.entries(taskGroups).map(([name, duration]) => ({
                name,
                duration: formatDuration(duration)
              }))
            };
          } catch (rowError) {
            console.error(`Error processing date row: ${date}`, rowError);
            // Return a placeholder row for this date to avoid breaking the table
            return {
              date,
              formattedDate: 'Error',
              totalTime: '0m',
              totalSessions: 0,
              isToday: date === today,
              tasks: []
            };
          }
        });
    } catch (error) {
      console.error("Error generating table data:", error);
      return [];
    }
  }, [allSessions, last30Days, user, getDailyTotal, today, isRunning, currentSession, getTotalWithRunningSession, tableUpdateTrigger]);

  // Force the table to update regularly when there's an active session
  useEffect(() => {
    // Only set up a trigger update if there's an active session
    if (isRunning && currentSession?.date === today) {
      const updateInterval = setInterval(() => {
        setTableUpdateTrigger(Date.now());
      }, 5000); // Update table data every 5 seconds when session is active
      
      return () => clearInterval(updateInterval);
    }
  }, [isRunning, currentSession, today]);

  const formattedCreationDate = useMemo(() => {
    if (!user?.metadata?.creationTime) return 'Unknown';
    
    try {
      // Parse the Firebase timestamp and format it
      const creationDate = new Date(user.metadata.creationTime);
      return creationDate.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting user creation date:', error);
      return 'Unknown';
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div className="flex items-center">
            <Link to="/" className="mr-3">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" className="flex items-center" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" className="flex items-center" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Today's Progress Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Today's Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-blue-600">
                    {formatDuration(todaysProgress)}
                  </div>
                  <p className="text-gray-500">
                    {allSessions.filter(s => s.date === today).length} sessions today
                    {isRunning && currentSession?.date === today && " (1 active)"}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Current Time Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Current Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {currentTime.toLocaleTimeString()}
              </div>
              <p className="text-gray-500">
                {currentTime.toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </CardContent>
          </Card>

          {/* User Info Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">User Info</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="text-xl font-medium truncate">
                    {user?.email || 'Anonymous'}
                  </div>
                  <p className="text-gray-500">
                    Member since {formattedCreationDate}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Time Tracking History Table */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-500" />
              <CardTitle className="text-lg font-medium">Time Tracking History</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Total Time</TableHead>
                    <TableHead>Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array(7).fill(0).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      </TableRow>
                    ))
                  ) : tableData.length > 0 ? (
                    tableData.map((row) => (
                      <TableRow key={row.date}>
                        <TableCell>{row.formattedDate}</TableCell>
                        <TableCell>{row.totalTime}</TableCell>
                        <TableCell>{row.totalSessions}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 text-gray-500">
                        No data available for the last 30 days.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;
