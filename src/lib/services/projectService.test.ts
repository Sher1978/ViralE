import { describe, it, expect, vi } from 'vitest';
import { projectService } from './projectService';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: { id: 'parent-id', title: 'Parent Project' },
            error: null
          }),
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'v1', script_data: { hook: 'Parent Hook' } }],
              error: null
            })
          }))
        })),
        order: vi.fn(() => ({
          ascending: vi.fn(() => ({
            data: [], error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: 'new-id' }, error: null })
        }))
      }))
    }))
  }
}));

describe('ProjectService Iteration', () => {
  it('should fetch parent project data correctly', async () => {
    const project = await projectService.getProject('parent-id');
    expect(project?.title).toBe('Parent Project');
  });

  it('should get latest version for iteration', async () => {
    const version = await projectService.getLatestVersion('parent-id');
    expect(version?.script_data.hook).toBe('Parent Hook');
  });
});
