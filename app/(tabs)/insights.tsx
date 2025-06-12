import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { ChartBar as BarChart3 } from 'lucide-react-native';

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <BarChart3 size={32} color="#007AFF" strokeWidth={2} />
          <Text style={styles.title}>Insights</Text>
        </View>
        <Text style={styles.subtitle}>
          Discover patterns and trends in your health data
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
});