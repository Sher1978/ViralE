/**
 * videoScoreLibrary.ts
 * Curated Few-Shot Video Score Library (RAG) for Virali AI.
 * Maps semantic speech intents (Growth, Myth, List, Hook, Statistic) 
 * to high-converting motion graphics and camera cut patterns.
 */

export interface VideoScorePattern {
  id: string;
  intentCategory: 'growth_metric' | 'contrarian_myth' | 'list_step' | 'high_impact_hook' | 'statistic_callout';
  keywords: string[];
  suggestedElementType: 'chart' | 'kinetic_quote' | 'tweet_card' | 'list' | 'stat_callout' | '3d_icon';
  suggestedCameraCut: 'punch_zoom' | 'scale_to_circle' | 'move_left' | 'micro_zoom';
  soundEffect: 'whoosh' | 'pop' | 'click';
  fewShotExample: {
    phrasePattern: string;
    propsTemplate: Record<string, any>;
  };
}

export const FEW_SHOT_VIDEO_SCORES: VideoScorePattern[] = [
  {
    id: 'score_growth_1',
    intentCategory: 'growth_metric',
    keywords: ['выросли', 'рост', 'увеличили', 'конверсия', 'доход', 'продажи', 'процентов', '%', 'в 3 раза', 'выросла'],
    suggestedElementType: 'chart',
    suggestedCameraCut: 'scale_to_circle',
    soundEffect: 'whoosh',
    fewShotExample: {
      phrasePattern: 'Мы выросли в 3 раза за прошлый месяц',
      propsTemplate: {
        title: 'Динамика роста',
        subtitle: 'Показатели удержания и продаж',
        values: [35, 60, 85, 98]
      }
    }
  },
  {
    id: 'score_stat_1',
    intentCategory: 'statistic_callout',
    keywords: ['статистика', 'исследования', 'ученые доказали', 'цифра', '+300%', '+500%', '80%', '90%', 'данные'],
    suggestedElementType: 'stat_callout',
    suggestedCameraCut: 'scale_to_circle',
    soundEffect: 'pop',
    fewShotExample: {
      phrasePattern: '80% предпринимателей совершают эту ошибку',
      propsTemplate: {
        statValue: '+350%',
        statLabel: 'Рост конверсии бизнеса'
      }
    }
  },
  {
    id: 'score_contrarian_1',
    intentCategory: 'contrarian_myth',
    keywords: ['миф', 'главная ошибка', 'правда в том', 'на самом деле', 'ложь', 'не делайте это', 'секрет', 'фишка'],
    suggestedElementType: 'kinetic_quote',
    suggestedCameraCut: 'punch_zoom',
    soundEffect: 'whoosh',
    fewShotExample: {
      phrasePattern: 'Первая главная ошибка большинства предпринимателей',
      propsTemplate: {
        quote: 'Главная ошибка — отсутствие системного маркетинга',
        author: 'Экспертное расследование'
      }
    }
  },
  {
    id: 'score_list_1',
    intentCategory: 'list_step',
    keywords: ['факторы', 'способ', 'шага', 'ошибки', 'причины', 'правила', 'список', 'во-первых', 'во-вторых', 'в-третьих'],
    suggestedElementType: 'list',
    suggestedCameraCut: 'move_left',
    soundEffect: 'click',
    fewShotExample: {
      phrasePattern: 'Вот 3 главных фактора удержания клиентов',
      propsTemplate: {
        title: 'Факторы успеха',
        items: ['Автоворонка продаж', 'ИИ-дикторы', 'Аналитика retention']
      }
    }
  },
  {
    id: 'score_hook_1',
    intentCategory: 'high_impact_hook',
    keywords: ['привет', 'смотрите', 'как сделать', 'почему ваш', 'хотите', 'стоп', 'внимание', 'разбор'],
    suggestedElementType: '3d_icon',
    suggestedCameraCut: 'punch_zoom',
    soundEffect: 'whoosh',
    fewShotExample: {
      phrasePattern: 'Как увеличить удержание вашего видео в 3 раза',
      propsTemplate: {
        iconName: 'growth',
        title: 'Виральный форсинг'
      }
    }
  }
];

/**
 * RAG Semantic Matcher: Finds relevant Few-Shot Video Scores for a transcript segment
 */
export function findMatchingVideoScores(text: string): VideoScorePattern[] {
  if (!text) return [];

  const lower = text.toLowerCase();
  const matchedScores = FEW_SHOT_VIDEO_SCORES.filter(score => {
    return score.keywords.some(kw => lower.includes(kw.toLowerCase()));
  });

  return matchedScores.length > 0 ? matchedScores : [FEW_SHOT_VIDEO_SCORES[0]];
}

/**
 * Returns RAG context string to inject into Director & Art Director prompts
 */
export function buildFewShotRagPromptContext(transcriptText: string): string {
  const matches = findMatchingVideoScores(transcriptText);
  if (matches.length === 0) return '';

  return `
--- FEW-SHOT VIDEO SCORE LIBRARY (RAG MATCHES) ---
На основе семантического анализа текста подтянуты следующие образцовые монтажные решения:
${matches.map(m => `
- Категория: ${m.intentCategory}
  Фраза-триггер: "${m.fewShotExample.phrasePattern}"
  Рекомендуемый тип графики: ${m.suggestedElementType}
  Камера: ${m.suggestedCameraCut} (Звук: ${m.soundEffect})
  Шаблон данных: ${JSON.stringify(m.fewShotExample.propsTemplate)}
`).join('\n')}
---------------------------------------------------
  `;
}
