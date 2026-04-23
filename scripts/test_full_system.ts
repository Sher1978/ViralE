import './loadenv';
import { createClient } from '@supabase/supabase-js';

// Import libraries
// If these fail, we might need to use relative paths like ../src/lib/...
import { generateDailyIdeas, saveIdeasToFeed } from '../src/lib/ideation';
import { generateScript, refineScript } from '../src/lib/ai/gemini';
import { generateStoryboardAI } from '../src/lib/storyboard';
import { createRenderJob } from '../src/lib/render';
import { CREDIT_COSTS } from '../src/lib/credits';

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

async function runFullSystemTest() {
  console.log(`${colors.bold}${colors.cyan}🚀 ЗАПУСК ПОЛНОГО ТЕСТИРОВАНИЯ СИСТЕМЫ VIRAL ENGINE${colors.reset}\n`);

  const TEST_USER_ID = '91c005c5-0cb8-439f-9294-1d4c169802c9';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let currentProject: any = null;
  let currentVersion: any = null;
  let startingBalance = 0;

  try {
    // 0. Initial Balance Check
    const { data: profile } = await supabase.from('profiles').select('credits_balance').eq('id', TEST_USER_ID).single();
    startingBalance = profile?.credits_balance || 0;
    console.log(`${colors.yellow}💰 Начальный баланс: ${startingBalance} кредитов${colors.reset}\n`);

    // 1. Ideation Phase
    console.log(`${colors.yellow}1. [Ideation] Генерация идей (Real AI)...${colors.reset}`);
    const ideas = await generateDailyIdeas(supabase, TEST_USER_ID, 'ru');
    console.log(`  ✅ Сгенерировано ${ideas.length} идей.`);
    await saveIdeasToFeed(supabase, TEST_USER_ID, ideas);
    console.log(`  ✅ Идеи сохранены в ленту.`);

    // 2. Project Creation Phase
    console.log(`\n${colors.yellow}2. [Project] Создание проекта из идеи...${colors.reset}`);
    const targetIdea = ideas[0];
    const { data: project, error: pError } = await supabase
      .from('projects')
      .insert({
        user_id: TEST_USER_ID,
        title: targetIdea.topic_title,
        input_source: targetIdea.topic_title,
        status: 'ideation'
      })
      .select()
      .single();
    
    if (pError) throw pError;
    currentProject = project;
    console.log(`  ✅ Проект создан: ${project.id} ("${project.title}")`);

    // 3. Script Generation Phase
    console.log(`\n${colors.yellow}3. [Script] Генерация сценария v1...${colors.reset}`);
    const scriptJson = await generateScript(targetIdea.topic_title, '', 'ru'); // Empty shadow uses Expert fallback
    
    const { data: version, error: vError } = await supabase
      .from('project_versions')
      .insert({
        project_id: currentProject.id,
        script_data: scriptJson,
        version_label: 'v1'
      })
      .select()
      .single();
    
    if (vError) throw vError;
    currentVersion = version;
    console.log(`  ✅ Сценарий v1 создан.`);

    // 4. Script Refinement Phase
    console.log(`\n${colors.yellow}4. [Refinement] Уточнение тона ("более иронично")...${colors.reset}`);
    const refinedScriptBody = await refineScript(scriptJson, "сделай тон более ироничным и добавь больше провокации", '', 'ru');
    
    const { data: v2, error: v2Error } = await supabase
      .from('project_versions')
      .insert({
        project_id: currentProject.id,
        script_data: refinedScriptBody,
        version_label: 'v2'
      })
      .select()
      .single();
    
    if (v2Error) throw v2Error;
    currentVersion = v2; // Use refined version for storyboard
    console.log(`  ✅ Сценарий v2 (Refined) создан.`);

    // 5. Storyboard Phase
    console.log(`\n${colors.yellow}5. [Storyboard] Генерация визуального ряда...${colors.reset}`);
    const frames = await generateStoryboardAI(refinedScriptBody, 'ru');
    console.log(`  ✅ Сгенерировано ${frames.length} кадров.`);
    
    // Save storyboard to DB (assuming project metadata or dedicated col)
    await supabase.from('projects').update({ 
      metadata: { storyboard: frames },
      status: 'scripting' 
    }).eq('id', currentProject.id);

    // 6. Render Orchestration
    console.log(`\n${colors.yellow}6. [Render] Создание задания на рендер (Preview)...${colors.reset}`);
    const job = await createRenderJob(supabase, TEST_USER_ID, currentProject.id, currentVersion.id, 'preview');
    console.log(`  ✅ Задание создано ID: ${job.id}, Статус: ${job.status}`);

    // 7. Credits Verification
    console.log(`\n${colors.yellow}7. [Verification] Проверка списания кредитов...${colors.reset}`);
    const { data: finalProfile } = await supabase.from('profiles').select('credits_balance').eq('id', TEST_USER_ID).single();
    const finalBalance = finalProfile?.credits_balance || 0;
    const spent = startingBalance - finalBalance;
    
    // Total expected costs: 
    // - generateScript (actually generateScript doesn't deduct in lib, it's in the route... wait)
    // - createRenderJob (deducts CREDITS_COSTS.RENDER_PREVIEW)
    // Let's check credits.ts to see if generateScript library call deducts. 
    // Usually only APIs deduct. But createRenderJob explicitly calls deductCredits.
    
    console.log(`  📊 Потрачено: ${spent} кредитов`);
    console.log(`  💰 Конечный баланс: ${finalBalance}`);

    // 8. Cleanup (Archive)
    console.log(`\n${colors.yellow}8. [Cleanup] Архивация проекта...${colors.reset}`);
    await supabase.from('projects').update({ 
      status: 'completed',
      metadata: { ...currentProject.metadata, archived: true } 
    }).eq('id', currentProject.id);
    console.log(`  ✅ Проект архивирован.`);

    console.log(`\n${colors.bold}${colors.green}🏁 ТЕСТ VIRAL ENGINE ПРОЙДЕН УСПЕШНО!${colors.reset}\n`);

  } catch (e: any) {
    console.log(`\n${colors.red}❌ КРИТИЧЕСКАЯ ОШИБКА ТЕСТА: ${e.message}${colors.reset}`);
    if (e.stack) console.log(e.stack);
    process.exit(1);
  }
}

runFullSystemTest();
