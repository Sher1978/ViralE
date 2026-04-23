import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function verifyArchiveLogic() {
  console.log('📦 Verifying Archive/Restore Logic...\n');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env.local (Service role required)');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 1. Verify Ideas Archive
  console.log('💡 Testing Idea Archival...');
  const { data: idea, error: ideaFetchError } = await supabase
    .from('ideation_feed')
    .select('id, status')
    .limit(1)
    .single();

  if (ideaFetchError) {
    console.warn('⚠️ No ideas found to test archival.');
  } else {
    const originalStatus = idea.status;
    const testStatus = originalStatus === 'archived' ? 'new' : 'archived';
    
    console.log(`🔄 Toggling idea ${idea.id} from [${originalStatus}] to [${testStatus}]...`);
    
    const { data: updatedIdea, error: updateError } = await supabase
      .from('ideation_feed')
      .update({ status: testStatus })
      .eq('id', idea.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Idea update failed:', updateError.message);
    } else {
      console.log(`✅ Idea updated. Current status: ${updatedIdea.status}`);
      // Restore back for consistency
      await supabase.from('ideation_feed').update({ status: originalStatus }).eq('id', idea.id);
      console.log(`♻️ Restored idea status to [${originalStatus}].`);
    }
  }

  // 2. Verify Projects Archive
  console.log('\n📁 Testing Project Archival...');
  const { data: project, error: projectFetchError } = await supabase
    .from('projects')
    .select('id, status')
    .limit(1)
    .single();

  if (projectFetchError) {
    console.warn('⚠️ No projects found to test archival.');
  } else {
    const originalStatus = project.status;
    const testStatus = originalStatus === 'archived' ? 'completed' : 'archived';
    
    console.log(`🔄 Toggling project ${project.id} from [${originalStatus}] to [${testStatus}]...`);
    
    const { data: updatedProject, error: projectUpdateError } = await supabase
      .from('projects')
      .update({ status: testStatus })
      .eq('id', project.id)
      .select()
      .single();

    if (projectUpdateError) {
      console.error('❌ Project update failed:', projectUpdateError.message);
    } else {
      console.log(`✅ Project updated. Current status: ${updatedProject.status}`);
      // Restore back
      await supabase.from('projects').update({ status: originalStatus }).eq('id', project.id);
      console.log(`♻️ Restored project status to [${originalStatus}].`);
    }
  }

  // 3. Verify Projects GET with comma-separated status (using Service Role to bypass RLS)
  console.log('\n📡 Testing API GET filter logic (simulation)...');
  const activeStatuses = ['ideation', 'scripting', 'storyboard', 'rendering'];
  const { data: activeProjects, error: filterError } = await supabase
    .from('projects')
    .select('id, status')
    .in('status', activeStatuses)
    .limit(5);

  if (filterError) {
    console.error('❌ Filter query failed:', filterError.message);
  } else {
    console.log(`✅ Filtered ${activeProjects.length} active projects.`);
    activeProjects.forEach(p => console.log(` - Project ${p.id}: ${p.status}`));
  }

  console.log('\n🏁 Archive Verification Complete.');
}

verifyArchiveLogic().catch(console.error);
