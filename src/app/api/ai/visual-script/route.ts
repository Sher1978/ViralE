import { NextResponse } from 'next/server';
import { generateVisualScript } from '@/lib/ai/visual-generator';
import { getAuthenticatedUser } from '@/lib/auth';
import { profileService } from '@/lib/services/profileService';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { scriptText, locale } = await req.json();

    if (!scriptText) {
      return NextResponse.json({ error: 'Script text is required' }, { status: 400 });
    }

    // 1. Get user DNA
    let dna = 'Generic expert content creator';
    try {
      await getAuthenticatedUser();
      const profile = await profileService.getOrCreateProfile();
      if (profile.dna) dna = profile.dna;
    } catch (e) {
      console.warn('Unauthorized or profile error in visual-script:', e);
    }

    // 2. Generate visual script
    const result = await generateVisualScript(scriptText, dna, locale);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Visual Script API error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
