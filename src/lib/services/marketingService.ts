import { supabase } from '../supabase';

export interface SocialAssetPackage {
  id: string;
  project_id: string;
  gallery_images: string[]; // 6 images
  cover_image: string;
  description: string;
  hashtags: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export const marketingService = {
  /**
   * Generates a complete social media package for a project
   */
  async generatePackage(projectId: string, manifest: any): Promise<SocialAssetPackage> {
    console.log(`[Marketing] Generating social package for project: ${projectId}`);
    
    // 1. Create entry in DB
    const { data: pkg, error } = await supabase
      .from('marketing_packages')
      .insert({
        project_id: projectId,
        status: 'pending',
        metadata: { source: 'studio_render' }
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Start workers (In production, these would be edge functions or background jobs)
    // For this implementation, we simulate the parallel generation
    this.processGeneration(pkg.id, projectId, manifest);

    return pkg;
  },

  /**
   * Simulated background process for generating assets
   */
  async processGeneration(packageId: string, projectId: string, manifest: any) {
    await supabase.from('marketing_packages').update({ status: 'processing' }).eq('id', packageId);

    try {
      // Simulate Image Logic (6 gallery + 1 cover)
      const images = Array.from({ length: 7 }).map((_, i) => 
        `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800&index=${i}`
      );

      // Simulate Description Logic
      const description = `🚀 Transforming the future of content with Viral Studio! \n\nCheck out this amazing production powered by AI. From script to screen in seconds. \n\n#AI #ContentCreation #ViralStudio #FutureTech`;

      // Update DB with results
      await supabase
        .from('marketing_packages')
        .update({
          status: 'completed',
          gallery_images: images.slice(0, 6),
          cover_image: images[6],
          description: description,
          hashtags: ['AI', 'ContentCreation', 'ViralStudio', 'FutureTech'],
          completed_at: new Date().toISOString()
        })
        .eq('id', packageId);

      console.log(`[Marketing] Package ${packageId} generated successfully.`);
    } catch (error) {
      console.error(`[Marketing] Generation failed for ${packageId}:`, error);
      await supabase.from('marketing_packages').update({ status: 'failed' }).eq('id', packageId);
    }
  },

  /**
   * Fetches the marketing package for a project
   */
  async getPackage(projectId: string): Promise<SocialAssetPackage | null> {
    const { data, error } = await supabase
      .from('marketing_packages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};
