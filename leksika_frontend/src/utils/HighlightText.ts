/**
 * Mencari semua kemunculan kata kunci (bisa lebih dari satu, dipisahkan koma)
 * di dalam sebuah teks dan membungkusnya dengan tag <mark> untuk penandaan.
 * 
 * @param {string} text - Teks atau kalimat sumber.
 * @param {string|string[]} searchTerms - String berisi kata kunci, bisa dipisahkan koma atau array.
 * @returns {string} - String HTML dengan kata kunci yang sudah ditandai.
 */
export const getHighlightedText = (text: string, searchTerms: string | string[], customClass: string = '') => {
  if (!text || !searchTerms) {
    return text;
  }

  let terms;
  if (Array.isArray(searchTerms)) {
      terms = searchTerms.filter(Boolean);
  } else {
      terms = searchTerms
        .split(',')
        .map((term) => term.trim())
        .filter(Boolean);
  }

  if (terms.length === 0) {
    return text;
  }

  // Debug: Log what we're trying to match
  // console.log('[HighlightText] Searching for terms:', terms);
  // console.log('[HighlightText] In text (first 200 chars):', text.substring(0, 200));

  // Robust Flexible Matching Strategy:
  // 1. Sort terms by length (longest first) to avoid partial matches
  terms.sort((a, b) => b.length - a.length);

  // 2. Prepare terms with flexible matching:
  //    - Normalize whitespace (spaces, newlines, tabs -> single space)
  //    - Allow for minor punctuation differences at the end
  //    - Case-insensitive matching
  const patternParts = terms.map(term => {
      // Normalize the search term: trim and normalize internal whitespace
      let cleanTerm = term.trim().replace(/\s+/g, ' ');
      
      // Escape regex special characters EXCEPT at the very end (for flexible punctuation)
      // First, separate trailing punctuation
      const punctMatch = cleanTerm.match(/([.,;!?:'"»«]+)$/);
      const trailingPunct = punctMatch ? punctMatch[1] : '';
      const coreTerm = trailingPunct ? cleanTerm.slice(0, -trailingPunct.length) : cleanTerm;
      
      // Escape the core term for regex
      const escaped = coreTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Replace single spaces with \s+ to handle whitespace variations
      const withFlexWhitespace = escaped.replace(/ /g, '\\s+');
      
      // Allow optional trailing punctuation (match with or without)
      const flexPunct = trailingPunct 
        ? `(?:[${trailingPunct.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}])?`
        : '[.,;!?:]*';  // Allow any trailing punctuation if none was specified
      
      return withFlexWhitespace + flexPunct;
  });
  
  // 3. Create pattern with case-insensitive flag
  const pattern = `(${patternParts.join('|')})`;
  const regex = new RegExp(pattern, 'gi');
  
  // console.log('[HighlightText] Regex pattern:', pattern);

  // Check if we have any matches
  // const testMatch = text.match(regex);
  // console.log('[HighlightText] Matches found:', testMatch ? testMatch.length : 0, testMatch);

  const defaultStyle = 'background-color: var(--color-primary); color: var(--color-on-primary); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-weight: 600; font-style: normal; display: inline; box-decoration-break: clone; -webkit-box-decoration-break: clone;';

  // Replace all matches with highlighted version
  // If customClass is provided, use it instead of inline style
  const markTag = customClass 
    ? `<mark class="${customClass}">$1</mark>`
    : `<mark style="${defaultStyle}">$1</mark>`;

  return text.replace(regex, markTag);
};
