import { SupabaseClient } from '@supabase/supabase-js';
import { deductCredits, CREDIT_COSTS } from './credits';

export interface RenderConfig {
  resolution: string;
  fps: number;
  quality: 'draft' | 'high';
  avatar_mode?: string;
  animation_tier?: string;
  asset_id?: string;
  ai_look_polish?: boolean;
}

export async function createRenderJob(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  versionId: string,
  type: 'preview' | 'pro' = 'preview',
  avatarConfig?: {
    mode: string;
    tier: string;
    assetId: string | null;
    aiPolish: boolean;
    recordedAssetId?: string | null;
  }
) {
  const cost = type === 'preview' ? CREDIT_COSTS.RENDER_PREVIEW : CREDIT_COSTS.PRO_RENDER;

  // Render job configuration based on tier and type
  const settings: RenderConfig = type === 'preview' 
    ? { resolution: '720x1280', fps: 24, quality: 'draft' }
    : { resolution: '1080x1920', fps: 30, quality: 'high' };

  if (avatarConfig) {
    settings.avatar_mode = avatarConfig.mode;
    settings.animation_tier = avatarConfig.tier;
    settings.asset_id = avatarConfig.assetId || undefined;
    settings.ai_look_polish = avatarConfig.aiPolish;
    (settings as any).recorded_asset_id = avatarConfig.recordedAssetId;
  }

  // 1. Deduct Credits
  await deductCredits(supabase, userId, cost, 'RENDER', projectId);

  // 2. Fetch Version Data (Script JSON)
  const { data: version, error: versionError } = await supabase
    .from('project_versions')
    .select('script_data')
    .eq('id', versionId)
    .single();

  if (versionError) throw versionError;

  // 3. Create Job entry with all metadata
  const { data: job, error: jobError } = await supabase
    .from('render_jobs')
    .insert({
      user_id: userId,
      project_id: projectId,
      version_id: versionId,
      render_type: type,
      status: 'pending',
      config_json: {
        script: version.script_data,
        settings
      }
    })
    .select()
    .single();

  if (jobError) throw jobError;

  // 4. Update Project Status to 'rendering'
  await supabase
    .from('projects')
    .update({ 
      status: 'rendering',
      avatar_mode: avatarConfig?.mode,
      animation_tier: avatarConfig?.tier,
      selected_asset_id: avatarConfig?.assetId,
      ai_look_polish: avatarConfig?.aiPolish
    })
    .eq('id', projectId);

  return job;
}

export async function getRenderStatus(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from('render_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}
