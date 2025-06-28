# Push Notifications Development Plan

This document provides a comprehensive guide for implementing intelligent push notifications in the Care Card application, with special focus on linking notifications to assessments and other app features.

## Overview

The push notification system is designed to provide timely, contextual reminders and prompts that enhance user engagement with their mental health journey. The system includes smart scheduling, deep linking to specific app sections, and personalized notification content based on user behavior patterns.

## Current Implementation Status

### ✅ Completed Components

1. **NotificationService**: Core service for scheduling and managing notifications
2. **Permission Handling**: Robust permission request flow for iOS and Android
3. **Smart Scheduling**: Multiple notification types with intelligent timing
4. **Deep Linking Foundation**: Data payload system for navigation routing

### 🚧 In Development

1. **Assessment Integration**: Direct links from notifications to specific assessments
2. **User Preferences**: Customizable notification settings and timing
3. **Analytics Tracking**: Notification engagement and effectiveness metrics

### 📋 Planned Features

1. **Adaptive Scheduling**: ML-based optimal timing based on user patterns
2. **Contextual Content**: Dynamic notification content based on recent activity
3. **Progressive Engagement**: Escalating reminder system for missed check-ins

## Architecture Overview

### File Structure

```
lib/
├── notificationService.ts     # Core notification management
├── symptomService.ts         # Symptom tracking integration
├── supabaseService.ts        # Database operations
app/
├── _layout.tsx              # Deep link handling setup
├── (tabs)/
│   ├── symptoms.tsx         # Symptom logging destination
│   └── insights.tsx         # Assessment destination
docs/
├── push_notifications.md   # This documentation
└── health_metrics.md       # Related health features
```

### Core Components

#### 1. NotificationService Class

**Location**: `lib/notificationService.ts`

**Key Methods**:
- `requestPermissions()`: Handle platform-specific permission requests
- `scheduleNotification()`: Schedule single notifications with custom triggers
- `scheduleSmartReminders()`: Batch schedule based on user preferences
- `addNotificationResponseListener()`: Handle notification taps and routing

**Supported Notification Types**:
- Daily mood check reminders
- Weekly assessment prompts
- Symptom logging reminders
- Medication reminders (future)
- Custom therapeutic interventions

#### 2. Deep Linking System

**Implementation**: Uses Expo Notifications data payload system

**Navigation Flow**:
```
Notification Tap → Response Listener → Route Parser → Screen Navigation
```

**Supported Routes**:
- `open_symptoms`: Navigate to symptom logging
- `open_assessment`: Navigate to specific assessment
- `open_insights`: Navigate to trends and analytics
- `open_care_card`: Navigate to daily tasks

## Notification Types and Deep Linking

### 1. Daily Mood Check Notifications

**Purpose**: Encourage daily mental health check-ins

**Schedule**: Daily at user-preferred time (default: 9:00 AM)

**Implementation**:
```typescript
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
      category: 'mood', // Pre-select mood category
      quick_log: true,  // Enable quick logging mode
    },
  });
}
```

**Deep Link Behavior**:
- Opens symptoms screen
- Pre-selects "Mood" category
- Enables quick logging interface
- Tracks engagement metrics

### 2. Weekly Assessment Notifications

**Purpose**: Prompt comprehensive weekly mental health assessments

**Schedule**: Weekly on user-preferred day (default: Monday, 10:00 AM)

**Implementation**:
```typescript
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
      template_id: 'weekly-anxiety-assessment', // Specific assessment
      auto_start: true, // Automatically start assessment
      reminder_context: 'weekly_scheduled',
    },
  });
}
```

**Deep Link Behavior**:
- Opens symptoms screen
- Automatically displays assessment modal
- Loads specific assessment template
- Pre-fills context information
- Tracks completion rates

### 3. Gentle Symptom Reminders

**Purpose**: Non-intrusive reminders to log symptoms throughout the day

**Schedule**: Interval-based (default: every 6 hours)

**Implementation**:
```typescript
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
      reminder_type: 'gentle',
      show_recent_categories: true, // Show recently used categories
    },
  });
}
```

**Deep Link Behavior**:
- Opens symptoms screen
- Displays recently used categories
- Shows gentle encouragement message
- Provides option to skip if not applicable

### 4. Assessment-Specific Notifications

**Purpose**: Direct users to specific assessments based on their care plan

**Dynamic Scheduling**: Based on assessment frequency and user progress

**Implementation**:
```typescript
static async scheduleAssessmentNotification(
  assessmentId: string,
  assessmentName: string,
  scheduledTime: Date
): Promise<string | null> {
  return this.scheduleNotification({
    id: `assessment-${assessmentId}`,
    title: `📋 ${assessmentName}`,
    body: `Your ${assessmentName.toLowerCase()} is ready. Tap to begin.`,
    trigger: {
      type: 'daily', // Or specific date/time
      hour: scheduledTime.getHours(),
      minute: scheduledTime.getMinutes(),
    },
    data: {
      type: 'specific_assessment',
      action: 'open_assessment',
      assessment_id: assessmentId,
      assessment_name: assessmentName,
      auto_start: true,
      source: 'scheduled_notification',
      priority: 'high',
    },
  });
}
```

**Deep Link Behavior**:
- Opens symptoms screen
- Immediately displays specific assessment
- Auto-starts assessment flow
- Tracks assessment source and completion
- Provides context about why assessment was scheduled

## Deep Link Implementation Details

### 1. Notification Response Handling

**Setup in App Layout** (`app/_layout.tsx`):

```typescript
import { NotificationService } from '@/lib/notificationService';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    // Handle notification taps
    const subscription = NotificationService.addNotificationResponseListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    return () => subscription.remove();
  }, []);

  const handleNotificationResponse = (response: any) => {
    const { data } = response.notification.request.content;
    
    switch (data.action) {
      case 'open_symptoms':
        handleSymptomsNavigation(data);
        break;
      case 'open_assessment':
        handleAssessmentNavigation(data);
        break;
      case 'open_insights':
        router.push('/(tabs)/insights');
        break;
      case 'open_care_card':
        router.push('/(tabs)/care-card');
        break;
      default:
        router.push('/(tabs)');
    }
  };

  const handleSymptomsNavigation = (data: any) => {
    // Navigate to symptoms screen
    router.push('/(tabs)/symptoms');
    
    // Set up screen state based on notification data
    if (data.category) {
      // Pre-select category
      // This would be handled by the symptoms screen
    }
    
    if (data.quick_log) {
      // Enable quick logging mode
    }
  };

  const handleAssessmentNavigation = (data: any) => {
    // Navigate to symptoms screen (where assessments are handled)
    router.push('/(tabs)/symptoms');
    
    // Trigger assessment modal
    // This would be handled by passing navigation params or using a global state
    if (data.assessment_id || data.template_id) {
      // Open specific assessment
    }
  };
}
```

### 2. Screen-Level Deep Link Handling

**Symptoms Screen Enhancement** (`app/(tabs)/symptoms.tsx`):

```typescript
import { useEffect } from 'react';
import { useLocalSearchParams } from 'expo-router';

export default function SymptomsScreen() {
  const params = useLocalSearchParams();
  
  useEffect(() => {
    // Handle deep link parameters
    if (params.openAssessment) {
      setShowAssessmentModal(true);
      if (params.assessmentId) {
        // Load specific assessment
        loadSpecificAssessment(params.assessmentId as string);
      }
    }
    
    if (params.category) {
      // Pre-select category for quick logging
      const category = categories.find(c => c.name.toLowerCase() === params.category);
      if (category) {
        openLogModal(category);
      }
    }
  }, [params]);

  const loadSpecificAssessment = async (assessmentId: string) => {
    try {
      const template = await SymptomService.getAssessmentTemplate(assessmentId);
      setSelectedAssessment(template);
      setShowAssessmentModal(true);
    } catch (error) {
      console.error('Error loading assessment:', error);
    }
  };
}
```

### 3. Global State Management for Deep Links

**Using React Context for Notification State**:

```typescript
// contexts/NotificationContext.tsx
interface NotificationContextType {
  pendingNotificationAction: any;
  setPendingNotificationAction: (action: any) => void;
  clearPendingAction: () => void;
}

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [pendingNotificationAction, setPendingNotificationAction] = useState(null);

  const clearPendingAction = () => setPendingNotificationAction(null);

  return (
    <NotificationContext.Provider value={{
      pendingNotificationAction,
      setPendingNotificationAction,
      clearPendingAction,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};
```

## Smart Notification Scheduling

### 1. User Preference-Based Scheduling

**Preference Collection**:
```typescript
interface NotificationPreferences {
  enableDailyMoodCheck: boolean;
  enableWeeklyAssessment: boolean;
  enableSymptomReminders: boolean;
  dailyReminderTime: { hour: number; minute: number };
  weeklyReminderDay: number; // 1-7 (Monday-Sunday)
  reminderFrequency: number; // hours between reminders
  quietHours: {
    start: { hour: number; minute: number };
    end: { hour: number; minute: number };
  };
  assessmentReminders: {
    [assessmentId: string]: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      preferredTime: { hour: number; minute: number };
    };
  };
}
```

**Smart Scheduling Implementation**:
```typescript
static async scheduleSmartReminders(preferences: NotificationPreferences): Promise<void> {
  try {
    // Cancel existing notifications
    await this.cancelAllNotifications();

    const scheduledIds: string[] = [];

    // Schedule daily mood check
    if (preferences.enableDailyMoodCheck) {
      const id = await this.scheduleDailyMoodCheck(
        preferences.dailyReminderTime.hour,
        preferences.dailyReminderTime.minute
      );
      if (id) scheduledIds.push(id);
    }

    // Schedule weekly assessment
    if (preferences.enableWeeklyAssessment) {
      const id = await this.scheduleWeeklyAssessment(
        preferences.weeklyReminderDay,
        preferences.dailyReminderTime.hour
      );
      if (id) scheduledIds.push(id);
    }

    // Schedule symptom reminders (respecting quiet hours)
    if (preferences.enableSymptomReminders) {
      const id = await this.scheduleSymptomReminder(preferences.reminderFrequency);
      if (id) scheduledIds.push(id);
    }

    // Schedule assessment-specific reminders
    for (const [assessmentId, config] of Object.entries(preferences.assessmentReminders)) {
      if (config.enabled) {
        const id = await this.scheduleAssessmentReminder(
          assessmentId,
          config.frequency,
          config.preferredTime
        );
        if (id) scheduledIds.push(id);
      }
    }

    console.log('Smart reminders scheduled:', scheduledIds.length);
  } catch (error) {
    console.error('Error scheduling smart reminders:', error);
  }
}
```

### 2. Adaptive Timing Based on User Behavior

**Engagement Tracking**:
```typescript
interface NotificationEngagement {
  notificationId: string;
  type: string;
  sentAt: Date;
  openedAt?: Date;
  actionTaken?: string;
  completedTask?: boolean;
  dismissedAt?: Date;
}

class NotificationAnalytics {
  static async trackNotificationEngagement(engagement: NotificationEngagement): Promise<void> {
    // Store engagement data for analysis
    await supabase
      .from('notification_engagement')
      .insert(engagement);
  }

  static async getOptimalNotificationTime(userId: string, notificationType: string): Promise<{ hour: number; minute: number }> {
    // Analyze user's historical engagement to find optimal timing
    const { data } = await supabase
      .from('notification_engagement')
      .select('*')
      .eq('user_id', userId)
      .eq('type', notificationType)
      .not('opened_at', 'is', null);

    if (!data || data.length === 0) {
      // Return default times if no data
      return { hour: 9, minute: 0 };
    }

    // Calculate optimal time based on highest engagement rates
    const hourEngagement: Record<number, number> = {};
    
    data.forEach(engagement => {
      const hour = new Date(engagement.opened_at).getHours();
      hourEngagement[hour] = (hourEngagement[hour] || 0) + 1;
    });

    const optimalHour = Object.entries(hourEngagement)
      .sort(([, a], [, b]) => b - a)[0][0];

    return { hour: parseInt(optimalHour), minute: 0 };
  }
}
```

### 3. Contextual Notification Content

**Dynamic Content Generation**:
```typescript
class ContextualNotifications {
  static async generateMoodCheckNotification(userId: string): Promise<{ title: string; body: string }> {
    // Get recent mood trends
    const recentLogs = await SymptomService.getSymptomLogs(7);
    const moodLogs = recentLogs.filter(log => log.category.name === 'Mood');

    if (moodLogs.length === 0) {
      return {
        title: '🌟 Daily Mood Check',
        body: 'How are you feeling today? Start tracking your mood journey.',
      };
    }

    const averageMood = moodLogs.reduce((sum, log) => sum + log.severity, 0) / moodLogs.length;

    if (averageMood >= 7) {
      return {
        title: '🌟 Daily Mood Check',
        body: 'You\'ve been feeling great lately! How are you today?',
      };
    } else if (averageMood <= 4) {
      return {
        title: '💙 Daily Check-in',
        body: 'Taking care of your mental health is important. How are you feeling?',
      };
    } else {
      return {
        title: '🌟 Daily Mood Check',
        body: 'How are you feeling today? Your wellbeing matters.',
      };
    }
  }

  static async generateAssessmentNotification(
    assessmentId: string,
    userId: string
  ): Promise<{ title: string; body: string }> {
    const template = await SymptomService.getAssessmentTemplate(assessmentId);
    const recentResponses = await SymptomService.getAssessmentResponses(30);
    
    const hasRecentResponse = recentResponses.some(
      response => response.template_id === assessmentId &&
      new Date(response.completed_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000)
    );

    if (hasRecentResponse) {
      return {
        title: `📊 ${template.name} Follow-up`,
        body: 'Time for your follow-up assessment. Track your progress over time.',
      };
    } else {
      return {
        title: `📋 ${template.name}`,
        body: `Your ${template.name.toLowerCase()} is ready. It takes just 2 minutes.`,
      };
    }
  }
}
```

## Testing Strategy

### 1. Development Testing

**Local Testing Setup**:
```typescript
// Test notification scheduling
const testNotifications = async () => {
  // Test immediate notification
  await NotificationService.sendImmediateNotification(
    'Test Notification',
    'This is a test notification with deep link',
    {
      action: 'open_assessment',
      assessment_id: 'test-assessment',
      auto_start: true,
    }
  );

  // Test scheduled notification (5 seconds from now)
  await NotificationService.scheduleNotification({
    id: 'test-scheduled',
    title: 'Scheduled Test',
    body: 'This notification was scheduled for testing',
    trigger: {
      type: 'interval',
      seconds: 5,
    },
    data: {
      action: 'open_symptoms',
      category: 'mood',
    },
  });
};
```

**Deep Link Testing**:
```typescript
// Test deep link handling
const testDeepLinks = () => {
  const testCases = [
    {
      action: 'open_symptoms',
      category: 'mood',
      quick_log: true,
    },
    {
      action: 'open_assessment',
      assessment_id: 'weekly-anxiety-assessment',
      auto_start: true,
    },
    {
      action: 'open_insights',
    },
  ];

  testCases.forEach((testData, index) => {
    setTimeout(() => {
      // Simulate notification response
      handleNotificationResponse({
        notification: {
          request: {
            content: {
              data: testData,
            },
          },
        },
      });
    }, index * 2000);
  });
};
```

### 2. User Acceptance Testing

**Testing Scenarios**:

1. **Permission Flow Testing**:
   - First-time app launch
   - Permission denial and re-request
   - Settings page permission management

2. **Notification Delivery Testing**:
   - App in foreground
   - App in background
   - App completely closed
   - Device in Do Not Disturb mode

3. **Deep Link Navigation Testing**:
   - Tap notification → correct screen opens
   - Pre-selected categories work correctly
   - Assessment auto-start functions properly
   - Navigation state is preserved

4. **Timing and Frequency Testing**:
   - Daily notifications arrive at correct time
   - Weekly notifications respect day preference
   - Interval notifications don't spam users
   - Quiet hours are respected

### 3. Analytics and Monitoring

**Key Metrics to Track**:

```typescript
interface NotificationMetrics {
  // Delivery metrics
  notificationsSent: number;
  notificationsDelivered: number;
  deliveryRate: number;

  // Engagement metrics
  notificationsOpened: number;
  openRate: number;
  averageTimeToOpen: number;

  // Action metrics
  actionsCompleted: number;
  completionRate: number;
  assessmentsStarted: number;
  assessmentsCompleted: number;

  // User behavior
  optimalNotificationTimes: Record<string, { hour: number; minute: number }>;
  userPreferences: NotificationPreferences;
  engagementTrends: Array<{
    date: string;
    openRate: number;
    completionRate: number;
  }>;
}
```

**Analytics Implementation**:
```typescript
class NotificationAnalytics {
  static async trackNotificationSent(notificationId: string, type: string): Promise<void> {
    await supabase.from('notification_analytics').insert({
      notification_id: notificationId,
      type,
      event: 'sent',
      timestamp: new Date().toISOString(),
    });
  }

  static async trackNotificationOpened(notificationId: string, responseTime: number): Promise<void> {
    await supabase.from('notification_analytics').insert({
      notification_id: notificationId,
      event: 'opened',
      response_time: responseTime,
      timestamp: new Date().toISOString(),
    });
  }

  static async trackActionCompleted(notificationId: string, action: string): Promise<void> {
    await supabase.from('notification_analytics').insert({
      notification_id: notificationId,
      event: 'action_completed',
      action,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Platform-Specific Considerations

### iOS Implementation

**Required Permissions** (`app.json`):
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#007AFF",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

**iOS-Specific Features**:
- Rich notifications with images
- Notification categories and actions
- Critical alerts (requires special entitlement)
- Notification grouping

### Android Implementation

**Required Permissions** (`app.json`):
```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ]
    }
  }
}
```

**Android-Specific Features**:
- Notification channels
- Custom notification layouts
- Notification badges
- Adaptive icons

## Security and Privacy

### 1. Data Protection

**Sensitive Data Handling**:
- Never include personal health information in notification content
- Use generic, encouraging language
- Store detailed data only locally or in encrypted database

**Example - Secure vs Insecure**:
```typescript
// ❌ Insecure - exposes sensitive information
const badNotification = {
  title: 'Anxiety Level 8/10',
  body: 'Your anxiety was severe yesterday. Log today\'s panic attacks.',
};

// ✅ Secure - generic, supportive language
const goodNotification = {
  title: '💙 Daily Check-in',
  body: 'How are you feeling today? Your wellbeing matters.',
};
```

### 2. User Consent and Control

**Granular Permission Management**:
```typescript
interface NotificationConsent {
  generalReminders: boolean;
  moodCheckReminders: boolean;
  assessmentReminders: boolean;
  medicationReminders: boolean;
  emergencyAlerts: boolean;
  researchParticipation: boolean;
}
```

**Opt-out Mechanisms**:
- Easy notification disable in app settings
- Unsubscribe links in notification content
- Automatic opt-out after extended non-engagement

## Future Enhancements

### 1. Machine Learning Integration

**Predictive Notifications**:
- Predict optimal notification timing based on user behavior
- Identify patterns that indicate need for intervention
- Personalize notification content based on user preferences

**Implementation Concept**:
```typescript
class MLNotificationService {
  static async predictOptimalTime(userId: string, notificationType: string): Promise<Date> {
    // Use ML model to predict best notification time
    const userPattern = await this.getUserEngagementPattern(userId);
    const contextualFactors = await this.getContextualFactors(userId);
    
    return this.mlModel.predict(userPattern, contextualFactors, notificationType);
  }

  static async generatePersonalizedContent(userId: string, notificationType: string): Promise<string> {
    // Generate personalized notification content
    const userPreferences = await this.getUserContentPreferences(userId);
    const recentActivity = await this.getRecentUserActivity(userId);
    
    return this.contentGenerator.generate(userPreferences, recentActivity, notificationType);
  }
}
```

### 2. Integration with Wearables

**Apple Watch / WearOS Support**:
- Gentle haptic reminders
- Quick response options
- Biometric-triggered notifications

### 3. Advanced Assessment Integration

**Dynamic Assessment Routing**:
- Route to different assessments based on recent symptoms
- Adaptive assessment length based on user engagement
- Progressive assessment difficulty

**Implementation Concept**:
```typescript
class AdaptiveAssessmentNotifications {
  static async scheduleAdaptiveAssessment(userId: string): Promise<void> {
    const recentSymptoms = await SymptomService.getSymptomLogs(7);
    const userEngagement = await this.getUserEngagementLevel(userId);
    
    let assessmentType: string;
    let assessmentLength: 'short' | 'medium' | 'long';
    
    // Determine assessment type based on symptoms
    if (recentSymptoms.some(s => s.category.name === 'Anxiety' && s.severity > 7)) {
      assessmentType = 'anxiety-focused';
    } else if (recentSymptoms.some(s => s.category.name === 'Mood' && s.severity < 4)) {
      assessmentType = 'depression-screening';
    } else {
      assessmentType = 'general-wellbeing';
    }
    
    // Determine length based on engagement
    assessmentLength = userEngagement > 0.7 ? 'long' : 'short';
    
    await this.scheduleAssessmentNotification(assessmentType, assessmentLength);
  }
}
```

## Conclusion

The push notification system provides a comprehensive foundation for engaging users in their mental health journey. The deep linking integration ensures that notifications lead to meaningful actions within the app, while the smart scheduling and contextual content generation create a personalized experience.

Key benefits of this implementation:

1. **User-Centric Design**: Respects user preferences and provides granular control
2. **Intelligent Timing**: Uses data-driven approaches to optimize notification delivery
3. **Seamless Integration**: Deep links provide smooth navigation to relevant app sections
4. **Privacy-First**: Protects sensitive health information while providing helpful reminders
5. **Scalable Architecture**: Supports future enhancements and ML integration

The system is designed to evolve with user needs and can be enhanced with machine learning, wearable integration, and advanced assessment routing as the application grows.

Remember that push notifications for mental health applications require careful consideration of user wellbeing, privacy regulations, and clinical best practices. Always prioritize user consent, provide easy opt-out mechanisms, and ensure that notifications support rather than overwhelm the user's mental health journey.