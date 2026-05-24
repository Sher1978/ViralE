import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely parses JSON strings returned by LLMs, robustly repairing common syntax issues:
 * 1. Surrounding markdown code fences (```json ... ```)
 * 2. Unescaped double quotes inside string values
 * 3. Literal unescaped newlines inside string values
 * 4. Trailing commas before closing braces/brackets
 */
export function safeJsonParse<T = any>(text: string): T {
  if (!text) {
    throw new Error("Cannot parse empty or null string as JSON");
  }

  // 1. Clean markdown formatting
  let clean = text.trim();
  if (clean.startsWith('```')) {
    const lines = clean.split('\n');
    if (lines[0].startsWith('```')) {
      lines.shift();
    }
    if (lines[lines.length - 1].startsWith('```')) {
      lines.pop();
    }
    clean = lines.join('\n').trim();
  }

  // Remove potential BOM or other invisible junk
  clean = clean.replace(/^\uFEFF/, '');

  // 2. Extract first matching JSON object if wrapped in explanatory text
  if (!clean.startsWith('{') && !clean.startsWith('[')) {
    const jsonMatch = clean.match(/[\{\[]([\s\S]*)[\}\]]/);
    if (jsonMatch) {
      clean = jsonMatch[0];
    }
  }

  // 3. Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,\s*([}\]])/g, '$1');

  // Try standard JSON parse first. If it succeeds, return the parsed object!
  try {
    return JSON.parse(clean) as T;
  } catch (e) {
    // If standard parsing fails, proceed to character-by-character repair
    console.warn("[safeJsonParse] Standard JSON.parse failed. Proceeding with robust character-by-character repair...", e);
  }

  // 4. Character-by-character parsing and repair
  let repaired = '';
  let inString = false;
  
  const getNextNonWhitespaceChar = (str: string, startIdx: number): string => {
    let idx = startIdx;
    while (idx < str.length) {
      const char = str[idx];
      if (char !== ' ' && char !== '\t' && char !== '\n' && char !== '\r') {
        return char;
      }
      idx++;
    }
    return '';
  };

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (char === '"') {
      // Count backslashes preceding the quote to check if it's already escaped
      let backslashes = 0;
      let k = i - 1;
      while (k >= 0 && clean[k] === '\\') {
        backslashes++;
        k--;
      }
      const isEscaped = (backslashes % 2 === 1);

      if (isEscaped) {
        repaired += char;
      } else {
        if (!inString) {
          // Entering a string value/key
          inString = true;
          repaired += char;
        } else {
          // We are in a string. Check if this is the closing quote of the string.
          // In standard JSON, a closing quote must be followed by one of: ",", "}", "]", or ":" (for keys)
          const nextChar = getNextNonWhitespaceChar(clean, i + 1);
          if (nextChar === ',' || nextChar === '}' || nextChar === ']' || nextChar === ':') {
            inString = false;
            repaired += char;
          } else {
            // Unescaped nested quote inside a string value! Escape it!
            repaired += '\\"';
          }
        }
      }
    } else if (char === '\n' && inString) {
      // Escape raw newlines inside string values
      repaired += '\\n';
    } else if (char === '\r' && inString) {
      // Skip carriage returns inside strings
    } else {
      repaired += char;
    }
  }

  // Final attempt to parse the repaired JSON
  try {
    return JSON.parse(repaired) as T;
  } catch (err: any) {
    console.error("[safeJsonParse] Repair failed to yield valid JSON. Original text preview:", text.substring(0, 200));
    console.error("[safeJsonParse] Repaired text preview:", repaired.substring(0, 200));
    throw new Error(`Failed to parse repaired JSON: ${err.message}`);
  }
}
