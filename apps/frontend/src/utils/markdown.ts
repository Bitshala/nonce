/**
 * Does this text look like it was written as markdown?
 *
 * Long-form proposal text is stored as plain text with no format marker, so the
 * read views have to decide. The renderer understands full GitHub Flavored
 * Markdown, so detection is no longer limited by what it can draw — it exists
 * only to keep ordinary prose from being restyled on a weak signal.
 */

// Block-level syntax is unambiguous authored intent: one occurrence is enough.
const BLOCK_SIGNALS = [
  /^[ \t]{0,3}#{1,6}[ \t]+\S/m, // ATX heading — the space is required, so #hashtag is safe
  /^[ \t]{0,3}[-*+][ \t]+\S/m, // bullet list
  /^[ \t]{0,3}\d+[.)][ \t]+\S/m, // ordered list
  /^[ \t]{0,3}>[ \t]?\S/m, // blockquote
  /^[ \t]{0,3}(?:```|~~~)/m, // fenced code block
  /^[ \t]{0,3}\|.*\|[ \t]*$/m, // GFM table row
  /\[[^\]\n]{1,80}\]\((?:https?:\/\/|mailto:)[^)\s]+\)/, // an explicit link — nobody types this by accident
];

// Weaker signals: real markdown, but also shapes that occur in ordinary
// technical prose, so require two before restyling the field. Single-character
// emphasis and `__dunder__` are excluded entirely — "a * b * c", "*ptr" and
// "__init__" are prose, and one stray pair shouldn't reformat a proposal.
const INLINE_SIGNALS = [
  /\*\*(?![\s*])[^*\n]{0,60}(?<![\s*])\*\*/, // **strong**
  /`[^`\n]{1,120}`/, // `code`
  /~~(?![\s~])[^~\n]{0,60}(?<![\s~])~~/, // ~~strikethrough~~ (GFM)
];

export const looksLikeMarkdown = (text: string | null | undefined): boolean => {
  const value = text?.trim();
  if (!value) return false;
  return (
    BLOCK_SIGNALS.some((re) => re.test(value)) ||
    INLINE_SIGNALS.filter((re) => re.test(value)).length >= 2
  );
};
