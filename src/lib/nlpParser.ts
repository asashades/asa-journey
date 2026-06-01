import { format } from 'date-fns';

interface ParseResult {
  cleanText: string;
  parsedDate: Date;
  hasCustomDate: boolean;
  hasCustomTime: boolean;
}

/**
 * Parses NLP date and time expressions from input text, strips them,
 * and returns the cleaned text along with the calculated Date object.
 */
export function parseAndStripNLP(inputText: string, referenceDateStr: string): ParseResult {
  let text = inputText.trim();

  // Create date object based on referenceDateStr (yyyy-MM-dd)
  const parts = referenceDateStr.split('-');
  const parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  
  // Default time is current system time (to keep it fresh)
  let parsedHours = new Date().getHours();
  let parsedMinutes = new Date().getMinutes();
  
  let hasCustomDate = false;
  let hasCustomTime = false;

  // 1. Date Expressions Regexes
  const tomorrowRegex = /\b(tomorrow)\b/i;
  const todayRegex = /\b(today)\b/i;
  const daysFromNowRegex = /\b(\d+)\s+days?\s+from\s+now\b/i;

  if (tomorrowRegex.test(text)) {
    parsedDate.setDate(parsedDate.getDate() + 1);
    text = text.replace(tomorrowRegex, '').trim();
    hasCustomDate = true;
  } else if (todayRegex.test(text)) {
    text = text.replace(todayRegex, '').trim();
    hasCustomDate = true;
  } else {
    const matchDays = text.match(daysFromNowRegex);
    if (matchDays) {
      const days = parseInt(matchDays[1], 10);
      parsedDate.setDate(parsedDate.getDate() + days);
      text = text.replace(daysFromNowRegex, '').trim();
      hasCustomDate = true;
    }
  }

  // 2. Time Expressions Regexes
  // Match am/pm style, dot or colon separator, e.g. 11.30pm, 11:30am, 7pm, at 7pm, at 11.30pm
  const ampmRegex = /\b(?:at\s+)?(\d{1,2})(?:[.:](\d{2}))?\s*(am|pm)\b/i;
  
  // Match 24 hour military style with dot or colon, e.g. 23.30, 23:30, at 23.30
  const militaryRegex = /\b(?:at\s+)?([0-1]?\d|2[0-3])[.:](\d{2})\b/i;
  
  // Match "at X" simple style (defaulting to PM if hour < 12), e.g. at 3, at 12
  const atNumberRegex = /\bat\s+(\d{1,2})\b/i;

  const matchAmpm = text.match(ampmRegex);
  if (matchAmpm) {
    let hour = parseInt(matchAmpm[1], 10);
    const minute = matchAmpm[2] ? parseInt(matchAmpm[2], 10) : 0;
    const ampm = matchAmpm[3].toLowerCase();

    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;

    parsedHours = hour;
    parsedMinutes = minute;
    text = text.replace(ampmRegex, '').trim();
    hasCustomTime = true;
  } else {
    const matchMilitary = text.match(militaryRegex);
    if (matchMilitary) {
      const hour = parseInt(matchMilitary[1], 10);
      const minute = parseInt(matchMilitary[2], 10);

      parsedHours = hour;
      parsedMinutes = minute;
      text = text.replace(militaryRegex, '').trim();
      hasCustomTime = true;
    } else {
      const matchAtNum = text.match(atNumberRegex);
      if (matchAtNum) {
        let hour = parseInt(matchAtNum[1], 10);
        // Default to PM if < 12 (e.g. at 3 -> 3 PM / 15:00)
        if (hour < 12) hour += 12;
        parsedHours = hour;
        parsedMinutes = 0;
        text = text.replace(atNumberRegex, '').trim();
        hasCustomTime = true;
      }
    }
  }

  // Clean up connecting words left over
  text = text.replace(/\s+at\s*$/i, ''); // trailing " at"
  text = text.replace(/^\s*at\s+/i, ''); // leading "at "
  text = text.replace(/\s+/g, ' ').trim();

  // Combine parsed date and time
  parsedDate.setHours(parsedHours, parsedMinutes, 0, 0);

  return {
    cleanText: text,
    parsedDate,
    hasCustomDate,
    hasCustomTime
  };
}
