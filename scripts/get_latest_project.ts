import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: Supabase config is missing from .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, updated_at, latest_version_id')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error || !projects || projects.length === 0) {
    console.error('Error fetching projects:', error);
    return;
  }

  const proj = projects[0];
  console.log(`Latest project: ID=${proj.id}, Name="${proj.name}", Updated=${proj.updated_at}`);

  // Fetch latest version manifest
  const { data: version, error: verError } = await supabase
    .from('project_versions')
    .select('id, manifest')
    .eq('project_id', proj.id)
    .order('created_at', { ascending: false })
    .limit(1);

  if (verError || !version || version.length === 0) {
    console.error('Error fetching version:', verError);
    return;
  }

  const manifest = version[0].manifest as any;
  console.log('Manifest loaded successfully!');
  
  const wclips = manifest?.whiteboardClips || [];
  console.log(`Found ${wclips.length} whiteboard clips in manifest:`);
  
  wclips.forEach((c: any, i: number) => {
    console.log(`\n--- Clip ${i+1} ---`);
    console.log(`ID: ${c.id}`);
    console.log(`Prompt: "${c.prompt}"`);
    console.log(`Trigger: "${c.spokenText || ''}"`);
    console.log(`Status: ${c.status}`);
    console.log(`Image URL: ${c.imageUrl}`);
    console.log(`Video URL: ${c.url}`);
    console.log(`Warning/Error: ${c.errorMsg || 'None'}`);
  });
}

run();
