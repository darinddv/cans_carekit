import { supabase, Database } from './supabase';

// Types for symptom tracking
export type SymptomCategory = Database['public']['Tables']['symptom_categories']['Row'];
export type SymptomLog = Database['public']['Tables']['symptom_logs']['Row'];
export type SymptomLogInsert = Database['public']['Tables']['symptom_logs']['Insert'];
export type SymptomLogUpdate = Database['public']['Tables']['symptom_logs']['Update'];

export type AssessmentTemplate = Database['public']['Tables']['assessment_templates']['Row'];
export type AssessmentResponse = Database['public']['Tables']['assessment_responses']['Row'];
export type AssessmentResponseInsert = Database['public']['Tables']['assessment_responses']['Insert'];

// Additional types for UI
export interface SymptomLogWithCategory extends SymptomLog {
  category: SymptomCategory;
}

export interface SymptomTrend {
  category: string;
  averageSeverity: number;
  trend: 'improving' | 'stable' | 'worsening';
  changePercent: number;
  logs: SymptomLog[];
}

export interface AssessmentQuestion {
  id: string;
  question: string;
  type: 'scale' | 'multiple_choice' | 'checkbox' | 'text';
  scale?: {
    min: number;
    max: number;
    labels: Record<string, string>;
  };
  options?: string[];
}

export class SymptomService {
  // Get all active symptom categories
  static async getSymptomCategories(): Promise<SymptomCategory[]> {
    try {
      console.log('Fetching symptom categories...');
      
      const { data, error } = await supabase
        .from('symptom_categories')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Fetch symptom categories error:', error);
        throw error;
      }

      console.log('Symptom categories fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch symptom categories exception:', error);
      throw error;
    }
  }

  // Log a new symptom
  static async logSymptom(symptomData: Omit<SymptomLogInsert, 'user_id'>): Promise<SymptomLog> {
    try {
      console.log('Logging symptom:', symptomData);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const logData: SymptomLogInsert = {
        ...symptomData,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('symptom_logs')
        .insert(logData)
        .select()
        .single();

      if (error) {
        console.error('Log symptom error:', error);
        throw error;
      }

      console.log('Symptom logged successfully');
      return data;
    } catch (error) {
      console.error('Log symptom exception:', error);
      throw error;
    }
  }

  // Get symptom logs for current user
  static async getSymptomLogs(days: number = 30): Promise<SymptomLogWithCategory[]> {
    try {
      console.log(`Fetching symptom logs for ${days} days...`);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('symptom_logs')
        .select(`
          *,
          category:symptom_categories(*)
        `)
        .eq('user_id', user.id)
        .gte('logged_at', startDate.toISOString())
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('Fetch symptom logs error:', error);
        throw error;
      }

      console.log('Symptom logs fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch symptom logs exception:', error);
      throw error;
    }
  }

  // Get symptom logs for a specific patient (used by providers)
  static async getSymptomLogsForPatient(patientId: string, days: number = 30): Promise<SymptomLogWithCategory[]> {
    try {
      console.log(`Fetching symptom logs for patient ${patientId} for ${days} days...`);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('symptom_logs')
        .select(`
          *,
          category:symptom_categories(*)
        `)
        .eq('user_id', patientId)
        .gte('logged_at', startDate.toISOString())
        .order('logged_at', { ascending: false });

      if (error) {
        console.error('Fetch patient symptom logs error:', error);
        throw error;
      }

      console.log('Patient symptom logs fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch patient symptom logs exception:', error);
      throw error;
    }
  }

  // Get symptom trends for a specific patient (used by providers)
  static async getSymptomTrendsForPatient(patientId: string, days: number = 30): Promise<SymptomTrend[]> {
    try {
      console.log(`Calculating symptom trends for patient ${patientId} for ${days} days...`);
      
      const logs = await this.getSymptomLogsForPatient(patientId, days);
      const categories = await this.getSymptomCategories();
      
      const trends: SymptomTrend[] = [];

      for (const category of categories) {
        const categoryLogs = logs.filter(log => log.category_id === category.id);
        
        if (categoryLogs.length === 0) continue;

        // Calculate average severity
        const averageSeverity = categoryLogs.reduce((sum, log) => sum + log.severity, 0) / categoryLogs.length;

        // Calculate trend (compare first half vs second half of period)
        const midPoint = Math.floor(categoryLogs.length / 2);
        const recentLogs = categoryLogs.slice(0, midPoint);
        const olderLogs = categoryLogs.slice(midPoint);

        let trend: 'improving' | 'stable' | 'worsening' = 'stable';
        let changePercent = 0;

        if (recentLogs.length > 0 && olderLogs.length > 0) {
          const recentAvg = recentLogs.reduce((sum, log) => sum + log.severity, 0) / recentLogs.length;
          const olderAvg = olderLogs.reduce((sum, log) => sum + log.severity, 0) / olderLogs.length;
          
          changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          if (changePercent > 10) {
            trend = 'worsening';
          } else if (changePercent < -10) {
            trend = 'improving';
          }
        }

        trends.push({
          category: category.name,
          averageSeverity,
          trend,
          changePercent,
          logs: categoryLogs,
        });
      }

      console.log('Patient symptom trends calculated successfully:', trends.length);
      return trends;
    } catch (error) {
      console.error('Get patient symptom trends exception:', error);
      throw error;
    }
  }

  // Update a symptom log
  static async updateSymptomLog(id: string, updates: SymptomLogUpdate): Promise<SymptomLog> {
    try {
      console.log('Updating symptom log:', id, updates);
      
      const { data, error } = await supabase
        .from('symptom_logs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update symptom log error:', error);
        throw error;
      }

      console.log('Symptom log updated successfully');
      return data;
    } catch (error) {
      console.error('Update symptom log exception:', error);
      throw error;
    }
  }

  // Delete a symptom log
  static async deleteSymptomLog(id: string): Promise<void> {
    try {
      console.log('Deleting symptom log:', id);
      
      const { error } = await supabase
        .from('symptom_logs')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete symptom log error:', error);
        throw error;
      }

      console.log('Symptom log deleted successfully');
    } catch (error) {
      console.error('Delete symptom log exception:', error);
      throw error;
    }
  }

  // Get symptom trends
  static async getSymptomTrends(days: number = 30): Promise<SymptomTrend[]> {
    try {
      console.log(`Calculating symptom trends for ${days} days...`);
      
      const logs = await this.getSymptomLogs(days);
      const categories = await this.getSymptomCategories();
      
      const trends: SymptomTrend[] = [];

      for (const category of categories) {
        const categoryLogs = logs.filter(log => log.category_id === category.id);
        
        if (categoryLogs.length === 0) continue;

        // Calculate average severity
        const averageSeverity = categoryLogs.reduce((sum, log) => sum + log.severity, 0) / categoryLogs.length;

        // Calculate trend (compare first half vs second half of period)
        const midPoint = Math.floor(categoryLogs.length / 2);
        const recentLogs = categoryLogs.slice(0, midPoint);
        const olderLogs = categoryLogs.slice(midPoint);

        let trend: 'improving' | 'stable' | 'worsening' = 'stable';
        let changePercent = 0;

        if (recentLogs.length > 0 && olderLogs.length > 0) {
          const recentAvg = recentLogs.reduce((sum, log) => sum + log.severity, 0) / recentLogs.length;
          const olderAvg = olderLogs.reduce((sum, log) => sum + log.severity, 0) / olderLogs.length;
          
          changePercent = ((recentAvg - olderAvg) / olderAvg) * 100;
          
          if (changePercent > 10) {
            trend = 'worsening';
          } else if (changePercent < -10) {
            trend = 'improving';
          }
        }

        trends.push({
          category: category.name,
          averageSeverity,
          trend,
          changePercent,
          logs: categoryLogs,
        });
      }

      console.log('Symptom trends calculated successfully:', trends.length);
      return trends;
    } catch (error) {
      console.error('Get symptom trends exception:', error);
      throw error;
    }
  }

  // Get assessment templates
  static async getAssessmentTemplates(): Promise<AssessmentTemplate[]> {
    try {
      console.log('Fetching assessment templates...');
      
      const { data, error } = await supabase
        .from('assessment_templates')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Fetch assessment templates error:', error);
        throw error;
      }

      console.log('Assessment templates fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch assessment templates exception:', error);
      throw error;
    }
  }

  // Submit assessment response
  static async submitAssessmentResponse(
    templateId: string, 
    responses: Record<string, any>
  ): Promise<AssessmentResponse> {
    try {
      console.log('Submitting assessment response:', templateId, responses);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      // Calculate score based on responses (simple implementation)
      const score = this.calculateAssessmentScore(responses);

      const responseData: AssessmentResponseInsert = {
        user_id: user.id,
        template_id: templateId,
        responses,
        score,
      };

      const { data, error } = await supabase
        .from('assessment_responses')
        .insert(responseData)
        .select()
        .single();

      if (error) {
        console.error('Submit assessment response error:', error);
        throw error;
      }

      console.log('Assessment response submitted successfully');
      return data;
    } catch (error) {
      console.error('Submit assessment response exception:', error);
      throw error;
    }
  }

  // Get assessment responses for current user
  static async getAssessmentResponses(days: number = 30): Promise<AssessmentResponse[]> {
    try {
      console.log(`Fetching assessment responses for ${days} days...`);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('assessment_responses')
        .select('*')
        .eq('user_id', user.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: false });

      if (error) {
        console.error('Fetch assessment responses error:', error);
        throw error;
      }

      console.log('Assessment responses fetched successfully:', data?.length || 0);
      return data || [];
    } catch (error) {
      console.error('Fetch assessment responses exception:', error);
      throw error;
    }
  }

  // Calculate assessment score (simple implementation)
  private static calculateAssessmentScore(responses: Record<string, any>): number {
    let totalScore = 0;
    let questionCount = 0;

    for (const [key, value] of Object.entries(responses)) {
      if (typeof value === 'number') {
        totalScore += value;
        questionCount++;
      } else if (Array.isArray(value)) {
        totalScore += value.length;
        questionCount++;
      } else if (typeof value === 'string') {
        // Simple scoring for text responses
        totalScore += value.length > 0 ? 5 : 0;
        questionCount++;
      }
    }

    return questionCount > 0 ? Math.round((totalScore / questionCount) * 10) : 0;
  }

  // Get common triggers from user's logs
  static async getCommonTriggers(): Promise<string[]> {
    try {
      const logs = await this.getSymptomLogs(90); // Last 3 months
      const triggerCounts: Record<string, number> = {};

      logs.forEach(log => {
        if (log.triggers) {
          log.triggers.forEach(trigger => {
            triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1;
          });
        }
      });

      // Return top 10 most common triggers
      return Object.entries(triggerCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([trigger]) => trigger);
    } catch (error) {
      console.error('Get common triggers exception:', error);
      return [];
    }
  }

  // Get common coping strategies from user's logs
  static async getCommonCopingStrategies(): Promise<string[]> {
    try {
      const logs = await this.getSymptomLogs(90); // Last 3 months
      const strategyCounts: Record<string, number> = {};

      logs.forEach(log => {
        if (log.coping_strategies) {
          log.coping_strategies.forEach(strategy => {
            strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
          });
        }
      });

      // Return top 10 most common strategies
      return Object.entries(strategyCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([strategy]) => strategy);
    } catch (error) {
      console.error('Get common coping strategies exception:', error);
      return [];
    }
  }
}