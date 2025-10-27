import { TagDataManager } from '../services/TagDataManager.js';

export class SchedulerService {
  private intervals: NodeJS.Timeout[] = [];
  private tagDataManager: TagDataManager;

  constructor() {
    this.tagDataManager = new TagDataManager();
  }

  /**
   * Start the scheduler with daily tag refresh
   */
  start(): void {
    // Check if scheduler is enabled
    const schedulerEnabled = process.env.SCHEDULER_ENABLED !== 'false';
    if (!schedulerEnabled) {
      console.log('� Scheduler disabled via SCHEDULER_ENABLED environment variable');
      return;
    }
    
    console.log('�🕐 Starting scheduler service...');

    // Get schedule from environment variables or use defaults
    const refreshHour = parseInt(process.env.TAG_REFRESH_HOUR || '6');
    const refreshMinute = parseInt(process.env.TAG_REFRESH_MINUTE || '21');
    const refreshInterval = process.env.TAG_REFRESH_INTERVAL || 'daily'; // 'daily' or 'weekly'
    const refreshDayOfWeek = parseInt(process.env.TAG_REFRESH_DAY || '0'); // 0 = Sunday, 1 = Monday, etc.

    // Schedule tag refresh based on interval
    if (refreshInterval === 'weekly') {
      this.scheduleWeeklyTask(() => {
        this.refreshTagData();
      }, { hour: refreshHour, minute: refreshMinute, dayOfWeek: refreshDayOfWeek });
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      console.log(`✅ Scheduler service started - weekly tag refresh scheduled for ${dayNames[refreshDayOfWeek]} at ${refreshHour}:${refreshMinute.toString().padStart(2, '0')} CST`);
    } else {
      this.scheduleDailyTask(() => {
        this.refreshTagData();
      }, { hour: refreshHour, minute: refreshMinute });
      
      console.log(`✅ Scheduler service started - daily tag refresh scheduled for ${refreshHour}:${refreshMinute.toString().padStart(2, '0')} CST`);
    }
  }

  /**
   * Stop all scheduled tasks
   */
  stop(): void {
    console.log('🛑 Stopping scheduler service...');
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }

  /**
   * Schedule a task to run daily at a specific time
   */
  private scheduleDailyTask(task: () => void, time: { hour: number; minute: number }): void {
    const { hour, minute } = time;
    
    const executeTask = () => {
      const now = new Date();
      // Convert to CST (UTC-6)
      const cstTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
      
      if (cstTime.getHours() === hour && cstTime.getMinutes() === minute) {
        console.log(`🔄 Executing scheduled task at ${hour}:${minute.toString().padStart(2, '0')} CST`);
        task();
      }
    };

    // Check every minute
    const interval = setInterval(executeTask, 60 * 1000);
    this.intervals.push(interval);

    // Also check immediately if we're at the right time
    executeTask();
  }

  /**
   * Schedule a task to run weekly at a specific time on a specific day
   */
  private scheduleWeeklyTask(task: () => void, time: { hour: number; minute: number; dayOfWeek: number }): void {
    const { hour, minute, dayOfWeek } = time;
    
    const executeTask = () => {
      const now = new Date();
      // Convert to CST (UTC-6)
      const cstTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
      
      // Check if it's the right day, hour, and minute
      if (cstTime.getDay() === dayOfWeek && 
          cstTime.getHours() === hour && 
          cstTime.getMinutes() === minute) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        console.log(`🔄 Executing scheduled weekly task on ${dayNames[dayOfWeek]} at ${hour}:${minute.toString().padStart(2, '0')} CST`);
        task();
      }
    };

    // Check every minute
    const interval = setInterval(executeTask, 60 * 1000);
    this.intervals.push(interval);

    // Also check immediately if we're at the right time
    executeTask();
  }

  /**
   * Refresh tag data with error handling and logging
   */
  private async refreshTagData(): Promise<void> {
    try {
      console.log('🔄 Starting scheduled tag data refresh...');
      await this.tagDataManager.refreshTagData();
      console.log('✅ Scheduled tag data refresh completed successfully');
    } catch (error) {
      console.error('❌ Scheduled tag data refresh failed:', error);
      
      // Could add notification/alerting here for production
      // For now, just log the error and continue
    }
  }

  /**
   * Get next scheduled refresh time for monitoring
   */
  getNextRefreshTime(): Date {
    const refreshHour = parseInt(process.env.TAG_REFRESH_HOUR || '6');
    const refreshMinute = parseInt(process.env.TAG_REFRESH_MINUTE || '21');
    const refreshInterval = process.env.TAG_REFRESH_INTERVAL || 'daily';
    const refreshDayOfWeek = parseInt(process.env.TAG_REFRESH_DAY || '0');
    
    const now = new Date();
    const cstTime = new Date(now.getTime() - (6 * 60 * 60 * 1000));
    
    // Next scheduled refresh time in CST
    const nextRefresh = new Date(cstTime);
    nextRefresh.setHours(refreshHour, refreshMinute, 0, 0);
    
    if (refreshInterval === 'weekly') {
      // Calculate next occurrence of the target day of week
      const currentDay = cstTime.getDay();
      let daysUntilNext = refreshDayOfWeek - currentDay;
      
      // If the target day is today but the time has passed, or target day is before today
      if (daysUntilNext < 0 || 
          (daysUntilNext === 0 && 
           (cstTime.getHours() > refreshHour || 
            (cstTime.getHours() === refreshHour && cstTime.getMinutes() >= refreshMinute)))) {
        daysUntilNext += 7;
      }
      
      nextRefresh.setDate(nextRefresh.getDate() + daysUntilNext);
    } else {
      // Daily schedule - if it's already past the scheduled time today, schedule for tomorrow
      if (cstTime.getHours() > refreshHour || 
          (cstTime.getHours() === refreshHour && cstTime.getMinutes() >= refreshMinute)) {
        nextRefresh.setDate(nextRefresh.getDate() + 1);
      }
    }
    
    // Convert back to local time
    return new Date(nextRefresh.getTime() + (6 * 60 * 60 * 1000));
  }

  /**
   * Manual trigger for tag refresh (for admin use)
   */
  async triggerTagRefresh(): Promise<void> {
    console.log('🔄 Manual tag refresh triggered...');
    await this.refreshTagData();
  }
}

// Export singleton instance
export const schedulerService = new SchedulerService();