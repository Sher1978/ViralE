import { projectService } from '../src/lib/services/projectService';
// Note: This script is intended to be run in a context where supabase env vars are set
// or via vitest mocks.

async function testIteration() {
  console.log('--- Testing Project Iteration Logic ---');
  
  // 1. Mocking a parent project ID (you'd replace this with a real one for manual run)
  const parentId = 'test-parent-id';
  
  try {
    const parentProj = await projectService.getProject(parentId);
    console.log('Parent Project:', parentProj ? 'Found' : 'Not Found');
    
    const latestVer = await projectService.getLatestVersion(parentId);
    console.log('Latest Version:', latestVer ? 'Found' : 'Not Found');
    
    if (latestVer?.script_data) {
      console.log('Script Data snippet:', JSON.stringify(latestVer.script_data).substring(0, 100));
    }
  } catch (err) {
    console.error('Iteration test failed:', err);
  }
}

// If running directly
if (require.main === module) {
  testIteration();
}
