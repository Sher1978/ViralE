import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailyIdeas } from '@/lib/ideation';

// Mock Supabase
const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'ideation_feed') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        })),
      };
    }
    return {
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
    };
  }),
} as any;

vi.mock('@/lib/ai/gemini', () => {
  const mockGenerativeModel = {
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
  };

  return {
    model: mockGenerativeModel,
    getModel: vi.fn(() => mockGenerativeModel),
  };
});

describe('generateDailyIdeas', () => {
  it('should generate 3 ideas and return them as an array', async () => {
    const ideas = await generateDailyIdeas(mockSupabase, 'test-user', 'en');
    
    expect(ideas).toBeDefined();
    expect(Array.isArray(ideas)).toBe(true);
    expect(ideas[0].topic_title).toBe('Test Idea');
  });

  it('should throw error if profile is missing', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'ideation_feed') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })
          }))
        }))
      };
    });

    await expect(generateDailyIdeas(mockSupabase, 'wrong-user', 'en'))
      .rejects.toThrow('User personality not found');
  });
});
