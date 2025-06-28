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
  Modal,
} from 'react-native';
import { Users, Plus, Calendar, Trash2, ChevronRight, Heart, Mail, User, Activity, ChartBar as BarChart3, ChevronDown, Check, Search, X, CreditCard as Edit3 } from 'lucide-react-native';
import { SupabaseService, UserProfile, CareTaskInsert, CareTask } from '@/lib/supabaseService';
import { RoleGuard } from '@/components/RoleGuard';
import { router } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';

function ManagePatientsContent() {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<UserProfile[]>([]);
  const [patientTasks, setPatientTasks] = useState<Record<string, CareTask[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditTask, setShowEditTask] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UserProfile | null>(null);
  const [selectedTask, setSelectedTask] = useState<CareTask | null>(null);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [windowDimensions, setWindowDimensions] = useState(Dimensions.get('window'));
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(null);
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setWindowDimensions(window);
    });

    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    loadPatients();
  }, []);

  // Filter patients based on search query
  useEffect(() => {
    if (!patientSearchQuery.trim()) {
      setFilteredPatients(patients);
    } else {
      const query = patientSearchQuery.toLowerCase();
      const filtered = patients.filter(patient => {
        const name = getDisplayName(patient).toLowerCase();
        const email = patient.email.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
      setFilteredPatients(filtered);
    }
  }, [patientSearchQuery, patients]);

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
      setFilteredPatients(patientList);

      // Load tasks for all patients
      await loadAllPatientTasks(patientList);
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err.message || 'Failed to load patients');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllPatientTasks = async (patientList: UserProfile[]) => {
    try {
      setIsLoadingTasks(true);
      const tasksMap: Record<string, CareTask[]> = {};

      // Load tasks for each patient
      for (const patient of patientList) {
        try {
          const tasks = await SupabaseService.fetchTasksForPatient(patient.id);
          tasksMap[patient.id] = tasks;
        } catch (err) {
          console.error(`Error loading tasks for patient ${patient.id}:`, err);
          tasksMap[patient.id] = [];
        }
      }

      setPatientTasks(tasksMap);
    } catch (err: any) {
      console.error('Error loading patient tasks:', err);
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const togglePatientExpansion = (patientId: string) => {
    const newExpanded = new Set(expandedPatients);
    if (newExpanded.has(patientId)) {
      newExpanded.delete(patientId);
    } else {
      newExpanded.add(patientId);
    }
    setExpandedPatients(newExpanded);
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
      setPatientSearchQuery('');
      setError(null);
      
      // Reload tasks
      await loadAllPatientTasks(patients);
    } catch (err: any) {
      console.error('Error creating task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const openEditTask = (task: CareTask, patient: UserProfile) => {
    setSelectedTask(task);
    setSelectedPatient(patient);
    setTaskTitle(task.title);
    setTaskTime(task.time);
    setShowEditTask(true);
  };

  const updateTask = async () => {
    if (!selectedTask || !taskTitle.trim() || !taskTime.trim()) {
      setError('Please fill in all task fields');
      return;
    }

    try {
      setIsUpdatingTask(true);
      
      const updatedTask: CareTask = {
        ...selectedTask,
        title: taskTitle.trim(),
        time: taskTime.trim(),
        updated_at: new Date().toISOString(),
      };

      await SupabaseService.upsertTask(updatedTask);
      
      // Reset form
      setTaskTitle('');
      setTaskTime('');
      setSelectedTask(null);
      setSelectedPatient(null);
      setShowEditTask(false);
      setError(null);
      
      // Reload tasks
      await loadAllPatientTasks(patients);
    } catch (err: any) {
      console.error('Error updating task:', err);
      setError(err.message || 'Failed to update task');
    } finally {
      setIsUpdatingTask(false);
    }
  };

  const deleteTask = async (task: CareTask) => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Delete task "${task.title}"?`);
      if (!confirmed) return;
    } else {
      Alert.alert(
        'Delete Task',
        `Delete task "${task.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDeleteTask(task) },
        ]
      );
      return;
    }

    await performDeleteTask(task);
  };

  const performDeleteTask = async (task: CareTask) => {
    try {
      await SupabaseService.deleteTask(task.id);
      await loadAllPatientTasks(patients);
      setError(null);
    } catch (err: any) {
      console.error('Error deleting task:', err);
      setError(err.message || 'Failed to delete task');
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

  const selectPatient = (patient: UserProfile) => {
    setSelectedPatient(patient);
    setShowPatientPicker(false);
    setPatientSearchQuery('');
  };

  const clearPatientSearch = () => {
    setPatientSearchQuery('');
  };

  const getDisplayName = (patient: UserProfile) => {
    return patient.full_name || patient.username || patient.email.split('@')[0];
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
          paddingVertical: isLargeDesktop ? 20 : 18,
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
                  View your patients and manage their care tasks
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

        {/* Create Task Button */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={[responsiveStyles.actionButton, styles.primaryButton]}
            onPress={() => setShowCreateTask(!showCreateTask)}
            activeOpacity={0.7}
          >
            <Plus 
              size={isWeb && isDesktop ? 24 : 20} 
              color="#FFFFFF" 
              strokeWidth={2} 
            />
            <Text style={styles.actionButtonText}>Create Task</Text>
          </TouchableOpacity>
        </View>

        {/* Create Task Section */}
        {showCreateTask && (
          <View style={styles.section}>
            <Text style={responsiveStyles.sectionTitle}>Create New Task</Text>
            
            {/* Patient Selection Dropdown */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Select Patient</Text>
              <TouchableOpacity
                style={[
                  styles.patientSelector,
                  isWeb && isDesktop && {
                    borderRadius: 16,
                    paddingVertical: isLargeDesktop ? 20 : 18,
                  }
                ]}
                onPress={() => setShowPatientPicker(true)}
                activeOpacity={0.7}
              >
                <View style={styles.patientSelectorContent}>
                  {selectedPatient ? (
                    <View style={styles.selectedPatientInfo}>
                      <View style={styles.selectedPatientAvatar}>
                        <User 
                          size={20} 
                          color="#007AFF" 
                          strokeWidth={2} 
                        />
                      </View>
                      <View style={styles.selectedPatientDetails}>
                        <Text style={styles.selectedPatientName}>
                          {getDisplayName(selectedPatient)}
                        </Text>
                        <Text style={styles.selectedPatientEmail}>
                          {selectedPatient.email}
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.patientSelectorPlaceholder}>
                      Choose a patient...
                    </Text>
                  )}
                  <ChevronDown 
                    size={isWeb && isDesktop ? 24 : 20} 
                    color="#8E8E93" 
                    strokeWidth={2} 
                  />
                </View>
              </TouchableOpacity>
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
              <Text style={styles.emptyStateTitle}>No patients assigned</Text>
              <Text style={styles.emptyStateSubtitle}>
                Patients will be added to your care list by your healthcare organization
              </Text>
            </View>
          ) : (
            <View style={styles.patientsList}>
              {patients.map((patient) => {
                const isExpanded = expandedPatients.has(patient.id);
                const tasks = patientTasks[patient.id] || [];
                
                return (
                  <View key={patient.id} style={responsiveStyles.patientCard}>
                    {/* Patient Header */}
                    <TouchableOpacity
                      style={styles.patientHeader}
                      onPress={() => togglePatientExpansion(patient.id)}
                      activeOpacity={0.7}
                    >
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
                            {getDisplayName(patient)}
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
                            {tasks.length} task{tasks.length !== 1 ? 's' : ''} • Patient since {new Date(patient.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.patientActions}>
                        <TouchableOpacity
                          style={[
                            styles.actionIconButton,
                            styles.viewLogsButton,
                            { marginRight: 8 },
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
                            { marginRight: 8 },
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
                        <View style={[
                          styles.expandButton,
                          isExpanded && styles.expandButtonExpanded
                        ]}>
                          <ChevronRight 
                            size={isWeb && isDesktop ? 20 : 18} 
                            color="#8E8E93" 
                            strokeWidth={2} 
                          />
                        </View>
                      </View>
                    </TouchableOpacity>

                    {/* Patient Tasks (Expandable) */}
                    {isExpanded && (
                      <View style={styles.patientTasksContainer}>
                        <View style={styles.tasksHeader}>
                          <Text style={styles.tasksTitle}>Care Tasks</Text>
                          {isLoadingTasks && (
                            <ActivityIndicator size="small" color="#007AFF" />
                          )}
                        </View>
                        
                        {tasks.length === 0 ? (
                          <View style={styles.noTasks}>
                            <Calendar size={32} color="#8E8E93" strokeWidth={1.5} />
                            <Text style={styles.noTasksText}>No tasks assigned</Text>
                          </View>
                        ) : (
                          <View style={styles.tasksList}>
                            {tasks.map((task) => (
                              <View key={task.id} style={styles.taskItem}>
                                <View style={styles.taskInfo}>
                                  <Text style={[
                                    styles.taskTitle,
                                    task.completed && styles.taskTitleCompleted
                                  ]}>
                                    {task.title}
                                  </Text>
                                  <Text style={[
                                    styles.taskTime,
                                    task.completed && styles.taskTimeCompleted
                                  ]}>
                                    {task.time}
                                  </Text>
                                  <Text style={styles.taskStatus}>
                                    {task.completed ? 'Completed' : 'Pending'}
                                  </Text>
                                </View>
                                <View style={styles.taskActions}>
                                  <TouchableOpacity
                                    style={[
                                      styles.taskActionButton,
                                      styles.editTaskButton
                                    ]}
                                    onPress={() => openEditTask(task, patient)}
                                    activeOpacity={0.7}
                                  >
                                    <Edit3 size={16} color="#007AFF" strokeWidth={2} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[
                                      styles.taskActionButton,
                                      styles.deleteTaskButton
                                    ]}
                                    onPress={() => deleteTask(task)}
                                    activeOpacity={0.7}
                                  >
                                    <Trash2 size={16} color="#FF3B30" strokeWidth={2} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Patient Picker Modal with Search */}
      <Modal
        visible={showPatientPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowPatientPicker(false);
          setPatientSearchQuery('');
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowPatientPicker(false);
                setPatientSearchQuery('');
              }}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search 
                size={isWeb && isDesktop ? 22 : 20} 
                color="#8E8E93" 
                strokeWidth={2} 
              />
              <TextInput
                style={[
                  styles.searchInput,
                  isWeb && isDesktop && {
                    fontSize: isLargeDesktop ? 18 : 16,
                  }
                ]}
                placeholder="Search patients by name or email..."
                placeholderTextColor="#8E8E93"
                value={patientSearchQuery}
                onChangeText={setPatientSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {patientSearchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={clearPatientSearch}
                  style={styles.clearSearchButton}
                  activeOpacity={0.7}
                >
                  <X 
                    size={isWeb && isDesktop ? 20 : 18} 
                    color="#8E8E93" 
                    strokeWidth={2} 
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {filteredPatients.length === 0 ? (
              <View style={styles.noSearchResults}>
                <View style={styles.noSearchResultsIcon}>
                  <Search 
                    size={isWeb && isDesktop ? 56 : 48} 
                    color="#8E8E93" 
                    strokeWidth={1.5} 
                  />
                </View>
                <Text style={styles.noSearchResultsTitle}>
                  {patientSearchQuery ? 'No patients found' : 'No patients available'}
                </Text>
                <Text style={styles.noSearchResultsSubtitle}>
                  {patientSearchQuery 
                    ? `No patients match "${patientSearchQuery}". Try a different search term.`
                    : 'You don\'t have any patients assigned to your care yet.'
                  }
                </Text>
              </View>
            ) : (
              filteredPatients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={[
                    styles.patientPickerItem,
                    selectedPatient?.id === patient.id && styles.patientPickerItemSelected
                  ]}
                  onPress={() => selectPatient(patient)}
                  activeOpacity={0.7}
                >
                  <View style={styles.patientPickerInfo}>
                    <View style={styles.patientPickerAvatar}>
                      <User 
                        size={24} 
                        color="#007AFF" 
                        strokeWidth={2} 
                      />
                    </View>
                    <View style={styles.patientPickerDetails}>
                      <Text style={styles.patientPickerName}>
                        {getDisplayName(patient)}
                      </Text>
                      <Text style={styles.patientPickerEmail}>
                        {patient.email}
                      </Text>
                      <Text style={styles.patientPickerSince}>
                        Patient since {new Date(patient.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  {selectedPatient?.id === patient.id && (
                    <Check 
                      size={24} 
                      color="#007AFF" 
                      strokeWidth={2} 
                    />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Search Results Summary */}
          {patientSearchQuery && filteredPatients.length > 0 && (
            <View style={styles.searchSummary}>
              <Text style={styles.searchSummaryText}>
                {filteredPatients.length} of {patients.length} patients shown
              </Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* Edit Task Modal */}
      <Modal
        visible={showEditTask}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowEditTask(false);
          setTaskTitle('');
          setTaskTime('');
          setSelectedTask(null);
          setSelectedPatient(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => {
                setShowEditTask(false);
                setTaskTitle('');
                setTaskTime('');
                setSelectedTask(null);
                setSelectedPatient(null);
              }}
              style={styles.modalCloseButton}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Task</Text>
            <TouchableOpacity 
              onPress={updateTask}
              style={[
                styles.modalSaveButton,
                (!taskTitle.trim() || !taskTime.trim() || isUpdatingTask) && styles.modalSaveButtonDisabled
              ]}
              disabled={!taskTitle.trim() || !taskTime.trim() || isUpdatingTask}
            >
              {isUpdatingTask ? (
                <ActivityIndicator size="small" color="#007AFF" />
              ) : (
                <Text style={[
                  styles.modalSaveText,
                  (!taskTitle.trim() || !taskTime.trim()) && styles.modalSaveTextDisabled
                ]}>
                  Save
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Patient Info */}
            {selectedPatient && (
              <View style={styles.editTaskPatientInfo}>
                <Text style={styles.editTaskPatientLabel}>Patient</Text>
                <View style={styles.editTaskPatientCard}>
                  <View style={styles.editTaskPatientAvatar}>
                    <User size={24} color="#007AFF" strokeWidth={2} />
                  </View>
                  <View style={styles.editTaskPatientDetails}>
                    <Text style={styles.editTaskPatientName}>
                      {getDisplayName(selectedPatient)}
                    </Text>
                    <Text style={styles.editTaskPatientEmail}>
                      {selectedPatient.email}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Task Details */}
            <View style={styles.editTaskForm}>
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

              {/* Task Status */}
              {selectedTask && (
                <View style={styles.taskStatusInfo}>
                  <Text style={styles.taskStatusLabel}>Status</Text>
                  <View style={[
                    styles.taskStatusBadge,
                    selectedTask.completed ? styles.taskStatusCompleted : styles.taskStatusPending
                  ]}>
                    <Text style={[
                      styles.taskStatusText,
                      selectedTask.completed ? styles.taskStatusTextCompleted : styles.taskStatusTextPending
                    ]}>
                      {selectedTask.completed ? 'Completed' : 'Pending'}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 24,
  },
  actionButton: {
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
  disabledButton: {
    backgroundColor: '#8E8E93',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  patientSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedPatientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  selectedPatientDetails: {
    flex: 1,
  },
  selectedPatientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  selectedPatientEmail: {
    fontSize: 14,
    color: '#8E8E93',
  },
  patientSelectorPlaceholder: {
    fontSize: 16,
    color: '#8E8E93',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
    fontWeight: '500',
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
  },
  patientHeader: {
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
  expandButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    transform: [{ rotate: '0deg' }],
  },
  expandButtonExpanded: {
    transform: [{ rotate: '90deg' }],
  },
  // Patient Tasks Styles
  patientTasksContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tasksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  noTasks: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noTasksText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  taskTitleCompleted: {
    color: '#34C759',
    textDecorationLine: 'line-through',
  },
  taskTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 4,
  },
  taskTimeCompleted: {
    color: '#34C759',
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8E8E93',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskActionButton: {
    padding: 8,
    borderRadius: 8,
  },
  editTaskButton: {
    backgroundColor: '#F0F9FF',
  },
  deleteTaskButton: {
    backgroundColor: '#FFEBEE',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  modalCloseButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalSaveButton: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  modalSaveButtonDisabled: {
    opacity: 0.5,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalSaveTextDisabled: {
    color: '#8E8E93',
  },
  // Search styles
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
    marginLeft: 12,
    fontWeight: '500',
  },
  clearSearchButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    marginLeft: 8,
  },
  modalContent: {
    flex: 1,
    paddingTop: 8,
  },
  patientPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  patientPickerItemSelected: {
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  patientPickerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  patientPickerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  patientPickerDetails: {
    flex: 1,
  },
  patientPickerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  patientPickerEmail: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
    marginBottom: 2,
  },
  patientPickerSince: {
    fontSize: 13,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  // No search results styles
  noSearchResults: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  noSearchResultsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 24,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  noSearchResultsTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 12,
    textAlign: 'center',
  },
  noSearchResultsSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  // Search summary styles
  searchSummary: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  searchSummaryText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  // Edit Task Modal Styles
  editTaskPatientInfo: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  editTaskPatientLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editTaskPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editTaskPatientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  editTaskPatientDetails: {
    flex: 1,
  },
  editTaskPatientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  editTaskPatientEmail: {
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  editTaskForm: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  taskStatusInfo: {
    marginTop: 8,
  },
  taskStatusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  taskStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  taskStatusCompleted: {
    backgroundColor: '#E8F5E8',
  },
  taskStatusPending: {
    backgroundColor: '#FFF3CD',
  },
  taskStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  taskStatusTextCompleted: {
    color: '#34C759',
  },
  taskStatusTextPending: {
    color: '#F59E0B',
  },
});