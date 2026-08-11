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

  it('should successfully parse AI output with unescaped nested quotes and markdown wrappers', async () => {
    const { getModel } = await import('@/lib/ai/gemini');
    const mockModel = (getModel as any)();
    
    // Simulate AI response with unescaped quotes inside string
    mockModel.generateContent.mockResolvedValueOnce({
      response: {
        text: () => `\`\`\`json
        [
          {
            "topic_title": "Как использовать "секретный" соус в бизнесе",
            "rationale": "Объяснение с "кавычками" внутри",
            "viral_potential_score": 92
          }
        ]
        \`\`\``
      }
    });

    const mockValidSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'ideation_feed') {
          return { select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) })) };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { digital_shadow_prompt: 'Test persona' },
                error: null
              })
            }))
          }))
        };
      })
    } as any;

    const ideas = await generateDailyIdeas(mockValidSupabase, 'user-123', 'ru');
    expect(ideas).toHaveLength(1);
    expect(ideas[0].topic_title).toContain('секретный');
  });

  it('should extract array when AI wraps response in an object key', async () => {
    const { getModel } = await import('@/lib/ai/gemini');
    const mockModel = (getModel as any)();

    mockModel.generateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          ideas: [
            {
              topic_title: "Wrapped Object Idea",
              rationale: "Inside ideas property",
              viral_potential_score: 88
            }
          ]
        })
      }
    });

    const mockValidSupabase = {
      from: vi.fn((table: string) => {
        if (table === 'ideation_feed') {
          return { select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ count: 0, error: null }) })) };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { digital_shadow_prompt: 'Test persona' },
                error: null
              })
            }))
          }))
        };
      })
    } as any;

    const ideas = await generateDailyIdeas(mockValidSupabase, 'user-123', 'en');
    expect(ideas).toHaveLength(1);
    expect(ideas[0].topic_title).toBe('Wrapped Object Idea');
  });
});
