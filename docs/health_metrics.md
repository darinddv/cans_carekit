# Health Metrics Integration Guide

This guide provides comprehensive documentation for integrating native health connections in the Care Card application. The current implementation uses mock data to provide a functional UI within the WebContainer environment. To access real bio-data from Apple HealthKit and Android Health Connect, you'll need to transition to a custom development client.

## Current Implementation Overview

The health metrics feature is currently implemented with:

- **Mock Health Service**: Provides simulated health data for development and web platforms
- **Responsive UI**: Beautiful, production-ready interface that works across all screen sizes
- **Role-based Access**: Restricted to patient users through the RoleGuard component
- **Real-time Updates**: Refresh functionality and loading states
- **Comprehensive Metrics**: Sleep, steps, heart rate, and hydration tracking

### Files Structure

```
lib/
├── healthService.ts          # Health data service with mock and native implementations
app/(tabs)/
├── health-metrics.tsx        # Main health metrics screen
components/
├── RoleGuard.tsx            # Role-based access control
```

## Why Custom Development Client is Required

### Expo Go Limitations

Expo Go is a sandbox environment that includes a pre-built set of native modules. It cannot:

- Access native health APIs like Apple HealthKit or Android Health Connect
- Include custom native modules that aren't part of the Expo SDK
- Request sensitive permissions like health data access
- Use platform-specific native code

### Custom Development Client Benefits

A custom development client allows you to:

- Include any native module from the React Native ecosystem
- Access platform-specific APIs and permissions
- Customize native project configurations
- Test on real devices with actual health data

## Detailed Migration Steps

### Phase 1: Environment Setup

#### 1.1 Install Development Tools

**Prerequisites:**
```bash
# Install Expo CLI (if not already installed)
npm install -g @expo/cli

# Install EAS CLI for building
npm install -g eas-cli

# For iOS development (macOS only)
# Install Xcode from the App Store
# Install Xcode Command Line Tools
xcode-select --install

# For Android development
# Install Android Studio
# Set up Android SDK and emulator
```

#### 1.2 Initialize EAS Build

```bash
# Login to Expo account
eas login

# Initialize EAS configuration
eas build:configure

# This creates eas.json with build configurations
```

#### 1.3 Generate Native Project Files

```bash
# Generate ios and android directories
npx expo prebuild

# This creates:
# - ios/ directory with Xcode project
# - android/ directory with Android Studio project
```

### Phase 2: Install Native Health Libraries

#### 2.1 Install React Native Health

```bash
# Primary library for iOS HealthKit and Android Health Connect
npm install react-native-health

# For iOS-specific HealthKit features
npm install @react-native-community/async-storage

# For Android Health Connect (newer Android versions)
npm install react-native-health-connect
```

#### 2.2 Install Additional Dependencies

```bash
# For permissions handling
npm install react-native-permissions

# For date/time utilities
npm install date-fns

# For charts and data visualization (optional)
npm install react-native-chart-kit react-native-svg
```

### Phase 3: Configure Native Projects

#### 3.1 iOS Configuration (HealthKit)

**Edit `ios/YourApp/Info.plist`:**

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to health data to provide personalized health insights and track your wellness journey.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>This app needs to write health data to keep your health information synchronized across your devices.</string>

<!-- Specific health data types -->
<key>NSHealthRequiredReadAuthorizationTypeIdentifiers</key>
<array>
    <string>HKQuantityTypeIdentifierStepCount</string>
    <string>HKQuantityTypeIdentifierHeartRate</string>
    <string>HKQuantityTypeIdentifierRestingHeartRate</string>
    <string>HKQuantityTypeIdentifierWalkingHeartRateAverage</string>
    <string>HKCategoryTypeIdentifierSleepAnalysis</string>
    <string>HKQuantityTypeIdentifierDietaryWater</string>
    <string>HKQuantityTypeIdentifierBodyMass</string>
    <string>HKQuantityTypeIdentifierBloodPressureSystolic</string>
    <string>HKQuantityTypeIdentifierBloodPressureDiastolic</string>
</array>
```

**Enable HealthKit Capability in Xcode:**

1. Open `ios/YourApp.xcworkspace` in Xcode
2. Select your app target
3. Go to "Signing & Capabilities" tab
4. Click "+ Capability"
5. Add "HealthKit"
6. Ensure "Clinical Health Records" is unchecked (unless needed)

#### 3.2 Android Configuration (Health Connect)

**Edit `android/app/src/main/AndroidManifest.xml`:**

```xml
<!-- Health Connect permissions -->
<uses-permission android:name="android.permission.health.READ_STEPS" />
<uses-permission android:name="android.permission.health.READ_HEART_RATE" />
<uses-permission android:name="android.permission.health.READ_SLEEP" />
<uses-permission android:name="android.permission.health.READ_HYDRATION" />
<uses-permission android:name="android.permission.health.READ_WEIGHT" />
<uses-permission android:name="android.permission.health.READ_BLOOD_PRESSURE" />

<!-- Health Connect intent filter -->
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask"
    android:theme="@style/Theme.App.SplashScreen">
    
    <!-- Health Connect intent -->
    <intent-filter>
        <action android:name="androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE" />
    </intent-filter>
</activity>

<!-- Health Connect provider -->
<provider
    android:name="androidx.health.connect.client.HealthConnectClient"
    android:authorities="${applicationId}.healthconnect"
    android:exported="false" />
```

**Edit `android/app/build.gradle`:**

```gradle
dependencies {
    implementation "androidx.health.connect:connect-client:1.0.0-alpha11"
    // ... other dependencies
}
```

### Phase 4: Implement Native Health Service

#### 4.1 Update Health Service Types

**Enhance `lib/healthService.ts`:**

```typescript
import { Platform } from 'react-native';

// Import native health libraries
let HealthKit: any = null;
let HealthConnect: any = null;

if (Platform.OS === 'ios') {
  try {
    HealthKit = require('react-native-health').default;
  } catch (e) {
    console.warn('HealthKit not available');
  }
} else if (Platform.OS === 'android') {
  try {
    HealthConnect = require('react-native-health-connect').default;
  } catch (e) {
    console.warn('Health Connect not available');
  }
}

// Enhanced types for native health data
export interface NativeHealthPermissions {
  read: string[];
  write: string[];
}

export interface HealthDataQuery {
  startDate: Date;
  endDate: Date;
  limit?: number;
  ascending?: boolean;
}
```

#### 4.2 Implement Native Health Service

```typescript
class NativeHealthService {
  private permissions: NativeHealthPermissions = {
    read: [
      'Steps',
      'HeartRate',
      'RestingHeartRate',
      'SleepAnalysis',
      'DietaryWater',
      'Weight',
      'BloodPressureSystolic',
      'BloodPressureDiastolic',
    ],
    write: [
      'DietaryWater',
      'Weight',
    ],
  };

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios' && HealthKit) {
        return await this.requestiOSPermissions();
      } else if (Platform.OS === 'android' && HealthConnect) {
        return await this.requestAndroidPermissions();
      }
      return false;
    } catch (error) {
      console.error('Error requesting health permissions:', error);
      return false;
    }
  }

  private async requestiOSPermissions(): Promise<boolean> {
    const permissions = {
      permissions: {
        read: this.permissions.read.map(type => HealthKit.Constants.Permissions[type]),
        write: this.permissions.write.map(type => HealthKit.Constants.Permissions[type]),
      },
    };

    return new Promise((resolve) => {
      HealthKit.initHealthKit(permissions, (error: any) => {
        if (error) {
          console.error('HealthKit initialization error:', error);
          resolve(false);
        } else {
          console.log('HealthKit initialized successfully');
          resolve(true);
        }
      });
    });
  }

  private async requestAndroidPermissions(): Promise<boolean> {
    try {
      const isAvailable = await HealthConnect.isAvailable();
      if (!isAvailable) {
        console.log('Health Connect not available on this device');
        return false;
      }

      const permissions = this.permissions.read.map(type => ({
        accessType: 'read',
        recordType: type,
      }));

      const granted = await HealthConnect.requestPermission(permissions);
      return granted;
    } catch (error) {
      console.error('Health Connect permission error:', error);
      return false;
    }
  }

  async getSleepData(days: number = 7): Promise<SleepData[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (Platform.OS === 'ios' && HealthKit) {
      return await this.getiOSSleepData(startDate, endDate);
    } else if (Platform.OS === 'android' && HealthConnect) {
      return await this.getAndroidSleepData(startDate, endDate);
    }

    throw new Error('Native health service not available');
  }

  private async getiOSSleepData(startDate: Date, endDate: Date): Promise<SleepData[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      HealthKit.getSamples('SleepAnalysis', options, (error: any, results: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        const sleepData: SleepData[] = results.map(sample => ({
          duration: Math.floor((new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()) / (1000 * 60)),
          quality: this.mapSleepQuality(sample.value),
          bedTime: new Date(sample.startDate),
          wakeTime: new Date(sample.endDate),
          deepSleep: 0, // Would need additional processing
          remSleep: 0,   // Would need additional processing
        }));

        resolve(sleepData);
      });
    });
  }

  private async getAndroidSleepData(startDate: Date, endDate: Date): Promise<SleepData[]> {
    try {
      const sleepRecords = await HealthConnect.readRecords('SleepSession', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return sleepRecords.map((record: any) => ({
        duration: Math.floor((new Date(record.endTime).getTime() - new Date(record.startTime).getTime()) / (1000 * 60)),
        quality: 'good', // Android Health Connect doesn't provide quality directly
        bedTime: new Date(record.startTime),
        wakeTime: new Date(record.endTime),
        deepSleep: 0,
        remSleep: 0,
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Android sleep data: ${error}`);
    }
  }

  async getStepsData(days: number = 7): Promise<HealthMetric[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (Platform.OS === 'ios' && HealthKit) {
      return await this.getiOSStepsData(startDate, endDate);
    } else if (Platform.OS === 'android' && HealthConnect) {
      return await this.getAndroidStepsData(startDate, endDate);
    }

    throw new Error('Native health service not available');
  }

  private async getiOSStepsData(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      HealthKit.getSamples('Steps', options, (error: any, results: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        const stepsData: HealthMetric[] = results.map((sample, index) => ({
          id: `steps-${index}`,
          type: 'steps',
          value: sample.value,
          unit: 'steps',
          timestamp: new Date(sample.startDate),
          source: sample.sourceName || 'HealthKit',
        }));

        resolve(stepsData);
      });
    });
  }

  private async getAndroidStepsData(startDate: Date, endDate: Date): Promise<HealthMetric[]> {
    try {
      const stepsRecords = await HealthConnect.readRecords('Steps', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      return stepsRecords.map((record: any, index: number) => ({
        id: `steps-${index}`,
        type: 'steps',
        value: record.count,
        unit: 'steps',
        timestamp: new Date(record.startTime),
        source: 'Health Connect',
      }));
    } catch (error) {
      throw new Error(`Failed to fetch Android steps data: ${error}`);
    }
  }

  async getHeartRateData(): Promise<HeartRateData> {
    if (Platform.OS === 'ios' && HealthKit) {
      return await this.getiOSHeartRateData();
    } else if (Platform.OS === 'android' && HealthConnect) {
      return await this.getAndroidHeartRateData();
    }

    throw new Error('Native health service not available');
  }

  private async getiOSHeartRateData(): Promise<HeartRateData> {
    return new Promise((resolve, reject) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
        limit: 100,
      };

      HealthKit.getSamples('HeartRate', options, (error: any, results: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        if (results.length === 0) {
          resolve({
            resting: 0,
            current: 0,
            max: 0,
            variability: 0,
          });
          return;
        }

        const heartRates = results.map(sample => sample.value);
        const current = heartRates[0] || 0;
        const max = Math.max(...heartRates);
        const resting = Math.min(...heartRates);

        resolve({
          resting,
          current,
          max,
          variability: 0, // Would need HRV data
        });
      });
    });
  }

  private async getAndroidHeartRateData(): Promise<HeartRateData> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);

      const heartRateRecords = await HealthConnect.readRecords('HeartRate', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      if (heartRateRecords.length === 0) {
        return {
          resting: 0,
          current: 0,
          max: 0,
          variability: 0,
        };
      }

      const heartRates = heartRateRecords.map((record: any) => record.beatsPerMinute);
      const current = heartRates[0] || 0;
      const max = Math.max(...heartRates);
      const resting = Math.min(...heartRates);

      return {
        resting,
        current,
        max,
        variability: 0,
      };
    } catch (error) {
      throw new Error(`Failed to fetch Android heart rate data: ${error}`);
    }
  }

  async getHydrationData(): Promise<HealthMetric[]> {
    if (Platform.OS === 'ios' && HealthKit) {
      return await this.getiOSHydrationData();
    } else if (Platform.OS === 'android' && HealthConnect) {
      return await this.getAndroidHydrationData();
    }

    throw new Error('Native health service not available');
  }

  private async getiOSHydrationData(): Promise<HealthMetric[]> {
    return new Promise((resolve, reject) => {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const options = {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ascending: false,
      };

      HealthKit.getSamples('DietaryWater', options, (error: any, results: any[]) => {
        if (error) {
          reject(error);
          return;
        }

        const totalWater = results.reduce((sum, sample) => sum + sample.value, 0);

        resolve([{
          id: 'hydration-today',
          type: 'hydration',
          value: totalWater,
          unit: 'L',
          timestamp: new Date(),
          source: 'HealthKit',
        }]);
      });
    });
  }

  private async getAndroidHydrationData(): Promise<HealthMetric[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      const hydrationRecords = await HealthConnect.readRecords('Hydration', {
        timeRangeFilter: {
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
        },
      });

      const totalWater = hydrationRecords.reduce((sum: number, record: any) => sum + record.volume.inLiters, 0);

      return [{
        id: 'hydration-today',
        type: 'hydration',
        value: totalWater,
        unit: 'L',
        timestamp: new Date(),
        source: 'Health Connect',
      }];
    } catch (error) {
      throw new Error(`Failed to fetch Android hydration data: ${error}`);
    }
  }

  private mapSleepQuality(value: number): SleepData['quality'] {
    // iOS HealthKit sleep analysis values
    switch (value) {
      case 0: return 'poor';    // Awake
      case 1: return 'fair';    // REM
      case 2: return 'good';    // Core
      case 3: return 'excellent'; // Deep
      default: return 'fair';
    }
  }
}
```

#### 4.3 Update Service Export

**Modify the export in `lib/healthService.ts`:**

```typescript
// Determine which service to use
const isNativeAvailable = Platform.OS !== 'web' && (HealthKit || HealthConnect);

export const HealthService = isNativeAvailable 
  ? new NativeHealthService()
  : new MockHealthService();
```

### Phase 5: Build and Test

#### 5.1 Create Development Build

```bash
# Build for iOS (requires macOS and Xcode)
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development

# Or build locally (after prebuild)
npx expo run:ios
npx expo run:android
```

#### 5.2 Install Development Build

**For iOS:**
1. Download the `.ipa` file from EAS Build
2. Install using Xcode or TestFlight
3. Or use iOS Simulator

**For Android:**
1. Download the `.apk` file from EAS Build
2. Install on device or emulator
3. Enable "Install from Unknown Sources" if needed

#### 5.3 Test Health Integration

1. **Grant Permissions**: Test the permission flow on first app launch
2. **Verify Data Access**: Check that real health data appears in the app
3. **Test Edge Cases**: Handle scenarios with no data or denied permissions
4. **Cross-Platform Testing**: Ensure both iOS and Android work correctly

### Phase 6: Production Deployment

#### 6.1 Update EAS Configuration

**Edit `eas.json`:**

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "production": {
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

#### 6.2 App Store Considerations

**iOS App Store:**
- Health data usage must be clearly explained in app description
- Privacy policy must detail health data handling
- App Review may require demonstration of health features

**Google Play Store:**
- Declare sensitive permissions in app listing
- Provide privacy policy for health data
- May require additional review for health apps

## Testing Strategy

### Unit Testing

```typescript
// __tests__/healthService.test.ts
import { HealthService } from '../lib/healthService';

describe('HealthService', () => {
  test('should request permissions', async () => {
    const hasPermissions = await HealthService.requestPermissions();
    expect(typeof hasPermissions).toBe('boolean');
  });

  test('should fetch sleep data', async () => {
    const sleepData = await HealthService.getSleepData(7);
    expect(Array.isArray(sleepData)).toBe(true);
  });
});
```

### Integration Testing

```typescript
// __tests__/healthMetrics.integration.test.ts
import { render, waitFor } from '@testing-library/react-native';
import HealthMetricsScreen from '../app/(tabs)/health-metrics';

describe('Health Metrics Integration', () => {
  test('should load health data', async () => {
    const { getByText } = render(<HealthMetricsScreen />);
    
    await waitFor(() => {
      expect(getByText('Health Metrics')).toBeTruthy();
    });
  });
});
```

## Security and Privacy Considerations

### Data Handling

1. **Local Processing**: Process health data locally when possible
2. **Encryption**: Encrypt sensitive data in transit and at rest
3. **Minimal Data**: Only request necessary health data types
4. **User Control**: Allow users to revoke permissions

### Privacy Compliance

1. **HIPAA Compliance**: If handling medical data in the US
2. **GDPR Compliance**: For European users
3. **Privacy Policy**: Clear explanation of data usage
4. **Consent Management**: Granular permission controls

### Code Security

```typescript
// Example of secure data handling
class SecureHealthService {
  private encryptHealthData(data: any): string {
    // Implement encryption for sensitive data
    return btoa(JSON.stringify(data)); // Simple example
  }

  private decryptHealthData(encryptedData: string): any {
    // Implement decryption
    return JSON.parse(atob(encryptedData)); // Simple example
  }

  async storeHealthData(data: HealthMetric[]): Promise<void> {
    const encrypted = this.encryptHealthData(data);
    // Store encrypted data
  }
}
```

## Troubleshooting Common Issues

### Permission Issues

**Problem**: Health permissions not granted
**Solution**: 
- Check permission strings in Info.plist/AndroidManifest.xml
- Verify HealthKit capability is enabled in Xcode
- Test permission flow on real device

### Build Errors

**Problem**: Native module linking issues
**Solution**:
- Run `npx expo prebuild --clean`
- Clear Metro cache: `npx expo start --clear`
- Rebuild native projects

### Data Access Issues

**Problem**: No health data returned
**Solution**:
- Verify device has health data
- Check permission scope matches requested data
- Test with Health app (iOS) or Google Fit (Android)

### Platform-Specific Issues

**iOS Specific:**
- Simulator doesn't have health data - test on real device
- HealthKit requires physical device for most features
- Check iOS version compatibility

**Android Specific:**
- Health Connect requires Android 14+ or Google Fit
- Different OEMs may have different health apps
- Test across multiple Android versions

## Performance Optimization

### Data Caching

```typescript
class OptimizedHealthService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getCachedData<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  async getSleepData(days: number = 7): Promise<SleepData[]> {
    return this.getCachedData(`sleep-${days}`, () => 
      super.getSleepData(days)
    );
  }
}
```

### Background Sync

```typescript
// Background health data sync
import BackgroundTask from '@react-native-async-storage/async-storage';

class BackgroundHealthSync {
  async scheduleSync(): Promise<void> {
    // Schedule background task to sync health data
    BackgroundTask.start({
      taskName: 'healthDataSync',
      taskFn: this.syncHealthData,
    });
  }

  private async syncHealthData(): Promise<void> {
    try {
      const healthData = await HealthService.getAllHealthData();
      await this.uploadToServer(healthData);
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }
}
```

## Future Enhancements

### Advanced Features

1. **Health Trends**: Machine learning for health pattern recognition
2. **Predictive Analytics**: Early warning systems for health issues
3. **Integration with Wearables**: Apple Watch, Fitbit, Garmin support
4. **Telemedicine**: Video calls with healthcare providers
5. **Medication Reminders**: Smart pill tracking and reminders

### Technical Improvements

1. **Real-time Sync**: WebSocket connections for live health data
2. **Offline Support**: Robust offline-first architecture
3. **Data Visualization**: Advanced charts and health dashboards
4. **Export Features**: PDF reports for healthcare providers
5. **Multi-user Support**: Family health tracking

## Conclusion

Transitioning from mock health data to native health connections requires significant development effort but provides access to real, valuable health information. The process involves:

1. **Setting up a custom development client** to access native modules
2. **Installing and configuring native health libraries** for iOS and Android
3. **Implementing platform-specific health data access** with proper error handling
4. **Testing thoroughly on real devices** with actual health data
5. **Ensuring privacy and security compliance** for health data handling

The current mock implementation provides a solid foundation that can be enhanced with real health data while maintaining the same user interface and experience. The modular architecture allows for a smooth transition from mock to native health services.

Remember that health data is highly sensitive and regulated. Always prioritize user privacy, obtain proper consent, and comply with relevant healthcare regulations in your target markets.