import fs from 'fs';
import path from 'path';

// --- BIBLE_SOT LOADER ---
function getBibleSOTContent(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), 'Bible_SOT', 'AI_prompts', filename);
    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`[BibleSOT] Failed to read ${filename}:`, err);
    return '';
  }
}

function formatDNA(answers: any): string {
  if (!answers) return "Missing DNA. Please conduct interview.";
  
  return `
    🧬 ACTIVE BRAND DNA (Based on user answers):
    
    1. FOUNDATION & EXPERTISE:
       - Niche: ${answers.niche || 'N/A'}
       - Contrarian Views: ${answers.contrarian_views || 'N/A'}
       - Authority/Expertise: ${answers.expertise || 'N/A'}
    
    2. AVATAR (ONE TRUE FAN):
       - Who: ${answers.target_audience || 'N/A'}
       - Deep Fears: ${answers.pain_points || 'N/A'}
       - Desires/Goals: ${answers.desired_results || 'N/A'}
    
    3. TONE & STYLE:
       - Tone of Voice: ${answers.tone_of_voice || 'N/A'}
       - Archetype/Role: ${answers.tone_of_voice || 'N/A'}
    
    4. FUNNEL & OFFERS:
       - Final Offer/Lead Magnet: ${answers.final_offer || 'N/A'}
  `;
}

const DNA_INTERVIEW_TEMPLATE = `
ТЫ ДОЛЖЕН ПРОВЕСТИ ИНТЕРВЬЮ ПО 5 БЛОКАМ:
БЛОК 1: ФУНДАМЕНТ (Супер-ниша, Трансформация "От А к Б", Нечестное преимущество, Противоречивые убеждения).
БЛОК 2: АВАТАР ЗРИТЕЛЯ (Кто они, Глубокие страхи, Истинные желания, Ложные убеждения).
БЛОК 3: АРХЕТИП И TONE OF VOICE (Ролевая модель: Шерлок-ментор, Манера общения, Фирменные слова).
БЛОК 4: ВИЗУАЛЬНЫЙ КОД (Визуальный вайб, Эстетика монтажа).
БЛОК 5: ВОРОНКА И МАГНИТЫ (Контентные столпы, Кодовые слова, Подарки).
`;

// --- SERVICE IMPLEMENTATION ---

export const strategistService = {
  async getAccessStatus(userId: string): Promise<AccessStatus> {
    const { data, error } = await supabase
      .from('feature_access')
      .select('trial_started_at, is_subscribed')
      .eq('user_id', userId)
      .eq('feature_id', 'strategist_pilot')
      .single();

    if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') throw error;

    if (data?.is_subscribed) {
      return { hasAccess: true, status: 'active', trialExpiresAt: null };
    }

    if (data?.trial_started_at) {
      const trialStart = new Date(data.trial_started_at);
      const now = new Date();
      const expiresAt = new Date(trialStart.getTime() + 24 * 60 * 60 * 1000);
      if (now < expiresAt) {
        return { hasAccess: true, status: 'trial', trialExpiresAt: expiresAt.toISOString() };
      }
    }
    return { hasAccess: false, status: 'no_access', trialExpiresAt: null };
  },

  async activateTrial(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('feature_access')
      .upsert({
        user_id: userId,
        feature_id: 'strategist_pilot',
        trial_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    return !error;
  },

  async getStrategistSystemPrompt(userId: string, locale: string = 'en'): Promise<string> {
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    
    // 1. Fetch current Profile DNA (dna_answers)
    const { data: profile } = await supabase
      .from('profiles')
      .select('dna_answers')
      .eq('id', userId)
      .single();

    const answers = profile?.dna_answers;
    const isDnaComplete = answers && Object.keys(answers).length >= 5;

    // 2. Load Bible_SOT doctrines from files
    const generalScript = getBibleSOTContent('General_script.md');
    const contentLego = getBibleSOTContent('Content_lego.md');
    const brandDnaMethodology = getBibleSOTContent('Brand_DNA.md');

    // 3. Construct formatted DNA context
    const dnaContext = formatDNA(answers);

    return `
      ${generalScript}
      ${contentLego}

      --- DATABASE DATA (USING .md FILES) ---
      BRAND_DNA_CONTEXT:
      ${dnaContext}

      BRAND_DNA_METHODOLOGY_REFERENCE:
      ${brandDnaMethodology}

      --- OPERATIONAL INSTRUCTIONS ---
      LANGUAGE: RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}.
      TONE: Analytical, expert, authoritative, "Sherlock" persona.

      --- MISSION: THE 5x4 CONTENT LEGO MATRIX ---
      If the user provides a TOPIC, you must generate a complete matrix of 5 DIFFERENT VIRAL STYLES.
      Each style must have exactly 4 BLOCKS as defined in Content_lego.md.

      FORMAT REQUIREMENTS:
      Your response should be a JSON-compatible block with the following structure:
      {
        "topic": "User's topic",
        "styles": [
          {
            "id": "contrarian",
            "name": "The Contrarian",
            "blocks": [
              { "type": "hook", "text": "...", "visual": "..." },
              { "type": "context", "text": "...", "visual": "..." },
              { "type": "meat", "text": "...", "visual": "..." },
              { "type": "cta", "text": "...", "visual": "..." }
            ]
          },
          ... (styles: contrarian, investigator, case_study, listicle, vulnerability)
        ]
      }

      --- ACTIVE MODE ---
      ${!isDnaComplete ? `
      MODE: BRAND DNA INTERVIEW (PRIORITY)
      User DNA is currently incomplete.
      MISSION: Conduct a professional interview to fill the DNA based on Brand_DNA.md methodology. 
      ` : `
      MODE: PRODUCTION (CONTENT LEGO)
      DNA is complete. Use the provided DNA context to calibrate all scripts!
      `}
    `;
  }
};
