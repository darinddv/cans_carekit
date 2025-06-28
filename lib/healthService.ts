import { Platform } from 'react-native';

// Types for health data
export interface HealthMetric {
  id: string;
  type: 'sleep' | 'steps' | 'heart_rate' | 'hydration' | 'weight' | 'blood_pressure';
  value: number | string;
  unit: string;
  timestamp: Date;
  source?: string;
}

export interface SleepData {
  duration: number; // in minutes
  quality: 'poor' | 'fair' | 'good' | 'excellent';
  bedTime: Date;
  wakeTime: Date;
  deepSleep: number; // in minutes
  remSleep: number; // in minutes
}

export interface HeartRateData {
  resting: number;
  current: number;
  max: number;
  variability: number;
}

// Mock health service for web/development
class MockHealthService {
  private generateMockSleepData(): SleepData {
    const now = new Date();
    const bedTime = new Date(now);
    bedTime.setHours(22, 30, 0, 0);
    bedTime.setDate(bedTime.getDate() - 1);
    
    const wakeTime = new Date(now);
    wakeTime.setHours(6, 45, 0, 0);
    
    const duration = Math.floor((wakeTime.getTime() - bedTime.getTime()) / (1000 * 60));
    
    return {
      duration,
      quality: 'good',
      bedTime,
      wakeTime,
      deepSleep: Math.floor(duration * 0.25),
      remSleep: Math.floor(duration * 0.20),
    };
  }

  private generateMockSteps(): number {
    return Math.floor(Math.random() * 5000) + 6000;
  }

  private generateMockHeartRate(): HeartRateData {
    return {
      resting: Math.floor(Math.random() * 20) + 60,
      current: Math.floor(Math.random() * 30) + 70,
      max: Math.floor(Math.random() * 40) + 160,
      variability: Math.floor(Math.random() * 20) + 30,
    };
  }

  async requestPermissions(): Promise<boolean> {
    // Mock permission request
    console.log('Mock: Requesting health permissions...');
    return true;
  }

  async getSleepData(days: number = 7): Promise<SleepData[]> {
    console.log(`Mock: Fetching sleep data for ${days} days`);
    const data: SleepData[] = [];
    
    for (let i = 0; i < days; i++) {
      data.push(this.generateMockSleepData());
    }
    
    return data;
  }

  async getStepsData(days: number = 7): Promise<HealthMetric[]> {
    console.log(`Mock: Fetching steps data for ${days} days`);
    const data: HealthMetric[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        id: `steps-${i}`,
        type: 'steps',
        value: this.generateMockSteps(),
        unit: 'steps',
        timestamp: date,
        source: 'Mock Health App',
      });
    }
    
    return data;
  }

  async getHeartRateData(): Promise<HeartRateData> {
    console.log('Mock: Fetching heart rate data');
    return this.generateMockHeartRate();
  }

  async getHydrationData(): Promise<HealthMetric[]> {
    console.log('Mock: Fetching hydration data');
    return [
      {
        id: 'hydration-today',
        type: 'hydration',
        value: 1.2,
        unit: 'L',
        timestamp: new Date(),
        source: 'Mock Health App',
      }
    ];
  }
}

// Native health service (placeholder for future implementation)
class NativeHealthService {
  async requestPermissions(): Promise<boolean> {
    // This would use react-native-health when available
    throw new Error('Native health service not implemented yet. Requires custom development client.');
  }

  async getSleepData(days: number = 7): Promise<SleepData[]> {
    throw new Error('Native health service not implemented yet. Requires custom development client.');
  }

  async getStepsData(days: number = 7): Promise<HealthMetric[]> {
    throw new Error('Native health service not implemented yet. Requires custom development client.');
  }

  async getHeartRateData(): Promise<HeartRateData> {
    throw new Error('Native health service not implemented yet. Requires custom development client.');
  }

  async getHydrationData(): Promise<HealthMetric[]> {
    throw new Error('Native health service not implemented yet. Requires custom development client.');
  }
}

// Export the appropriate service based on platform and availability
export const HealthService = Platform.OS === 'web' 
  ? new MockHealthService()
  : new MockHealthService(); // Use mock for now, will switch to native when available

// Utility functions
export const formatSleepDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

export const getSleepQualityColor = (quality: SleepData['quality']): string => {
  switch (quality) {
    case 'excellent': return '#10B981';
    case 'good': return '#059669';
    case 'fair': return '#F59E0B';
    case 'poor': return '#EF4444';
    default: return '#8E8E93';
  }
};

export const getHeartRateZone = (heartRate: number): { zone: string; color: string } => {
  if (heartRate < 60) return { zone: 'Resting', color: '#06B6D4' };
  if (heartRate < 100) return { zone: 'Normal', color: '#10B981' };
  if (heartRate < 140) return { zone: 'Elevated', color: '#F59E0B' };
  return { zone: 'High', color: '#EF4444' };
};