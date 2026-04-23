import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailyIdeas } from '@/lib/ideation';

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { 
            digital_shadow_prompt: 'Test personality',
            industry_context: 'Test industry'
          },
          error: null
        }),
      })),
    })),
  })),
} as any;

// Mock Gemini AI
vi.mock('@/lib/ai/gemini', () => ({
  model: {
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          {
            topic_title: "Test Idea",
            rationale: "Test Rationale",
            viral_potential_score: 95
          }
        ])
      }
    })
  }
}));

describe('generateDailyIdeas', () => {
  it('should generate 3 ideas and return them as an array', async () => {
    const ideas = await generateDailyIdeas(mockSupabase, 'test-user', 'en');
    
    expect(ideas).toBeDefined();
    expect(Array.isArray(ideas)).toBe(true);
    expect(ideas[0].topic_title).toBe('Test Idea');
  });

  it('should throw error if profile is missing', async () => {
    mockSupabase.from.mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: null, error: new Error('Not found') })
        }))
      }))
    });

    await expect(generateDailyIdeas(mockSupabase, 'wrong-user', 'en'))
      .rejects.toThrow('User personality not found');
  });
});
