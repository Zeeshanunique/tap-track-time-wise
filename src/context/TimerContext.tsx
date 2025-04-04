import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getFirestore, collection, addDoc, updateDoc, doc, getDocs, query, where, setDoc } from "firebase/firestore";
import { firestore } from "@/integrations/firebase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

interface TimerSession {
  id: string;
  userId: string;
  date: string;
  startTime: string;
  endTime: string | null;
  duration: number | null; // in seconds
  taskName?: string;
}

interface TimerContextType {
  isRunning: boolean;
  currentSession: TimerSession | null;
  allSessions: TimerSession[];
  startTimer: (taskName?: string) => Promise<void>;
  stopTimer: () => Promise<void>;
  getDailyTotal: (date: string) => number;
  getTotalWithRunningSession: (date: string) => number;
  syncPendingOperations: () => Promise<void>;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

// Backup to localStorage in case of no internet connection
const LOCAL_STORAGE_KEY = 'tap-track-sessions';
const PENDING_START_KEY = 'pending_session_start';
const PENDING_STOP_KEY = 'pending_session_stop';

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentSession, setCurrentSession] = useState<TimerSession | null>(null);
  const [allSessions, setAllSessions] = useState<TimerSession[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline status detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingOperations();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync any pending operations when the app comes online
  const syncPendingOperations = async () => {
    if (!isOnline || !user) return;

    try {
      // Check for pending session starts
      const pendingStartStr = localStorage.getItem(PENDING_START_KEY);
      if (pendingStartStr) {
        const pendingStart = JSON.parse(pendingStartStr) as TimerSession;
        
        // Ensure this session belongs to the current user
        if (pendingStart.userId === user.uid) {
          await setDoc(doc(firestore, "timer_sessions", pendingStart.id), {
            id: pendingStart.id,
            userId: pendingStart.userId,
            date: pendingStart.date,
            start_time: pendingStart.startTime,
            end_time: null,
            duration: null,
            taskName: pendingStart.taskName || '',
          });

          localStorage.removeItem(PENDING_START_KEY);
          console.log("Successfully synced pending session start");
        }
      }

      // Check for pending session stops
      const pendingStopStr = localStorage.getItem(PENDING_STOP_KEY);
      if (pendingStopStr) {
        const pendingStop = JSON.parse(pendingStopStr) as TimerSession;
        
        // Ensure this session belongs to the current user
        if (pendingStop.userId === user.uid) {
          await updateDoc(doc(firestore, "timer_sessions", pendingStop.id), {
            end_time: pendingStop.endTime,
            duration: pendingStop.duration,
          });

          localStorage.removeItem(PENDING_STOP_KEY);
          console.log("Successfully synced pending session stop");
        }
      }
    } catch (error) {
      console.error("Error syncing pending operations:", error);
    }
  };

  // Check for date change and handle timer transition
  const checkForDateChange = useCallback(() => {
    if (!isRunning || !currentSession) return;
    
    // Get current date in local timezone using the same format used elsewhere
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const localDay = now.getDate().toString().padStart(2, '0');
    const todayString = `${localYear}-${localMonth}-${localDay}`;
    
    const sessionDate = currentSession.date;
    
    // If the current date is different from the session date, we need to end the current session
    // and start a new one to maintain proper daily tracking
    if (todayString !== sessionDate) {
      console.log('Date changed from', sessionDate, 'to', todayString, '- transitioning timer');
      
      // Stop the current session
      stopTimer()
        .then(() => {
          // Start a new session for the new day
          startTimer(currentSession.taskName);
        })
        .catch(error => {
          console.error('Error during date change timer transition:', error);
        });
    }
  }, [isRunning, currentSession]);

  // Check for date changes whenever the app becomes active
  useEffect(() => {
    // Check date on visibility change (when user returns to the tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForDateChange();
      }
    };
    
    // Check date when the browser window regains focus
    const handleFocus = () => {
      checkForDateChange();
    };
    
    // Set up multiple ways to detect date changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    // Set up interval to check for date changes (every minute)
    const dateCheckInterval = setInterval(checkForDateChange, 60000);
    
    // Check immediately when this effect runs
    checkForDateChange();
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      clearInterval(dateCheckInterval);
    };
  }, [checkForDateChange]);

  // Load sessions from localStorage and fetch data when user changes
  useEffect(() => {
    const loadSessionsFromStorage = () => {
      const storedSessions = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (storedSessions) {
        try {
          const parsedSessions = JSON.parse(storedSessions) as TimerSession[];
          // Filter sessions to only include the current user's
          const userSessions = user ? parsedSessions.filter(session => session.userId === user.uid) : [];
          setAllSessions(userSessions);
        } catch (e) {
          console.error('Error parsing sessions from localStorage:', e);
        }
      }
    };

    // Don't do anything while auth is loading
    if (isAuthLoading) {
      return;
    }

    // Load from localStorage first for quick feedback
    loadSessionsFromStorage();

    // Only fetch from Firebase if a user is logged in
    if (user) {
      const fetchSessions = async () => {
        try {
          // Get user's sessions from Firestore
          const q = query(
            collection(firestore, "timer_sessions"),
            where("userId", "==", user.uid)
          );
          
          const querySnapshot = await getDocs(q);
          const sessions: TimerSession[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            sessions.push({
              id: data.id,
              userId: data.userId,
              date: data.date,
              startTime: data.start_time,
              endTime: data.end_time,
              duration: data.duration,
              taskName: data.taskName,
            });
          });
          
          // Get the current date in local timezone format
          const now = new Date();
          const localYear = now.getFullYear();
          const localMonth = (now.getMonth() + 1).toString().padStart(2, '0');
          const localDay = now.getDate().toString().padStart(2, '0');
          const todayString = `${localYear}-${localMonth}-${localDay}`;
          
          // Find any running session
          const runningSession = sessions.find(s => s.endTime === null);
          
          if (runningSession) {
            // Check if the running session is from a previous day and needs to be updated
            if (runningSession.date !== todayString) {
              console.log(`Found running session from ${runningSession.date}, updating to today's date: ${todayString}`);
              
              // End the previous session
              const endTime = new Date().toISOString();
              const startDate = new Date(runningSession.startTime);
              const endDate = new Date();
              const durationSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
              
              // Update the session in Firestore
              await updateDoc(doc(firestore, "timer_sessions", runningSession.id), {
                end_time: endTime,
                duration: durationSeconds,
              });
              
              // Create a new session for today
              const newSessionId = `session_${user.uid}_${Date.now()}`;
              const newSession: TimerSession = {
                id: newSessionId,
                userId: user.uid,
                date: todayString,
                startTime: new Date().toISOString(),
                endTime: null,
                duration: null,
                taskName: runningSession.taskName,
              };
              
              // Save the new session to Firestore
              await setDoc(doc(firestore, "timer_sessions", newSessionId), {
                id: newSessionId,
                userId: user.uid,
                date: todayString,
                start_time: newSession.startTime,
                end_time: null,
                duration: null,
                taskName: newSession.taskName || '',
              });
              
              // Update the local running session
              sessions.push(newSession);
              sessions.forEach(session => {
                if (session.id === runningSession.id) {
                  session.endTime = endTime;
                  session.duration = durationSeconds;
                }
              });
              
              setIsRunning(true);
              setCurrentSession(newSession);
              
              toast({
                title: "Session Updated",
                description: `Your active session has been moved to today's date`,
              });
            } else {
              // Session is already for today, just set it as active
              setIsRunning(true);
              setCurrentSession(runningSession);
            }
          }
          
          // Save all sessions to state and localStorage
          setAllSessions(sessions);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessions));
          
          console.log(`Loaded ${sessions.length} sessions for user ${user.uid}`);
          setInitialized(true);
        } catch (error) {
          console.error("Error fetching sessions:", error);
          // If there's an error, fall back to localStorage
          loadSessionsFromStorage();
        }
      };
      
      fetchSessions();
      syncPendingOperations(); // Try to sync any pending operations
    } else {
      // If no user is logged in, clear any existing sessions
      setAllSessions([]);
      setCurrentSession(null);
      setIsRunning(false);
      setInitialized(true);
    }
  }, [user, isAuthLoading]);

  // Reset the timer to the current day
  const resetSessionToToday = async () => {
    if (!currentSession || !isRunning || !user) return;
    
    // Get the current date in the user's local timezone
    const now = new Date();
    
    // Format as YYYY-MM-DD in local timezone
    const localYear = now.getFullYear();
    const localMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const localDay = now.getDate().toString().padStart(2, '0');
    const todayString = `${localYear}-${localMonth}-${localDay}`;
    
    try {
      // First stop the current session
      await stopTimer();
      
      // Then start a new one
      await startTimer(currentSession.taskName);
      
      toast({
        title: "Session Reset",
        description: `Timer reset to today's date (${todayString})`,
      });
    } catch (error) {
      console.error("Error resetting session:", error);
      toast({
        title: "Reset Failed",
        description: "Could not reset the timer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Start a new timer session
  const startTimer = async (taskName?: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to track your time",
        variant: "destructive",
      });
      return;
    }
    
    // Don't start a new session if one is already running
    if (isRunning) return;
    
    // Get the current date and time in the user's local timezone
    const now = new Date();
    
    // Format as YYYY-MM-DD in local timezone to ensure IST compatibility
    const localYear = now.getFullYear();
    const localMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const localDay = now.getDate().toString().padStart(2, '0');
    const todayString = `${localYear}-${localMonth}-${localDay}`;
    
    console.log(`Starting new session with date: ${todayString}`);
    
    const sessionId = `session_${user.uid}_${now.getTime()}`;
    const startTime = now.toISOString();
    
    // Create the session object with today's date
    const session: TimerSession = {
      id: sessionId,
      userId: user.uid,
      date: todayString, // Using local date string format
      startTime,
      endTime: null,
      duration: null,
      taskName: taskName || '',
    };
    
    try {
      if (isOnline) {
        // Save to Firestore if online with explicit date field
        await setDoc(doc(firestore, "timer_sessions", sessionId), {
          id: sessionId,
          userId: user.uid,
          date: todayString, // Using local date format for Firebase
          start_time: startTime,
          end_time: null,
          duration: null,
          taskName: taskName || '',
        });
      } else {
        // Store the operation to be synced later
        localStorage.setItem(PENDING_START_KEY, JSON.stringify(session));
      }
      
      // Update state
      setIsRunning(true);
      setCurrentSession(session);
      
      // Add to local sessions
      const updatedSessions = [...allSessions, session];
      setAllSessions(updatedSessions);
      
      // Update localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
      
      toast({
        title: taskName ? `Started: ${taskName}` : "Timer Started",
        description: `Tracking time from ${now.toLocaleTimeString()}`,
      });
    } catch (error) {
      console.error("Error starting timer:", error);
      toast({
        title: "Start Failed",
        description: "Failed to start the timer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Stop the current timer session
  const stopTimer = async () => {
    if (!isRunning || !currentSession || !user) return;
    
    const now = new Date();
    const endTime = now.toISOString();
    
    // Calculate duration in seconds
    const startDate = new Date(currentSession.startTime);
    const endDate = now;
    const durationSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
    
    // Update the session with end time and duration
    const updatedSession: TimerSession = {
      ...currentSession,
      endTime,
      duration: durationSeconds,
    };
    
    try {
      if (isOnline) {
        // Update in Firestore if online
        await updateDoc(doc(firestore, "timer_sessions", currentSession.id), {
          end_time: endTime,
          duration: durationSeconds,
        });
      } else {
        // Store the operation to be synced later
        localStorage.setItem(PENDING_STOP_KEY, JSON.stringify(updatedSession));
      }
      
      // Update state
      setIsRunning(false);
      setCurrentSession(null);
      
      // Update the session in allSessions
      const updatedSessions = allSessions.map(session => 
        session.id === updatedSession.id ? updatedSession : session
      );
      setAllSessions(updatedSessions);
      
      // Update localStorage
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSessions));
      
      const formattedDuration = formatDuration(durationSeconds);
      toast({
        title: updatedSession.taskName 
          ? `Completed: ${updatedSession.taskName}` 
          : "Timer Stopped",
        description: `Time tracked: ${formattedDuration}`,
      });
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast({
        title: "Stop Failed",
        description: "Failed to stop the timer. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Format duration helper function
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    const parts = [];
    
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    
    parts.push(`${remainingSeconds}s`);
    
    return parts.join(' ');
  };

  // Get total tracked time for a specific date
  const getDailyTotal = (date: string) => {
    try {
      // Only include sessions with valid durations and matching date
      const validSessions = allSessions.filter(session => 
        session.date === date && 
        session.duration !== null && 
        typeof session.duration === 'number'
      );
      
      // Calculate total duration
      return validSessions.reduce((total, session) => total + (session.duration || 0), 0);
    } catch (error) {
      console.error(`Error calculating daily total for ${date}:`, error);
      return 0;
    }
  };

  // Get total tracked time including any currently running session
  const getTotalWithRunningSession = (date: string) => {
    try {
      // First get the base total of completed sessions
      let total = getDailyTotal(date);
      
      // If there's a running session for today, add its current duration
      if (isRunning && currentSession && currentSession.date === date) {
        const startTime = new Date(currentSession.startTime);
        const now = new Date();
        // Ensure we don't get negative values due to timezone issues
        if (now >= startTime) {
          const currentDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          total += currentDuration;
        }
      }
      
      return total;
    } catch (error) {
      console.error(`Error calculating total with running session for ${date}:`, error);
      // Fall back to just the daily total of completed sessions
      return getDailyTotal(date);
    }
  };

  const contextValue: TimerContextType = {
    isRunning,
    currentSession,
    allSessions,
    startTimer,
    stopTimer,
    getDailyTotal,
    getTotalWithRunningSession,
    syncPendingOperations,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};
