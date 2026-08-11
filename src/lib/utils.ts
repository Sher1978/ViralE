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
  const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    clean = codeBlockMatch[1].trim();
  } else {
    clean = clean.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    const lines = clean.split('\n');
    if (lines[0].trim().startsWith('```')) {
      lines.shift();
    }
    if (lines.length > 0 && lines[lines.length - 1].trim().startsWith('```')) {
      lines.pop();
    }
    clean = lines.join('\n').trim();
  }

  // Remove potential BOM or other invisible junk
  clean = clean.replace(/^\uFEFF/, '');

  // 2. Extract first matching JSON object/array if wrapped in explanatory text
  if (!clean.startsWith('{') && !clean.startsWith('[')) {
    const startMatch = clean.match(/(?:\[\s*[\{\["']|\{\s*")/);
    if (startMatch && startMatch.index !== undefined) {
      const firstIdx = startMatch.index;
      const lastSquare = clean.lastIndexOf(']');
      const lastCurly = clean.lastIndexOf('}');
      const lastIdx = Math.max(lastSquare, lastCurly);
      if (lastIdx > firstIdx) {
        clean = clean.substring(firstIdx, lastIdx + 1).trim();
      }
    } else {
      const jsonMatch = clean.match(/[\{\[]([\s\S]*)[\}\]]/);
      if (jsonMatch) {
        clean = jsonMatch[0];
      }
    }
  }

  // Strip any trailing non-JSON characters after the last closing brace/bracket
  const lastBrace = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
  if (lastBrace !== -1 && lastBrace < clean.length - 1) {
    clean = clean.substring(0, lastBrace + 1).trim();
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

