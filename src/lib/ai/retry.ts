export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  delayMs = 800
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err;
      }
      console.warn(`[AI Retry Warn] Attempt ${attempt} failed. Retrying in ${delayMs * attempt}ms... Error:`, err);
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
  throw new Error('Max retry attempts reached');
}
