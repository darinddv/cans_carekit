import { supabase } from './supabase';

export interface CareTask {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
}

export class SupabaseService {
  // Fetch all tasks for the current user
  static async fetchTasks(): Promise<CareTask[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching tasks from Supabase:', error);
      throw error;
    }
  }

  // Upsert (insert or update) a task
  static async upsertTask(task: CareTask): Promise<CareTask> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const taskData = {
        id: task.id,
        title: task.title,
        time: task.time,
        completed: task.completed,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // First try to update the existing task
      const { data: existingTask } = await supabase
        .from('tasks')
        .select('id')
        .eq('id', task.id)
        .eq('user_id', user.id)
        .single();

      if (existingTask) {
        // Task exists, update it
        const { data, error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            time: taskData.time,
            completed: taskData.completed,
            updated_at: taskData.updated_at,
          })
          .eq('id', taskData.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      } else {
        // Task doesn't exist, insert it
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            id: taskData.id,
            title: taskData.title,
            time: taskData.time,
            completed: taskData.completed,
            user_id: taskData.user_id,
            created_at: new Date().toISOString(),
            updated_at: taskData.updated_at,
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return data;
      }
    } catch (error) {
      console.error('Error upserting task to Supabase:', error);
      throw error;
    }
  }

  // Sync multiple tasks to Supabase
  static async syncTasks(tasks: CareTask[]): Promise<CareTask[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Process tasks one by one to avoid upsert issues
      const syncedTasks: CareTask[] = [];
      
      for (const task of tasks) {
        try {
          const syncedTask = await this.upsertTask(task);
          syncedTasks.push(syncedTask);
        } catch (error) {
          console.error(`Error syncing task ${task.id}:`, error);
          // Continue with other tasks even if one fails
        }
      }

      return syncedTasks;
    } catch (error) {
      console.error('Error syncing tasks to Supabase:', error);
      throw error;
    }
  }

  // Delete a task
  static async deleteTask(taskId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting task from Supabase:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return !!user;
    } catch (error) {
      return false;
    }
  }

  // Sign in anonymously (for demo purposes)
  static async signInAnonymously(): Promise<void> {
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing in anonymously:', error);
      throw error;
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }
}