import { supabase, Database } from './supabase';

// Use the generated type for CareTask
export type CareTask = Database['public']['Tables']['tasks']['Row'];

// Type for inserting new tasks
export type CareTaskInsert = Database['public']['Tables']['tasks']['Insert'];

// Type for updating existing tasks
export type CareTaskUpdate = Database['public']['Tables']['tasks']['Update'];

// User profile type from the users table
export type UserProfile = Database['public']['Tables']['users']['Row'];

// Type for inserting new user profiles
export type UserProfileInsert = Database['public']['Tables']['users']['Insert'];

// Care relationship types from the care_relationships table
export type CareRelationship = Database['public']['Tables']['care_relationships']['Row'];

// Type for inserting new care relationships
export type CareRelationshipInsert = Database['public']['Tables']['care_relationships']['Insert'];

// Type for updating existing care relationships
export type CareRelationshipUpdate = Database['public']['Tables']['care_relationships']['Update'];

export class SupabaseService {
  // Sign in with email and password
  static async signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    try {
      console.log('Attempting sign in for:', email);
      
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name,
          stack: error.stack
        });
        throw error;
      }
      
      console.log('Sign in successful');
    } catch (error) {
      console.error('Sign in exception:', error);
      throw error;
    }
  }

  // Fetch user profile by user ID
  static async fetchUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No user profile found for ID:', userId);
          return null;
        }
        console.error('Fetch user profile error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('User profile fetched successfully:', data?.email);
      return data;
    } catch (error) {
      console.error('Fetch user profile exception:', error);
      throw error;
    }
  }

  // Create a new user profile
  static async createProfile(userId: string, email: string, role: string = 'patient'): Promise<UserProfile> {
    try {
      console.log('Creating profile for user:', { userId, email, role });
      
      const profileData: UserProfileInsert = {
        id: userId,
        email: email,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('users')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Create profile error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Profile created successfully:', data?.email);
      return data;
    } catch (error) {
      console.error('Create profile exception:', error);
      throw error;
    }
  }

  // Get current user profile (combines auth user + profile data)
  static async getCurrentUserProfile(): Promise<UserProfile | null> {
    try {
      console.log('Getting current user profile...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Get user error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }
      
      if (!user) {
        console.log('No authenticated user found');
        return null;
      }

      console.log('Authenticated user found:', user.email, 'ID:', user.id);

      // Try to fetch existing profile
      let profile = await this.fetchUserProfile(user.id);

      // If no profile exists, create one
      if (!profile && user.email) {
        console.log('Creating new user profile for:', user.email);
        profile = await this.createProfile(user.id, user.email, 'patient');
      }

      return profile;
    } catch (error) {
      console.error('Get current user profile exception:', error);
      throw error;
    }
  }

  // Update user profile
  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    try {
      console.log('Updating user profile:', userId, updates);
      
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Update user profile error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('User profile updated successfully');
      return data;
    } catch (error) {
      console.error('Update user profile exception:', error);
      throw error;
    }
  }

  // Fetch all tasks for the current user
  static async fetchTasks(): Promise<CareTask[]> {
    try {
      console.log('Fetching tasks for current user...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Get user for tasks error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('Fetching tasks for user ID:', user.id);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch tasks error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Tasks fetched successfully, count:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch tasks exception:', error);
      throw error;
    }
  }

  // Fetch tasks for a specific patient (used by providers)
  static async fetchTasksForPatient(patientId: string): Promise<CareTask[]> {
    try {
      console.log('Fetching tasks for patient:', patientId);
      
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', patientId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Fetch patient tasks error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Patient tasks fetched successfully, count:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch patient tasks exception:', error);
      throw error;
    }
  }

  // Upsert (insert or update) a task using Supabase's native upsert
  static async upsertTask(task: CareTask): Promise<CareTask> {
    try {
      console.log('Upserting task:', task.id, task.title);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Get user for upsert error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare task data for upsert - use CareTaskInsert type for better type safety
      const taskData: CareTaskInsert = {
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: task.user_id || user.id,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tasks')
        .upsert(taskData, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error('Upsert task error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Task upserted successfully');
      return data;
    } catch (error) {
      console.error('Upsert task exception:', error);
      throw error;
    }
  }

  // Sync multiple tasks to Supabase
  static async syncTasks(tasks: CareTask[]): Promise<CareTask[]> {
    try {
      console.log('Syncing tasks, count:', tasks.length);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Get user for sync error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare tasks data for upsert
      const tasksWithUserId: CareTaskInsert[] = tasks.map(task => ({
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: task.user_id || user.id,
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from('tasks')
        .upsert(tasksWithUserId, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('Sync tasks error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Tasks synced successfully, count:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Sync tasks exception:', error);
      throw error;
    }
  }

  // Delete a task
  static async deleteTask(taskId: string): Promise<void> {
    try {
      console.log('Deleting task:', taskId);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Get user for delete error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Delete task error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Delete task exception:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      console.log('Checking authentication status...');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Authentication check error details:', {
          message: error.message,
          name: error.name,
          status: error.status
        });
        
        // Don't throw on auth session missing - just return false
        if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          console.log('Auth session missing - user not authenticated');
          return false;
        }
        
        throw error;
      }
      
      const isAuth = !!user;
      console.log('Authentication status:', isAuth, user?.email || 'no user');
      return isAuth;
    } catch (error) {
      console.error('Authentication check exception:', error);
      return false;
    }
  }

  // Get current user
  static async getCurrentUser() {
    try {
      console.log('Getting current user...');
      
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Get current user error details:', {
          message: error.message,
          name: error.name,
          status: error.status
        });
        
        // Don't throw on auth session missing - just return null
        if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          console.log('Auth session missing - no current user');
          return null;
        }
        
        throw error;
      }
      
      console.log('Current user:', user?.email || 'no user', 'ID:', user?.id || 'no ID');
      return user;
    } catch (error) {
      console.error('Get current user exception:', error);
      return null;
    }
  }

  // Sign out - with graceful handling of AuthSessionMissingError
  static async signOut(): Promise<void> {
    try {
      console.log('Attempting to sign out...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error details:', {
          message: error.message,
          name: error.name,
          status: error.status
        });
        
        // Check if this is an AuthSessionMissingError
        if (error.message?.includes('Auth session missing') || error.name === 'AuthSessionMissingError') {
          // This is expected when the session is already invalid
          console.warn('Auth session was already missing during sign out - user is effectively signed out');
          return;
        }
        
        throw error;
      }
      
      console.log('Sign out successful');
    } catch (error) {
      // Handle the case where the error is thrown directly (not in the response)
      if (error instanceof Error && (
        error.message?.includes('Auth session missing') || 
        error.name === 'AuthSessionMissingError'
      )) {
        console.warn('Auth session was already missing during sign out - user is effectively signed out');
        return;
      }
      
      console.error('Sign out exception:', error);
      throw error;
    }
  }

  // ===== CARE RELATIONSHIP METHODS =====

  // Add a patient to a provider's care list
  static async addPatientToProvider(providerId: string, patientId: string): Promise<CareRelationship> {
    try {
      console.log('Adding patient to provider:', { providerId, patientId });
      
      const relationshipData: CareRelationshipInsert = {
        provider_id: providerId,
        patient_id: patientId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('care_relationships')
        .insert(relationshipData)
        .select()
        .single();

      if (error) {
        console.error('Add patient to provider error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Patient added to provider successfully');
      return data;
    } catch (error) {
      console.error('Add patient to provider exception:', error);
      throw error;
    }
  }

  // Get all patients for a specific provider
  static async getPatientsForProvider(providerId: string): Promise<UserProfile[]> {
    try {
      console.log('Getting patients for provider:', providerId);
      
      // First get the care relationships
      const { data: relationships, error: relationshipsError } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('provider_id', providerId);

      if (relationshipsError) {
        console.error('Get patient relationships error details:', {
          message: relationshipsError.message,
          code: relationshipsError.code,
          details: relationshipsError.details,
          hint: relationshipsError.hint
        });
        throw relationshipsError;
      }

      if (!relationships || relationships.length === 0) {
        console.log('No patient relationships found for provider');
        return [];
      }

      // Extract patient IDs
      const patientIds = relationships.map(rel => rel.patient_id);
      console.log('Found patient IDs:', patientIds);

      // Then get the user profiles for those patient IDs
      const { data: patients, error: patientsError } = await supabase
        .from('users')
        .select('*')
        .in('id', patientIds);

      if (patientsError) {
        console.error('Get patient profiles error details:', {
          message: patientsError.message,
          code: patientsError.code,
          details: patientsError.details,
          hint: patientsError.hint
        });
        throw patientsError;
      }

      console.log('Patients fetched successfully, count:', patients?.length || 0);
      return patients || [];
    } catch (error) {
      console.error('Get patients for provider exception:', error);
      throw error;
    }
  }

  // Get all providers for a specific patient
  static async getProvidersForPatient(patientId: string): Promise<UserProfile[]> {
    try {
      console.log('Getting providers for patient:', patientId);
      
      // First get the care relationships
      const { data: relationships, error: relationshipsError } = await supabase
        .from('care_relationships')
        .select('provider_id')
        .eq('patient_id', patientId);

      if (relationshipsError) {
        console.error('Get provider relationships error details:', {
          message: relationshipsError.message,
          code: relationshipsError.code,
          details: relationshipsError.details,
          hint: relationshipsError.hint
        });
        throw relationshipsError;
      }

      if (!relationships || relationships.length === 0) {
        console.log('No provider relationships found for patient');
        return [];
      }

      // Extract provider IDs
      const providerIds = relationships.map(rel => rel.provider_id);
      console.log('Found provider IDs:', providerIds);

      // Then get the user profiles for those provider IDs
      const { data: providers, error: providersError } = await supabase
        .from('users')
        .select('*')
        .in('id', providerIds);

      if (providersError) {
        console.error('Get provider profiles error details:', {
          message: providersError.message,
          code: providersError.code,
          details: providersError.details,
          hint: providersError.hint
        });
        throw providersError;
      }

      console.log('Providers fetched successfully, count:', providers?.length || 0);
      return providers || [];
    } catch (error) {
      console.error('Get providers for patient exception:', error);
      throw error;
    }
  }

  // Remove a patient from a provider's care list
  static async removePatientFromProvider(providerId: string, patientId: string): Promise<void> {
    try {
      console.log('Removing patient from provider:', { providerId, patientId });
      
      const { error } = await supabase
        .from('care_relationships')
        .delete()
        .eq('provider_id', providerId)
        .eq('patient_id', patientId);

      if (error) {
        console.error('Remove patient from provider error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Patient removed from provider successfully');
    } catch (error) {
      console.error('Remove patient from provider exception:', error);
      throw error;
    }
  }

  // Create a task for a specific patient (used by providers)
  static async createTaskForPatient(
    patientId: string, 
    taskData: Omit<CareTaskInsert, 'user_id'>
  ): Promise<CareTask> {
    try {
      console.log('Creating task for patient:', patientId, taskData.title);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('Get user for create task error details:', {
          message: userError.message,
          name: userError.name,
          status: userError.status
        });
        throw userError;
      }

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Prepare task data with the patient's user_id
      const taskDataWithUserId: CareTaskInsert = {
        ...taskData,
        user_id: patientId,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskDataWithUserId)
        .select()
        .single();

      if (error) {
        console.error('Create task for patient error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Task created for patient successfully');
      return data;
    } catch (error) {
      console.error('Create task for patient exception:', error);
      throw error;
    }
  }

  // Fetch all tasks for patients under a provider's care
  static async fetchTasksForProvider(providerId: string): Promise<CareTask[]> {
    try {
      console.log('Fetching tasks for provider:', providerId);
      
      // First get patient IDs for this provider
      const { data: relationships, error: relationshipsError } = await supabase
        .from('care_relationships')
        .select('patient_id')
        .eq('provider_id', providerId);

      if (relationshipsError) {
        console.error('Get patient relationships for tasks error details:', {
          message: relationshipsError.message,
          code: relationshipsError.code,
          details: relationshipsError.details,
          hint: relationshipsError.hint
        });
        throw relationshipsError;
      }

      if (!relationships || relationships.length === 0) {
        console.log('No patient relationships found for provider tasks');
        return [];
      }

      // Extract patient IDs
      const patientIds = relationships.map(rel => rel.patient_id);
      console.log('Fetching tasks for patient IDs:', patientIds);

      // Then get tasks for those patients
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('user_id', patientIds)
        .order('created_at', { ascending: true });

      if (tasksError) {
        console.error('Fetch tasks for provider error details:', {
          message: tasksError.message,
          code: tasksError.code,
          details: tasksError.details,
          hint: tasksError.hint
        });
        throw tasksError;
      }

      console.log('Tasks fetched for provider successfully, count:', tasks?.length || 0);
      return tasks || [];
    } catch (error) {
      console.error('Fetch tasks for provider exception:', error);
      throw error;
    }
  }

  // Search for users by email (for providers to find patients)
  static async searchUsersByEmail(email: string): Promise<UserProfile[]> {
    try {
      console.log('Searching users by email:', email);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('email', `%${email}%`)
        .eq('role', 'patient')
        .limit(10);

      if (error) {
        console.error('Search users by email error details:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      console.log('Users search completed, count:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Search users by email exception:', error);
      throw error;
    }
  }
}