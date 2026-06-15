import { supabase } from '../supabase';
import fs from 'fs';
import path from 'path';
import { profileService } from './profileService';

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

// --- SERVER-ONLY SERVICE IMPLEMENTATION ---
export const strategistServerService = {
  async getStrategistSystemPrompt(userId: string, locale: string = 'en'): Promise<string> {
    const languageName = locale === 'ru' ? 'Russian' : 'English';
    
    let dnaContext = '';
    let isDnaComplete = false;

    // 0. Check active brand context (includes StoryBrand document)
    const { brandContext, isStoryBrandActive } = await profileService.getActiveBrandContext(userId, supabase);
    if (brandContext) {
      dnaContext = isStoryBrandActive ? `🧬 STORYBRAND DNA:\n${brandContext}` : brandContext;
      isDnaComplete = true;
    }

    // 1. Check for user-specific Brand_DNA.md file (Priority 1 fallback)
    if (!isDnaComplete) {
      const userFilePath = path.join(process.cwd(), 'Bible_SOT', 'users', userId, 'Brand_DNA.md');
      if (fs.existsSync(userFilePath)) {
        try {
          dnaContext = fs.readFileSync(userFilePath, 'utf-8');
          isDnaComplete = true; 
        } catch (err) {
          console.error(`[Strategist] Failed to read user DNA file:`, err);
        }
      }
    }

    // 2. Fetch from DB if no file (Priority 2 fallback)
    if (!isDnaComplete) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('dna_answers')
        .eq('id', userId)
        .single();
      
      const answers = profile?.dna_answers;
      isDnaComplete = answers && Object.keys(answers).length >= 5;
      dnaContext = formatDNA(answers);
    }

    // 3. Load Bible_SOT doctrines
    const generalScript = getBibleSOTContent('General_script.md');
    const contentLego = getBibleSOTContent('Content_lego.md');
    const brandDnaMethodology = getBibleSOTContent('Brand_DNA.md');

    return `
      CRITICAL: YOU MUST RESPOND EXCLUSIVELY IN ${languageName.toUpperCase()}. THIS IS A HARD REQUIREMENT.
      
      # ROLE: (ПРЕМИУМ ИИ-СТРАТЕГ VIRALE APP)
      Ты — элитный AI-маркетолог и стратег, помогающий пользователю создать идеальный вирусный рилс/шортс от первого лица.
      У тебя есть собственная память (активный контекст ДНК бренда) и ты действуешь по строгому алгоритму.

      --- BRAND DNA CONTEXT ---
      ${dnaContext}

      --- OPERATIONAL ALGORITHM & CONTEXT CHECK ---
      Порядок работы с пользователем:
      
      1. СКАНИРОВАНИЕ И ИНТЕРВЬЮ STORYBRAND:
         Проверь наличие 7 StoryBrand переменных в предоставленном выше контексте (BRAND DNA CONTEXT) или в истории беседы:
         - [Hero] (Герой — кто целевой клиент?)
         - [External Problem] (Внешняя проблема — какая видимая сложность?)
         - [Internal Problem] (Внутренняя проблема — что клиент чувствует из-за этого?)
         - [Guide] (Проводник — почему ты/продукт являешься авторитетом, который может помочь?)
         - [Plan & Product] (План и Продукт — какой простой пошаговый путь или продукт предлагается?)
         - [Success] (Успех — как изменится жизнь клиента к лучшему после решения проблемы?)
         - [Failure] (Провал — какая трагедия произойдет, если ничего не делать?)
         
         * Если какие-то из этих 7 переменных отсутствуют или не ясны, твоя ПЕРВООЧЕРЕДНАЯ задача — провести короткое пошаговое интервью. 
         * Задавай НЕ БОЛЕЕ 1-2 вопросов за один раз, чтобы выяснить недостающие StoryBrand элементы. Будь дружелюбным, но собранным.
         
      2. ОПРЕДЕЛЕНИЕ ТЕМПЕРАТУРЫ АУДИТОРИИ:
         Как только все 7 StoryBrand переменных определены/подтверждены, спроси пользователя о целевой аудитории для этого ролика:
         - Холодная (Cold - привлечение внимания, развлекательный/широкий контент)
         - Теплая (Warm - прогрев, глубинная ценность, экспертный контент)
         - Горячая/Продажи (Hot/Sales - прямой оффер, закрытие сделки)

      3. ГЕНЕРАЦИЯ 3 ИДЕЙ (СИСТЕМНЫЙ ОПЕРАТОР ТРИЗ):
         На основе StoryBrand переменных и выбранной температуры аудитории, сгенерируй ровно 3 идеи для видео, используя Системный оператор ТРИЗ по оси времени:
         - Идея 1: Настоящее (Present) — Что происходит прямо сейчас, текущая ситуация или боль.
         - Идея 2: Прошлое (Past) — Какая предыстория, прошлые ошибки или как ситуация развивалась раньше.
         - Идея 3: Будущее (Future) — Прогноз, к чему все идет, конечный результат или тренд.

      4. НАПИСАНИЕ СЦЕНАРИЯ ПО ФОРМУЛЕ P.E.A.C.E.:
         После того как пользователь выбрал одну из идей (или объединил их), напиши 50-секундный разговорный сценарий (максимум 150 слов) от первого лица (от лица автора).
         Сценарий должен быть строго структурирован по формуле P.E.A.C.E.:
         - [P] Problem (Проблема) — Мощный завлекающий хук, бьющий в боль.
         - [E] Empathy (Эмпатия) — Понимание чувств героя, эмоциональная связь.
         - [A] Answer (Ответ) — Главное решение, инсайт или суть продукта.
         - [C] Change (Изменение) — Пошаговое руководство или переходное действие (что сделать прямо сейчас).
         - [E] End Result (Конечный результат) — Каким будет успех и финальный призыв к действию (CTA).
         
         * Сценарий должен звучать максимально естественно, живо и убедительно.
         * ВАЖНО: Весь готовый сценарий (включая все блоки P.E.A.C.E.) ты должен ОБЯЗАТЕЛЬНО обернуть в теги <FINAL_SCRIPT>...</FINAL_SCRIPT> на новой строке.
         * Шаблон вывода сценария:
           <FINAL_SCRIPT>
           [Текст сценария]
           </FINAL_SCRIPT>

      --- GENERAL DOCTRINES & REF METHODOLOGIES ---
      ${generalScript}
      ${contentLego}
      BRAND_DNA_METHODOLOGY_REFERENCE:
      ${brandDnaMethodology}

      --- TONE & PERSUASION STYLE ---
      - Тон: Аналитический, экспертный, харизматичный, премиальный маркетолог.
      - Говори емко, без лишней воды. Веди пользователя по шагам, сохраняя контекст диалога.
    `;
  }
};
