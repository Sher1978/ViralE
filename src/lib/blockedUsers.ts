/**
 * Blocked Users registry & helper functions.
 * Protects the platform by preventing blocked credentials (e.g. Telegram IDs) from joining or accessing the system.
 */

// Default hardcoded list of banned Telegram IDs
const STATIC_BLOCKED_TELEGRAM_IDS = [
  '6923499351',
];

/**
 * Checks if a given Telegram ID is blocked from accessing or joining the system.
 * Checks both environment variables (BLOCKED_TELEGRAM_IDS) and static list.
 */
export function isTelegramIdBlocked(id: string | number | null | undefined): boolean {
  if (!id) return false;
  const strId = String(id).trim();

  // Check static list
  if (STATIC_BLOCKED_TELEGRAM_IDS.includes(strId)) {
    return true;
  }

  // Check optional environment variable BLOCKED_TELEGRAM_IDS (comma separated)
  const envBlocked = process.env.BLOCKED_TELEGRAM_IDS;
  if (envBlocked) {
    const list = envBlocked.split(',').map(s => s.trim());
    if (list.includes(strId)) {
      return true;
    }
  }

  return false;
}
