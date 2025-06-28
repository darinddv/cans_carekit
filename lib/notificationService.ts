import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export interface NotificationSchedule {
  id: string;
  title: string;
  body: string;
  trigger: {
    type: 'daily' | 'weekly' | 'interval';
    hour?: number;
    minute?: number;
    weekday?: number;
    seconds?: number;
  };
  data?: Record<string, any>;
}

export class NotificationService {
  // Request notification permissions
  static async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return false;
      }

      if (!Device.isDevice) {
        console.log('Must use physical device for notifications');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }

      console.log('Notification permissions granted');
      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  // Schedule a notification
  static async scheduleNotification(schedule: NotificationSchedule): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        console.log('Notifications not supported on web');
        return null;
      }

      const hasPermissions = await this.requestPermissions();
      if (!hasPermissions) {
        throw new Error('Notification permissions not granted');
      }

      let trigger: any;

      switch (schedule.trigger.type) {
        case 'daily':
          trigger = {
            hour: schedule.trigger.hour || 9,
            minute: schedule.trigger.minute || 0,
            repeats: true,
          };
          break;
        case 'weekly':
          trigger = {
            weekday: schedule.trigger.weekday || 1, // Monday
            hour: schedule.trigger.hour || 9,
            minute: schedule.trigger.minute || 0,
            repeats: true,
          };
          break;
        case 'interval':
          trigger = {
            seconds: schedule.trigger.seconds || 3600, // 1 hour
            repeats: true,
          };
          break;
        default:
          throw new Error('Invalid trigger type');
      }

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.title,
          body: schedule.body,
          data: schedule.data || {},
          sound: 'default',
        },
        trigger,
      });

      console.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Cancel a scheduled notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Notification cancelled:', notificationId);
    } catch (error) {
      console.error('Error cancelling notification:', error);
    }
  }

  // Cancel all scheduled notifications
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All notifications cancelled');
    } catch (error) {
      console.error('Error cancelling all notifications:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Scheduled notifications:', notifications.length);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Schedule daily mood check reminder
  static async scheduleDailyMoodCheck(hour: number = 9, minute: number = 0): Promise<string | null> {
    return this.scheduleNotification({
      id: 'daily-mood-check',
      title: '🌟 Daily Mood Check',
      body: 'How are you feeling today? Take a moment to log your mood.',
      trigger: {
        type: 'daily',
        hour,
        minute,
      },
      data: {
        type: 'mood_check',
        action: 'open_symptoms',
      },
    });
  }

  // Schedule weekly anxiety assessment
  static async scheduleWeeklyAssessment(weekday: number = 1, hour: number = 10): Promise<string | null> {
    return this.scheduleNotification({
      id: 'weekly-assessment',
      title: '📊 Weekly Check-in',
      body: 'Time for your weekly mental health assessment. It only takes 2 minutes.',
      trigger: {
        type: 'weekly',
        weekday,
        hour,
        minute: 0,
      },
      data: {
        type: 'weekly_assessment',
        action: 'open_assessment',
      },
    });
  }

  // Schedule gentle reminder for symptom logging
  static async scheduleSymptomReminder(hours: number = 6): Promise<string | null> {
    return this.scheduleNotification({
      id: 'symptom-reminder',
      title: '💭 Gentle Reminder',
      body: 'Remember to log any symptoms you\'ve experienced today.',
      trigger: {
        type: 'interval',
        seconds: hours * 3600,
      },
      data: {
        type: 'symptom_reminder',
        action: 'open_symptoms',
      },
    });
  }

  // Schedule medication reminder (if applicable)
  static async scheduleMedicationReminder(
    medicationName: string,
    times: Array<{ hour: number; minute: number }>
  ): Promise<string[]> {
    const notificationIds: string[] = [];

    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const id = await this.scheduleNotification({
        id: `medication-${medicationName}-${i}`,
        title: '💊 Medication Reminder',
        body: `Time to take your ${medicationName}`,
        trigger: {
          type: 'daily',
          hour: time.hour,
          minute: time.minute,
        },
        data: {
          type: 'medication',
          medication: medicationName,
          time: `${time.hour}:${time.minute.toString().padStart(2, '0')}`,
        },
      });

      if (id) {
        notificationIds.push(id);
      }
    }

    return notificationIds;
  }

  // Schedule smart notifications based on user patterns
  static async scheduleSmartReminders(userPreferences: {
    enableDailyMoodCheck: boolean;
    enableWeeklyAssessment: boolean;
    enableSymptomReminders: boolean;
    dailyReminderTime: { hour: number; minute: number };
    weeklyReminderDay: number;
    reminderFrequency: number; // hours
  }): Promise<void> {
    try {
      // Cancel existing notifications first
      await this.cancelAllNotifications();

      const scheduledIds: string[] = [];

      if (userPreferences.enableDailyMoodCheck) {
        const id = await this.scheduleDailyMoodCheck(
          userPreferences.dailyReminderTime.hour,
          userPreferences.dailyReminderTime.minute
        );
        if (id) scheduledIds.push(id);
      }

      if (userPreferences.enableWeeklyAssessment) {
        const id = await this.scheduleWeeklyAssessment(
          userPreferences.weeklyReminderDay,
          userPreferences.dailyReminderTime.hour
        );
        if (id) scheduledIds.push(id);
      }

      if (userPreferences.enableSymptomReminders) {
        const id = await this.scheduleSymptomReminder(userPreferences.reminderFrequency);
        if (id) scheduledIds.push(id);
      }

      console.log('Smart reminders scheduled:', scheduledIds.length);
    } catch (error) {
      console.error('Error scheduling smart reminders:', error);
    }
  }

  // Handle notification response (when user taps notification)
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Handle notification received while app is in foreground
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Send immediate local notification (for testing or immediate feedback)
  static async sendImmediateNotification(
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
        },
        trigger: null, // Send immediately
      });

      console.log('Immediate notification sent:', notificationId);
      return notificationId;
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      throw error;
    }
  }

  // Get notification settings/preferences
  static async getNotificationSettings(): Promise<Notifications.NotificationPermissionsStatus> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      console.error('Error getting notification settings:', error);
      throw error;
    }
  }
}

// Default notification schedules for mental health
export const DEFAULT_NOTIFICATION_SCHEDULES = {
  DAILY_MOOD_CHECK: {
    hour: 9,
    minute: 0,
    title: '🌟 Daily Mood Check',
    body: 'How are you feeling today? Take a moment to check in with yourself.',
  },
  EVENING_REFLECTION: {
    hour: 20,
    minute: 0,
    title: '🌙 Evening Reflection',
    body: 'How did your day go? Log any symptoms or thoughts from today.',
  },
  WEEKLY_ASSESSMENT: {
    weekday: 1, // Monday
    hour: 10,
    minute: 0,
    title: '📊 Weekly Check-in',
    body: 'Time for your weekly mental health assessment.',
  },
  GENTLE_REMINDER: {
    hours: 8,
    title: '💭 Gentle Reminder',
    body: 'Remember to take care of your mental health today.',
  },
};