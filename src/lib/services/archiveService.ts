import { createClient } from '@supabase/supabase-js';
import { telegramService } from '../telegram';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Use admin client for archival tasks
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export const archiveService = {
  /**
   * Identifies products older than 3 days and archives them.
   */
  async runArchivalProcess() {
    console.log('[ArchiveService] Starting archival process...');
    
    // 1. Calculate the 3-day cutoff
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 2. Fetch completed projects older than 3 days that hasn't been archived yet
    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        user:profiles(telegram_id, full_name)
      `)
      .eq('status', 'completed')
      .is('archived_at', null)
      .lt('updated_at', threeDaysAgo.toISOString());

    if (error) {
      console.error('[ArchiveService] Error fetching old projects:', error);
      return { success: false, error };
    }

    console.log(`[ArchiveService] Found ${projects?.length || 0} projects to archive.`);

    const results = [];

    for (const project of projects || []) {
      try {
        const telegramId = project.user?.telegram_id;
        const videoUrl = project.final_video_url;

        if (!telegramId) {
          console.warn(`[ArchiveService] Project ${project.id} has no telegram_id for user. Skipping.`);
          continue;
        }

        if (!videoUrl) {
          console.warn(`[ArchiveService] Project ${project.id} has no final_video_url. skipping.`);
          continue;
        }

        // 3. Send to Telegram
        console.log(`[ArchiveService] Archiving project ${project.id} to Telegram User ${telegramId}`);
        
        const caption = `📁 *Archived Project: ${project.title}*\n\nThis video has been stored in your personal Viral Studio archive (Telegram) and removed from our active servers to save space.\n\nKeep creating! 🚀`;
        
        const tgRes = await telegramService.sendVideo(telegramId, videoUrl, caption);

        if (tgRes.ok) {
          // 4. Update project status in DB
          const { error: updateError } = await supabaseAdmin
            .from('projects')
            .update({
              status: 'archived',
              archived_at: new Date().toISOString(),
              archived_location: 'telegram',
              final_telegram_file_id: tgRes.result?.video?.file_id
            })
            .eq('id', project.id);

          if (updateError) {
            console.error(`[ArchiveService] Error updating project ${project.id} after archival:`, updateError);
          } else {
            console.log(`[ArchiveService] Project ${project.id} archived successfully.`);
            
            // 5. TODO: Delete from Supabase Storage if needed
            // This requires parsing the final_video_url to get the bucket and path
            // For now, we've set the status to 'archived'.
          }
          
          results.push({ id: project.id, success: true });
        } else {
          console.error(`[ArchiveService] Telegram delivery failed for ${project.id}:`, tgRes.description);
          results.push({ id: project.id, success: false, error: tgRes.description });
        }

      } catch (err) {
        console.error(`[ArchiveService] Unexpected error processing project ${project.id}:`, err);
        results.push({ id: project.id, success: false, error: String(err) });
      }
    }

    return { success: true, processed: results.length, details: results };
  }
};
