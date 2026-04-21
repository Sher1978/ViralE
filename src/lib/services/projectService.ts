import { supabase } from '../supabase';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  status: 'ideation' | 'scripting' | 'storyboard' | 'rendering' | 'completed' | 'error';
  input_source?: string;
  final_video_url?: string;
  metadata: any;
  config_json?: any;
  created_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  script_data: any;
  storyboard_data?: any;
  version_label?: string;
  preview_url?: string;
  created_at: string;
}

export const projectService = {
  async listProjects(userId: string): Promise<Project[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing projects:', error);
      return [];
    }
    return data;
  },

  async createProject(params: { userId: string, title: string, inputSource?: string }): Promise<Project | null> {
    const { userId, title, inputSource } = params;
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          user_id: userId,
          title,
          input_source: inputSource,
          status: 'ideation',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      return null;
    }
    return data;
  },

  async getProject(projectId: string): Promise<Project | null> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return null;
    }
    return data;
  },

  async getLatestVersion(projectId: string): Promise<ProjectVersion | null> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }
    return data[0];
  },

  async getVersion(versionId: string): Promise<ProjectVersion | null> {
    const { data, error } = await supabase
      .from('project_versions')
      .select('*')
      .eq('id', versionId)
      .single();

    if (error) {
      console.error('Error fetching version:', error);
      return null;
    }
    return data;
  },

  async createVersion(params: { projectId: string; scriptData: any; storyboardData?: any; previewUrl?: string }): Promise<ProjectVersion | null> {
    const { projectId, scriptData, storyboardData, previewUrl } = params;
    const { data, error } = await supabase
      .from('project_versions')
      .insert([
        {
          project_id: projectId,
          script_data: scriptData,
          storyboard_data: storyboardData,
          preview_url: previewUrl,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating version:', error);
      return null;
    }
    return data;
  },

  async updateProjectStatus(projectId: string, status: Project['status']): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update({ status })
      .eq('id', projectId);

    if (error) {
      console.error('Error updating project status:', error);
      return false;
    }
    return true;
  },

  async updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', projectId);

    if (error) {
      console.error('Error updating project:', error);
      return false;
    }
    return true;
  }
};
