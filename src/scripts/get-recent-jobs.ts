import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getRecentJobs() {
  const { data, error } = await supabase
    .from('render_jobs')
    .select('id, project_id, status, progress, error_log, created_at, config_json')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('Error fetching jobs:', error);
  } else {
    console.log('Recent Jobs:');
    data.forEach((job, idx) => {
      console.log(`\n--- Job #${idx + 1} ---`);
      console.log(`ID: ${job.id}`);
      console.log(`Project ID: ${job.project_id}`);
      console.log(`Status: ${job.status}`);
      console.log(`Progress: ${job.progress}%`);
      console.log(`Created At: ${job.created_at}`);
      console.log(`Error Log: ${job.error_log}`);
      console.log(`Config Keys:`, Object.keys(job.config_json || {}));
      if (job.config_json?.script) {
        console.log(`Script Keys:`, Object.keys(job.config_json.script));
      }
    });
  }
}

getRecentJobs();
