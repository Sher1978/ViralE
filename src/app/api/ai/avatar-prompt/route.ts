import { NextResponse } from 'next/server';
import { generateAvatarPrompt } from '@/lib/ai/prompts';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { description, locale } = await req.json();

    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Generate Prompt using internal AI logic
    const expandedPrompt = await generateAvatarPrompt(description, locale || 'en');

    return NextResponse.json({ prompt: expandedPrompt });
  } catch (error: any) {
    console.error('Avatar prompt API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
