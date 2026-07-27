import { supabaseAdmin } from './src/lib/supabase';
import { generateDailyIdeas, saveIdeasToFeed } from './src/lib/ideation';

async function main() {
  const email = '0451611@gmail.com';
  console.log(`Fixing user ${email}...`);

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', email)
    .single();

  if (!profile) {
    console.error('User not found!');
    return;
  }

  const userId = profile.id;
  console.log('Found user ID:', userId);

  // 1. Delete all old Dubai ideas for this user from ideation_feed
  const { error: deleteErr } = await supabaseAdmin
    .from('ideation_feed')
    .delete()
    .eq('user_id', userId);

  if (deleteErr) {
    console.error('Failed to delete old ideas:', deleteErr);
  } else {
    console.log('Successfully cleared old Dubai ideas from ideation_feed!');
  }

  // 2. Update digital_shadow_prompt and dna_answers based on storybrand_raw_content
  const sbContent = profile.storybrand_raw_content;
  if (sbContent) {
    console.log('Synthesizing fresh Sherlock Bikes Vietnam DNA from uploaded StoryBrand document...');
    
    const newPersona = `Официальный представитель и эксперт консьерж-сервиса Sherlock Bikes (Вьетнам). Специализация: безопасный подбор, технический аудит (Blue Card) и аренда/покупка идеальных мотоциклов для экспатов, предпринимателей и IT-специалистов в Дананге, Нячанге и Хошимине. Уникальное позиционирование: бескомпромиссная надежность, искренний сервис, ликвидация рисков обмана на азиатском рынке и организация сообщества Sherlock Bikes & Ocean.`;

    const newDnaAnswers = {
      sphere: 'Консьерж-сервис подбора, технического аудита и продажи мотоциклов Sherlock Bikes для экспатов во Вьетнаме (Дананг, Нячанг, Хошимин)',
      audience: 'Экспаты, предприниматели, IT-специалисты и зимовщики во Вьетнаме, ценящие безопасность, свое время и прозрачный сервис без риска быть обманутыми',
      painPoint: 'Сложный неконтролируемый азиатский рынок мототехники: риск покупки "убитых" байков, поддельные документы Blue Card, потеря депозитов и поломки на горных перевалах',
      approach: 'Профессиональный технический и юридический аудит 100% техники, индивидуальный подбор байков под ключ, прозрачный консьерж-сервис и программа Fast-Exit при выезде',
      goal: 'Показать экспатам, как легко и безопасно получать свободу передвижения во Вьетнаме без стресса и рисков',
      tone: 'Экспертный, ироничный, харизматичный, уверенный, ориентированный на премиальный сервис',
      advantage: 'Записывайтесь на консультацию или подбор байка в Sherlock Bikes'
    };

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({
        digital_shadow_prompt: newPersona,
        dna_answers: newDnaAnswers
      })
      .eq('id', userId);

    if (updateErr) {
      console.error('Failed to update profile DNA:', updateErr);
    } else {
      console.log('Successfully updated profile DNA to Sherlock Bikes Vietnam!');
    }
  }

  // 3. Generate fresh new ideas for user based on Sherlock Bikes Vietnam DNA
  console.log('Generating fresh ideas matrix for Sherlock Bikes Vietnam...');
  try {
    const ideas = await generateDailyIdeas(supabaseAdmin, userId, 'ru', 'Hooks');
    await saveIdeasToFeed(supabaseAdmin, userId, ideas);
    console.log('Successfully generated and saved 5 fresh Sherlock Bikes ideas:');
    ideas.forEach(i => console.log(`- [${i.category}] ${i.topic_title}`));
  } catch (err: any) {
    console.error('Failed to generate ideas:', err.message || err);
  }
}

main().catch(console.error);
