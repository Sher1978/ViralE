import { z } from 'zod';

export const SlideSchema = z.object({
  slide_number: z.number().int().min(1).max(6),
  role: z.enum(['hook', 'problem', 'pivot', 'takeaway1', 'takeaway2', 'cta']),
  text_on_slide: z.string().min(3).max(180),
  image_prompt: z.string().min(20),
  metaphor_tag: z.string(),
});

export const IgCarouselSchema = z.object({
  cta_word: z.string(),
  central_metaphor: z.string(),
  visual_style_prefix: z.string(),
  post_description: z.string().min(50),
  slides: z.array(SlideSchema).length(6),
});

export type IgCarouselPayload = z.infer<typeof IgCarouselSchema>;
