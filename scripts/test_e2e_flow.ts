import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m"
};

async function testE2E() {
  console.log(`${colors.bold}${colors.cyan}🧪 ЗАПУСК E2E ТЕСТА VIRAL ENGINE${colors.reset}\n`);

  const TEST_USER_ID = '91c005c5-0cb8-439f-9294-1d4c169802c9';
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Создание идеи
    console.log(`${colors.yellow}1. Создание идеи в ideation_feed...${colors.reset}`);
    const { data: idea, error: ideaError } = await supabase
      .from('ideation_feed')
      .insert({
        user_id: TEST_USER_ID,
        topic_title: `E2E Test Topic ${Date.now()}`,
        rationale: "Тестовое обоснование для проверки полного цикла продакшена.",
        status: 'new'
      })
      .select()
      .single();

    if (ideaError) throw ideaError;
    console.log(`  ✅ Идея создана ID: ${idea.id}`);

    // 2. Создание проекта
    console.log(`\n${colors.yellow}2. Создание проекта из идеи...${colors.reset}`);
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: TEST_USER_ID,
        title: idea.topic_title,
        input_source: idea.topic_title,
        status: 'ideation'
      })
      .select()
      .single();

    if (projectError) throw projectError;
    console.log(`  ✅ Проект создан ID: ${project.id}`);

    // 3. Генерация сценария (Логика апи)
    console.log(`\n${colors.yellow}3. Симуляция генерации сценария...${colors.reset}`);
    const mockScriptData = {
      hook: "Это тест!",
      intro: "Мы проверяем пайплайн.",
      body: "Всё работает по плану, включая экспертный стиль.",
      cta: "Подпишись на Шерлока!"
    };

    const { data: version, error: versionError } = await supabase
      .from('project_versions')
      .insert({
        project_id: project.id,
        script_data: mockScriptData,
        version_label: 'v1'
      })
      .select()
      .single();

    if (versionError) throw versionError;
    
    await supabase.from('projects').update({ status: 'scripting' }).eq('id', project.id);
    console.log(`  ✅ Сценарий сгенерирован (v1)`);

    // 4. Проверка архивации
    console.log(`\n${colors.yellow}4. Тестирование архивации...${colors.reset}`);
    const { data: archivedProject, error: archiveError } = await supabase
      .from('projects')
      .update({ 
        status: 'completed',
        metadata: { archived: true } 
      })
      .eq('id', project.id)
      .select()
      .single();

    if (archiveError) throw archiveError;
    if (archivedProject.metadata?.archived === true) {
      console.log(`  ✅ Проект успешно архивирован (metadata.archived: true)`);
    } else {
      throw new Error('Флаг архивации не установлен');
    }

    // 5. Поиск в архиве
    console.log(`\n${colors.yellow}5. Проверка видимости в архиве...${colors.reset}`);
    const { data: archiveCheck } = await supabase
      .from('projects')
      .select('id')
      .eq('id', project.id)
      .eq('metadata->archived', true);

    if (archiveCheck && archiveCheck.length > 0) {
      console.log(`  ✅ Проект найден в выборке архива`);
    } else {
      throw new Error('Проект не найден в архиве по фильтру');
    }

    console.log(`\n${colors.bold}${colors.green}🎉 E2E ТЕСТ ПРОЙДЕН УСПЕШНО!${colors.reset}\n`);

  } catch (e: any) {
    console.log(`\n${colors.red}❌ ТЕСТ ПРОВАЛЕН: ${e.message}${colors.reset}`);
    process.exit(1);
  }
}

testE2E();
