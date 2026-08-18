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
/**
 * Extracts the first balanced JSON object {...} or array [...] from string.
 * Avoids matching pseudo-headers like '[Hooks]:' by ensuring valid JSON start tokens.
 */
export function extractJsonSubstring(text: string): string | null {
  if (!text) return null;
  let clean = text.trim();
  
  // 1. Remove markdown code block wrappers if present
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    clean = codeBlockMatch[1].trim();
  }

  // 2. Find first true JSON start: either '{' or '['
  let startIdx = -1;
  let isArray = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (char === '{') {
      startIdx = i;
      isArray = false;
      break;
    } else if (char === '[') {
      const rest = clean.slice(i + 1).trimStart();
      if (/^[\{\[\"\d\]]/.test(rest)) {
        startIdx = i;
        isArray = true;
        break;
      }
    }
  }

  if (startIdx === -1) return null;

  // 3. Track bracket depth to find matching closing bracket
  let depth = 0;
  let inString = false;
  let escaped = false;
  const openChar = isArray ? '[' : '{';
  const closeChar = isArray ? ']' : '}';

  for (let i = startIdx; i < clean.length; i++) {
    const char = clean[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === openChar) {
        depth++;
      } else if (char === closeChar) {
        depth--;
        if (depth === 0) {
          return clean.substring(startIdx, i + 1);
        }
      }
    }
  }

  // If unclosed (e.g. truncated JSON), return from startIdx to end
  return clean.substring(startIdx);
}

/**
 * Safely parses JSON strings returned by LLMs, robustly repairing common syntax issues:
 * 1. Surrounding markdown code fences (```json ... ```)
 * 2. Prefix/suffix conversational text and pseudo-headers (e.g. "[Hooks]:")
 * 3. Unescaped double quotes inside string values
 * 4. Literal unescaped newlines inside string values
 * 5. Trailing commas before closing braces/brackets
 * 6. Truncated JSON structures (auto-closes unclosed strings, braces, and brackets)
 */
export function safeJsonParse<T = any>(text: string): T | null {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // 1. Clean invisible characters / BOM
  let clean = text.replace(/^\uFEFF/, '').trim();
  if (!clean) return null;

  // 2. Extract structured JSON substring
  const extracted = extractJsonSubstring(clean);
  if (extracted) {
    clean = extracted;
  }

  // 3. Strip trailing non-JSON characters
  const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < clean.length - 1) {
    clean = clean.substring(0, lastBrace + 1).trim();
  }

  // 4. Remove trailing commas before closing braces/brackets
  clean = clean.replace(/,\s*([}\]])/g, '$1');

  // Try standard JSON parse first
  try {
    return JSON.parse(clean) as T;
  } catch (e) {
    // Standard parse failed, proceed with repair
  }

  // 5. Character-by-character parsing and repair
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
          inString = true;
          repaired += char;
        } else {
          const nextChar = getNextNonWhitespaceChar(clean, i + 1);
          let isClosing = false;

          if (nextChar === ':') {
            isClosing = true;
          } else if (nextChar === '}' || nextChar === ']') {
            isClosing = true;
          } else if (nextChar === ',') {
            const commaIdx = clean.indexOf(',', i + 1);
            const charAfterComma = getNextNonWhitespaceChar(clean, commaIdx + 1);
            if (charAfterComma === '"' || charAfterComma === '{' || charAfterComma === '[' || charAfterComma === '}' || charAfterComma === ']' || charAfterComma === '') {
              isClosing = true;
            }
          }

          if (isClosing) {
            inString = false;
            repaired += char;
          } else {
            repaired += '\\"';
          }
        }
      }
    } else if (char === '\n' && inString) {
      repaired += '\\n';
    } else if (char === '\r' && inString) {
      // Skip carriage returns in string literals
    } else {
      repaired += char;
    }
  }

  // Remove trailing commas after character repair
  repaired = repaired.replace(/,\s*([}\]])/g, '$1');

  try {
    return JSON.parse(repaired) as T;
  } catch (err) {
    // 6. Attempt truncated JSON completion if needed
    try {
      let completion = repaired;
      if (inString) {
        completion += '"';
      }
      
      // Balance brackets/braces
      let openCurly = 0;
      let openSquare = 0;
      let strState = false;
      let escState = false;

      for (let i = 0; i < completion.length; i++) {
        const c = completion[i];
        if (escState) { escState = false; continue; }
        if (c === '\\') { escState = true; continue; }
        if (c === '"') { strState = !strState; continue; }
        if (!strState) {
          if (c === '{') openCurly++;
          else if (c === '}') openCurly = Math.max(0, openCurly - 1);
          else if (c === '[') openSquare++;
          else if (c === ']') openSquare = Math.max(0, openSquare - 1);
        }
      }

      // Close open structures
      completion = completion.replace(/,\s*$/, '');
      while (openCurly > 0) {
        completion += '}';
        openCurly--;
      }
      while (openSquare > 0) {
        completion += ']';
        openSquare--;
      }

      return JSON.parse(completion) as T;
    } catch (completionErr) {
      console.warn('[safeJsonParse] Could not parse or repair JSON text. Returning null.', { preview: text.substring(0, 150) });
      return null;
    }
  }
}

/**
 * Splits subtitle/caption text into balanced lines for rendering.
 * Matches logic exactly between preview and FFmpeg/Shotstack encoders.
 */
export function splitCaptionText(text: string): string[] {
  if (!text) return [];
  
  // Upper-case standard for premium subtitles
  const cleanText = text.trim().toUpperCase();
  
  // Respect user-defined newlines if they are present
  if (cleanText.includes('\n')) {
    return cleanText.split('\n').map(line => line.trim()).filter(Boolean);
  }
  
  const words = cleanText.split(/\s+/);
  if (words.length <= 1) return [cleanText];
  
  // If the total text length is short (<= 22 characters), keep it on a single line
  if (cleanText.length <= 22) {
    return [cleanText];
  }
  
  // Otherwise, split into two balanced lines at the midpoint of words
  const midpoint = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midpoint).join(' ');
  const line2 = words.slice(midpoint).join(' ');
  return [line1, line2];
}

