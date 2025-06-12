import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import { Heart } from 'lucide-react-native';

export default function CareCardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Heart size={32} color="#007AFF" strokeWidth={2} />
          <Text style={styles.title}>Care Card</Text>
        </View>
        <Text style={styles.subtitle}>
          Your personalized care plan and daily tasks
        </Text>

        <View style={styles.tasksList}>
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Take Medication</Text>
            <Text style={styles.taskTime}>8:00 AM</Text>
          </View>
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Morning Exercise</Text>
            <Text style={styles.taskTime}>9:00 AM</Text>
          </View>
          <View style={styles.taskCard}>
            <Text style={styles.taskTitle}>Mindfulness Practice</Text>
            <Text style={styles.taskTime}>6:00 PM</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
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
    marginBottom: 24,
  },
  tasksList: {
    width: '100%',
    marginTop: 8,
  },
  taskCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22223B',
  },
  taskTime: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 6,
  },
});
