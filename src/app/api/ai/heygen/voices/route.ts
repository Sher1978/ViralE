import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const HEYGEN_API_URL = 'https://api.heygen.com';

// 10 curated languages for the HeyGen Avatar flow UI
export const HEYGEN_LANGUAGES = [
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'zh', label: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'pt', label: 'Português', flag: '🇧🇷' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const avatarId = searchParams.get('avatarId'); // optional: filter to avatar's own voice
    const language = searchParams.get('language') || 'en';

    let apiKey = process.env.HEYGEN_API_KEY;

    try {
      const user = await getAuthenticatedUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('heygen_api_key')
          .eq('id', user.id)
          .single();
        if (profile?.heygen_api_key && profile.heygen_api_key.trim() !== '') {
          apiKey = profile.heygen_api_key.trim();
        }
      }
    } catch (e) {
      console.warn('[HeyGen Voices] Failed to resolve BYOK key:', e);
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'HeyGen API key not found. Please add it in Profile → BYOK.' }, { status: 400 });
    }

    console.log(`[HeyGen Voices] Fetching voices for lang=${language}, avatarId=${avatarId || 'none'}`);

    const res = await fetch(`${HEYGEN_API_URL}/v2/voices`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HeyGen API Error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const allVoices: any[] = data.data?.voices || data.voices || [];

    console.log(`[HeyGen Voices] Total voices returned: ${allVoices.length}`);

    // Collect the avatar's own voice first (if avatarId provided)
    const avatarVoice = avatarId
      ? allVoices.find((v: any) => v.voice_id === avatarId || v.avatar_id === avatarId)
      : null;

    // Filter voices by language (heygen uses 'language' field like 'English', 'Russian', etc.)
    // Map our locale code to HeyGen language names
    const langMap: Record<string, string[]> = {
      ru: ['Russian'],
      en: ['English'],
      zh: ['Chinese'],
      es: ['Spanish'],
      de: ['German'],
      fr: ['French'],
      ar: ['Arabic'],
      pt: ['Portuguese'],
      ja: ['Japanese'],
      ko: ['Korean'],
    };
    const targetLangs = langMap[language] || ['English'];

    // Filter by language, exclude avatar's own voice from list (we'll prepend it)
    let filtered = allVoices.filter((v: any) => {
      const voiceLang = v.language || v.locale || '';
      return targetLangs.some(l => voiceLang.toLowerCase().includes(l.toLowerCase()));
    });

    // Limit to 9 (avatar's own voice will be the 10th as the first item)
    const limited = filtered.slice(0, avatarVoice ? 9 : 10);

    const voices = [
      // Avatar's own voice first (if it exists and has a voice)
      ...(avatarVoice
        ? [{ id: avatarVoice.voice_id, name: `${avatarVoice.name || 'Avatar Voice'} (собственный)`, preview_audio: avatarVoice.preview_audio || null, isAvatarVoice: true }]
        : []),
      ...limited.map((v: any) => ({
        id: v.voice_id,
        name: v.name || v.display_name || 'Voice',
        preview_audio: v.preview_audio || null,
        isAvatarVoice: false,
      })),
    ];

    return NextResponse.json({ voices, languages: HEYGEN_LANGUAGES });
  } catch (e: any) {
    console.error('[HeyGen Voices] Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
