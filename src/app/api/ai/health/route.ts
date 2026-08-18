import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { notifyAdminError } from '@/lib/telegram';

export const maxDuration = 15;

export async function GET(req: Request) {
  const startTime = Date.now();
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const errorMsg = 'Gemini API Key missing in server environment variables.';
    await notifyAdminError({
      source: 'Gemini Health Sentinel',
      error: new Error(errorMsg),
      extra: { 
        location: 'api/ai/health/route.ts:GET', 
        status: 'MISSING_API_KEY',
        botNotificationTarget: '@Viralengin_bot'
      }
    }).catch(() => {});

    return NextResponse.json({ 
      status: 'error', 
      engine: 'gemini', 
      error: errorMsg 
    }, { status: 500 });
  }

  const candidateModels = ['gemini-1.5-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  for (const modelCandidate of candidateModels) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: modelCandidate });
      const result = await model.generateContent('Health check ping. Output single word: OK');
      const response = await result.response;
      const text = response.text().trim();
      const latencyMs = Date.now() - startTime;

      console.log(`[Gemini Health Sentinel] Healthy response from ${modelCandidate} in ${latencyMs}ms`);

      return NextResponse.json({
        status: 'ok',
        engine: 'gemini',
        activeModel: modelCandidate,
        latencyMs,
        responseSample: text.slice(0, 50),
        botStatus: 'Monitoring active via @Viralengin_bot'
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`[Gemini Health Sentinel] Check failed for ${modelCandidate}:`, err?.message || err);
    }
  }

  // All candidates failed -> Send Telegram Alert
  const latencyMs = Date.now() - startTime;
  await notifyAdminError({
    source: 'Gemini Health Sentinel',
    error: lastError || new Error('All Gemini model candidates failed health check.'),
    extra: {
      location: 'api/ai/health/route.ts:GET',
      engine: 'gemini',
      candidateModels,
      latencyMs,
      stack: lastError?.stack,
      botNotificationTarget: '@Viralengin_bot'
    }
  }).catch(() => {});

  return NextResponse.json({
    status: 'error',
    engine: 'gemini',
    latencyMs,
    error: lastError?.message || 'Gemini health check failed on all candidates'
  }, { status: 500 });
}
