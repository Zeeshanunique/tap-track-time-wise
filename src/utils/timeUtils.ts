/**
 * Formats seconds into a human-readable time string (HH:MM:SS)
 */
export function formatTime(seconds: number): string {
  if (!seconds && seconds !== 0) return '00:00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  
  return [
    hours.toString().padStart(2, '0'),
    minutes.toString().padStart(2, '0'),
    remainingSeconds.toString().padStart(2, '0')
  ].join(':');
}

/**
 * Formats seconds into hours and minutes (Xh Ym)
 */
export function formatDuration(seconds: number): string {
  if (!seconds && seconds !== 0) return '0m';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Returns the last n days as date strings (YYYY-MM-DD) in local time
 * Ensures proper handling of IST timezone
 */
export function getLastNDays(n: number): string[] {
  const result = [];
  // Use the current date in the user's local timezone (e.g., IST)
  const now = new Date();
  
  // Get just the date part in local timezone
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (let i = 0; i < n; i++) {
    const date = new Date(todayDate);
    date.setDate(date.getDate() - i);
    
    // Format as YYYY-MM-DD in local timezone (preserves IST date)
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const formattedDate = `${year}-${month}-${day}`;
    result.push(formattedDate);
  }
  return result;
}

/**
 * Formats a date string (YYYY-MM-DD) to a more readable format (e.g., "Mon, Apr 5")
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
  const date = new Date(year, month - 1, day);
  
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
}

/**
 * Get today's date string in YYYY-MM-DD format, ensuring local timezone
 * Always returns the current date at the time of calling
 */
export function getTodayDateString(): string {
  // Create a fresh Date object each time to ensure we always get the current date
  const now = new Date();
  
  // Extract date components using local timezone
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  // Format as YYYY-MM-DD
  return `${year}-${month}-${day}`;
}

/**
 * Format a date in the "Sat, Apr 5" format - correctly handling local timezone
 */
export function formatDateShort(dateString: string): string {
  try {
    // Parse the date string to ensure correct handling of local time
    const [year, month, day] = dateString.split('-').map(num => parseInt(num, 10));
    
    // Validate the date parts to ensure they're valid numbers
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error(`Invalid date string: ${dateString}`);
      return 'Invalid date';
    }
    
    const date = new Date(year, month - 1, day);
    
    // Validate that the date is valid
    if (isNaN(date.getTime())) {
      console.error(`Invalid date created from: ${dateString}`);
      return 'Invalid date';
    }
    
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  } catch (error) {
    console.error(`Error formatting date: ${dateString}`, error);
    return 'Invalid date';
  }
}
