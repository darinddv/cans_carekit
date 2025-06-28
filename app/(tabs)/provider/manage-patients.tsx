import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Dimensions,
  Alert,
} from 'react-native';
import { Users, Plus, Search, UserPlus, Calendar, Clock, Trash2, ChevronRight, Heart, Mail, User, Activity, ChartBar as BarChart3 } from 'lucide-react-native';
import { SupabaseService, UserProfile, CareTaskInsert } from '@/lib/supabaseService';
import { RoleGuard } from '@/components/RoleGuard';
import { router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

function ManagePatientsContent() {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userProfile = await SupabaseService.getCurrentUserProfile();
      if (!userProfile) {
        setError('User profile not found');
        return;
      }

      if (userProfile.role !== 'provider') {
        setError('Access denied: Provider role required');
        return;
      }

      setCurrentProviderId(userProfile.id);
      const patientList = await SupabaseService.getPatientsForProvider(userProfile.id);
      setPatients(patientList);
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  };

  const searchPatients = async (email: string) => {
    if (!email.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const results = await SupabaseService.searchUsersByEmail(email);
      
      // Filter out patients already in the provider's care
      const existingPatientIds = patients.map(p => p.id);
      const filteredResults = results.filter(user => !existingPatientIds.includes(user.id));
      
      setSearchResults(filteredResults);
    } catch (err: any) {
      console.error('Error searching patients:', err);
      setError(err.message || 'Failed to search patients');
    } finally {
      setIsSearching(false);
    }
  };

  const addPatient = async (patient: UserProfile) => {
    if (!currentProviderId) {
      setError('Provider ID not found');
      return;
    }

    try {
      setIsAddingPatient(true);
      await SupabaseService.addPatientToProvider(currentProviderId, patient.id);
      
      // Refresh the patients list
      await loadPatients();
      
      // Clear search
      setSearchEmail('');
      setSearchResults([]);
      setShowAddPatient(false);
      
      setError(null);
    } catch (err: any) {
      console.error('Error adding patient:', err);
      setError(err.message || 'Failed to add patient');
    } finally {
      setIsAddingPatient(false);
    }
  };

  const removePatient = async (patient: UserProfile) => {
    if (!currentProviderId) {
      setError('Provider ID not found');
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Remove ${patient.email} from your care list?`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Remove Patient',
        `Remove ${patient.email} from your care list?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: () => performRemovePatient(patient) },
        ]
      );
      return;
    }

    await performRemovePatient(patient);
  };

  const performRemovePatient = async (patient: UserProfile) => {
    if (!currentProviderId) return;

    try {
      await SupabaseService.removePatientFromProvider(currentProviderId, patient.id);
      await loadPatients();
      setError(null);
    } catch (err: any) {
      console.error('Error removing patient:', err);
      setError(err.message || 'Failed to remove patient');
    }
  };

  const createTask = async () => {
    if (!selectedPatient || !taskTitle.trim() || !taskTime.trim()) {
      setError('Please fill in all task fields');
      return;
    }

    try {
      setIsCreatingTask(true);
      
      const taskData: Omit<CareTaskInsert, 'user_id'> = {
        id: uuidv4(),
        title: taskTitle.trim(),
        time: taskTime.trim(),
        completed: false,
        created_at: new Date().toISOString(),
      };

      await SupabaseService.createTaskForPatient(selectedPatient.id, taskData);
      
      // Reset form
      setTaskTitle('');
      setTaskTime('');
      setSelectedPatient(null);
      setShowCreateTask(false);
      setError(null);
      
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const viewPatientSymptoms = (patient: UserProfile) => {
    router.push({
      pathname: '/(tabs)/provider/patient-symptoms',
      params: {
        patientId: patient.id,
        patientName: patient.full_name || patient.username || 'Patient',
        patientEmail: patient.email,
      },
    });
  };

  const isWeb = Platform.OS === 'web';
  const isTablet = windowDimensions.width >= 768;
  const isDesktop = windowDimensions.width >= 1024;
  const isLargeDesktop = windowDimensions.width >= 1440;

  const getResponsiveStyles = () => {
    const baseStyles = styles;
    
    if (isWeb && isDesktop) {
      return {
        ...baseStyles,
        container: {
          ...baseStyles.container,
          backgroundColor: '#F8F9FA',
        },
        content: {
          ...baseStyles.content,
          maxWidth: isLargeDesktop ? 1200 : 1000,
          alignSelf: 'center',
          paddingHorizontal: isLargeDesktop ? 40 : 32,
          paddingTop: isLargeDesktop ? 48 : 40,
        },
        title: {
          ...baseStyles.title,
          fontSize: isLargeDesktop ? 40 : 36,
        },
        subtitle: {
          ...baseStyles.subtitle,
          fontSize: isLargeDesktop ? 18 : 16,
        },
        sectionTitle: {
          ...baseStyles.sectionTitle,
          fontSize: isLargeDesktop ? 24 : 22,
        },
        patientCard: {
          ...baseStyles.patientCard,
          borderRadius: 20,
          padding: isLargeDesktop ? 24 : 20,
        },
        actionButton: {
          ...baseStyles.actionButton,
          borderRadius: 16,
          paddingVertical: isLargeDesktop ? 18 : 16,
        },
        input: {
          ...baseStyles.input,
          fontSize: isLargeDesktop ? 18 : 16,
          paddingVertical: isLargeDesktop ? 18 : 16,
        },
      };
    } else if (isWeb && isTablet) {
      return {
        ...baseStyles,
        content: {
          ...baseStyles.content,
          maxWidth: 800,
          alignSelf: 'center',
          paddingHorizontal: 32,
        },
      };
    }
    
    return baseStyles;
  };

  const responsiveStyles = getResponsiveStyles();

  if (isLoading) {
    return (
      <SafeAreaView style={responsiveStyles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading patients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={responsiveStyles.container}>
      <ScrollView 
        contentContainerStyle={responsiveStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              <View style={[
                styles.iconContainer,
                isWeb && isDesktop && {
                  width: isLargeDesktop ? 80 : 70,
                  height: isLargeDesktop ? 80 : 70,
                  borderRadius: isLargeDesktop ? 40 : 35,
                }
              ]}>
                <Users 
                  size={isWeb && isDesktop ? (isLargeDesktop ? 40 : 36) : 32} 
                  color="#007AFF" 
                  strokeWidth={2} 
                />
              </View>
              <View>
                <Text style={responsiveStyles.title}>Manage Patients</Text>
                <Text style={responsiveStyles.subtitle}>
                  Add patients and create care tasks
                </Text>
              </View>
            </View>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[responsiveStyles.actionButton, styles.primaryButton]}
            onPress={() => setShowAddPatient(!showAddPatient)}
            activeOpacity={0.7}
          >
            <UserPlus 
              size={isWeb && isDesktop ? 24 : 20} 
              color="#FFFFFF" 
              strokeWidth={2} 
            />
            <Text style={styles.actionButtonText}>Add Patient</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[responsiveStyles.actionButton, styles.secondaryButton]}
            onPress={() => setShowCreateTask(!showCreateTask)}
            activeOpacity={0.7}
          >
            <Plus 
              size={isWeb && isDesktop ? 24 : 20} 
              color="#007AFF" 
              strokeWidth={2} 
            />
            <Text style={styles.secondaryButtonText}>Create Task</Text>
          </TouchableOpacity>
        </View>

        {/* Add Patient Section */}
        {showAddPatient && (
          <View style={styles.section}>
            <Text style={responsiveStyles.sectionTitle}>Add New Patient</Text>
            
            <View style={styles.searchContainer}>
              <View style={styles.searchInputContainer}>
                <Search 
                  size={isWeb && isDesktop ? 22 : 20} 
                  color="#8E8E93" 
                  strokeWidth={2} 
                />
                <TextInput
                  style={responsiveStyles.input}
                  placeholder="Search by email address"
                  placeholderTextColor="#8E8E93"
                  value={searchEmail}
                  onChangeText={(text) => {
                    setSearchEmail(text);
                    searchPatients(text);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {isSearching && (
                  <ActivityIndicator size="small" color="#007AFF" />
                )}
              </View>
            </View>

            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.searchResultItem}
                    onPress={() => addPatient(user)}
                    disabled={isAddingPatient}
                    activeOpacity={0.7}
                  >
                    <View style={styles.userInfo}>
                      <View style={styles.userAvatar}>
                        <User 
                          size={isWeb && isDesktop ? 24 : 20} 
                          color="#007AFF" 
                          strokeWidth={2} 
                        />
                      </View>
                      <View style={styles.userDetails}>
                        <Text style={styles.userName}>
                          {user.full_name || user.username || 'Unknown User'}
                        </Text>
                        <Text style={styles.userEmail}>{user.email}</Text>
                      </View>
                    </View>
                    {isAddingPatient ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Plus 
                        size={isWeb && isDesktop ? 24 : 20} 
                        color="#007AFF" 
                        strokeWidth={2} 
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Create Task Section */}
        {showCreateTask && (
          <View style={styles.section}>
            <Text style={responsiveStyles.sectionTitle}>Create New Task</Text>
            
            {/* Patient Selection */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Patient</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.patientSelector}
              >
                {patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={[
                      styles.patientSelectorItem,
                      selectedPatient?.id === patient.id && styles.patientSelectorItemSelected
                    ]}
                    onPress={() => setSelectedPatient(patient)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.patientSelectorAvatar}>
                      <User 
                        size={16} 
                        color={selectedPatient?.id === patient.id ? "#FFFFFF" : "#007AFF"} 
                        strokeWidth={2} 
                      />
                    </View>
                    <Text style={[
                      styles.patientSelectorText,
                      selectedPatient?.id === patient.id && styles.patientSelectorTextSelected
                    ]}>
                      {patient.full_name || patient.email.split('@')[0]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Task Details */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task Title</Text>
              <TextInput
                style={responsiveStyles.input}
                placeholder="Enter task title"
                placeholderTextColor="#8E8E93"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Scheduled Time</Text>
              <TextInput
                style={responsiveStyles.input}
                placeholder="e.g., 9:00 AM, After breakfast"
                placeholderTextColor="#8E8E93"
                value={taskTime}
                onChangeText={setTaskTime}
              />
            </View>

            <TouchableOpacity
              style={[
                responsiveStyles.actionButton, 
                styles.primaryButton,
                (!selectedPatient || !taskTitle.trim() || !taskTime.trim()) && styles.disabledButton
              ]}
              onPress={createTask}
              disabled={isCreatingTask || !selectedPatient || !taskTitle.trim() || !taskTime.trim()}
              activeOpacity={0.7}
            >
              {isCreatingTask ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Calendar 
                    size={isWeb && isDesktop ? 24 : 20} 
                    color="#FFFFFF" 
                    strokeWidth={2} 
                  />
                  <Text style={styles.actionButtonText}>Create Task</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Patients List */}
        <View style={styles.section}>
          <Text style={responsiveStyles.sectionTitle}>
            Your Patients ({patients.length})
          </Text>
          
          {patients.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Heart 
                  size={isWeb && isDesktop ? 48 : 40} 
                  color="#8E8E93" 
                  strokeWidth={1.5} 
                />
              </View>
              <Text style={styles.emptyStateTitle}>No patients yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add patients to start managing their care tasks
              </Text>
            </View>
          ) : (
            <View style={styles.patientsList}>
              {patients.map((patient) => (
                <View key={patient.id} style={responsiveStyles.patientCard}>
                  <View style={styles.patientInfo}>
                    <View style={styles.patientAvatar}>
                      <User 
                        size={isWeb && isDesktop ? 28 : 24} 
                        color="#007AFF" 
                        strokeWidth={2} 
                      />
                    </View>
                    <View style={styles.patientDetails}>
                      <Text style={styles.patientName}>
                        {patient.full_name || patient.username || 'Unknown User'}
                      </Text>
                      <View style={styles.patientEmailContainer}>
                        <Mail 
                          size={isWeb && isDesktop ? 16 : 14} 
                          color="#8E8E93" 
                          strokeWidth={2} 
                        />
                        <Text style={styles.patientEmail}>{patient.email}</Text>
                      </View>
                      <Text style={styles.patientSince}>
                        Patient since {new Date(patient.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.patientActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionIconButton,
                        styles.viewLogsButton,
                        isWeb && isDesktop && {
                          padding: 12,
                          borderRadius: 12,
                        }
                      ]}
                      onPress={() => viewPatientSymptoms(patient)}
                      activeOpacity={0.7}
                    >
                      <Activity 
                        size={isWeb && isDesktop ? 20 : 18} 
                        color="#007AFF" 
                        strokeWidth={2} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionIconButton,
                        styles.removeButton,
                        isWeb && isDesktop && {
                          padding: 12,
                          borderRadius: 12,
                        }
                      ]}
                      onPress={() => removePatient(patient)}
                      activeOpacity={0.7}
                    >
                      <Trash2 
                        size={isWeb && isDesktop ? 20 : 18} 
                        color="#FF3B30" 
                        strokeWidth={2} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ManagePatientsScreen() {
  return (
    <RoleGuard 
      allowedRoles={['provider']} 
      fallbackMessage="Patient management is exclusively for healthcare providers."
    >
      <ManagePatientsContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 32,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    lineHeight: 22,
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  disabledButton: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginLeft: 8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 16,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontWeight: '500',
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  patientSelector: {
    flexDirection: 'row',
  },
  patientSelectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  patientSelectorItemSelected: {
    backgroundColor: '#007AFF',
  },
  patientSelectorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  patientSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  patientSelectorTextSelected: {
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  patientsList: {
    gap: 16,
  },
  patientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  patientDetails: {
    flex: 1,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  patientEmailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 6,
  },
  patientSince: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  patientActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    padding: 10,
    borderRadius: 10,
  },
  viewLogsButton: {
    backgroundColor: '#F0F9FF',
  },
  removeButton: {
    backgroundColor: '#FFEBEE',
  },
});