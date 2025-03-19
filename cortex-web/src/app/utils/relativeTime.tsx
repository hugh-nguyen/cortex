/**
 * Converts a timestamp to a human-readable relative time string
 * e.g., "just now", "5 minutes ago", "2 hours ago", "yesterday", "3 days ago"
 * 
 * @param timestamp - The timestamp to convert (ISO string or Date object)
 * @returns A string representing the relative time
 */
export function getRelativeTimeString(timestamp: string | Date): string {
    // Handle both date objects and strings
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    
    // If parsing failed, return the original timestamp
    if (isNaN(date.getTime())) {
      return String(timestamp);
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    // Less than a minute
    if (diffInSeconds < 60) {
      return 'just now';
    }
    
    // Less than an hour
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Less than a week
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      if (days === 1) {
        return 'yesterday';
      }
      return `${days} days ago`;
    }
    
    // Less than a month (approximation)
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    }
    
    // Less than a year
    if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    
    // A year or more
    const years = Math.floor(diffInSeconds / 31536000);
    return `${years} ${years === 1 ? 'year' : 'years'} ago`;
  }
  
  /**
   * Parses different date formats and returns a Date object
   * This is useful for handling inconsistent date formats
   * 
   * @param dateString - The date string to parse
   * @returns A Date object or null if parsing failed
   */
  export function parseDateString(dateString: string): Date | null {
    // First, check if it's already in ISO format
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }
    
    // Check for common formats like "2 days ago"
    const relativeMatch = /(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/i.exec(dateString);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2].toLowerCase();
      
      const now = new Date();
      
      switch (unit) {
        case 'minute':
          now.setMinutes(now.getMinutes() - amount);
          break;
        case 'hour':
          now.setHours(now.getHours() - amount);
          break;
        case 'day':
          now.setDate(now.getDate() - amount);
          break;
        case 'week':
          now.setDate(now.getDate() - (amount * 7));
          break;
        case 'month':
          now.setMonth(now.getMonth() - amount);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - amount);
          break;
      }
      
      return now;
    }
    
    // Return null if we couldn't parse the string
    return null;
  }