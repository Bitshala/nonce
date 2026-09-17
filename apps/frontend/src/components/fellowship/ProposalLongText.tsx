import { Typography } from '@mui/material';
import ExpandableText from './ExpandableText';
import MarkdownView from './MarkdownView';
import { looksLikeMarkdown } from '../../utils/markdown';

/**
 * One rendering of a proposal's long-form text, shared by the reviewer pane,
 * the applicant's detail view, the proposal dialog, the print/PDF export and
 * the apply form's review step — so "markdown or plain text?" is decided in
 * exactly one place. Three separate copies of that decision would drift, and
 * the worst drift is the applicant's review step disagreeing with what the
 * reviewer sees.
 *
 * Markdown renders only when detected; anything else keeps the faithful
 * pre-wrap rendering it has always had.
 */
export const ProposalLongText = ({
  text,
  expandable = false,
  maxLines = 10,
  print = false,
}: {
  text: string | null | undefined;
  /** Clamp behind a "Show more" toggle (for compact contexts). */
  expandable?: boolean;
  maxLines?: number;
  /** Print/PDF context — links stay black so the document greyscales cleanly. */
  print?: boolean;
}) => {
  const value = text ?? '';
  if (!value.trim()) {
    return (
      <Typography variant="body2" sx={{ color: 'text.primary' }}>
        —
      </Typography>
    );
  }

  if (!looksLikeMarkdown(value)) {
    // Plain text keeps the line-clamp path it has always used, so it still gets
    // a real "…" ellipsis rather than the fade the rendered-node clamp needs.
    return expandable ? (
      <ExpandableText text={value} maxLines={maxLines} />
    ) : (
      <Typography
        variant="body2"
        sx={{ color: 'text.primary', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
      >
        {value}
      </Typography>
    );
  }

  // Applicant prose shouldn't own the page outline, so its headings are shifted
  // below the surrounding section/dialog headings.
  const markdown = <MarkdownView content={value} dense print={print} headingOffset={2} />;

  return expandable ? (
    <ExpandableText text={value} maxLines={maxLines}>
      {markdown}
    </ExpandableText>
  ) : (
    markdown
  );
};

export default ProposalLongText;
