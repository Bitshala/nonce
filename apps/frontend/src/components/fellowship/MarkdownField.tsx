import { useState } from 'react';
import { useWatch, type Control } from 'react-hook-form';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import FieldLabel from './FieldLabel';
import MarkdownView from './MarkdownView';
import type { ProposalFields } from '../../utils/proposalFormat';

/** The long-form application fields that accept markdown. */
export type MarkdownFieldName =
  | 'problemStatement'
  | 'plan'
  | 'scopeOfWork'
  | 'educationCategoryOther'
  | 'mentorTestimonial'
  | 'academicBackground'
  | 'professionalExperience'
  | 'bitcoinContributions'
  | 'bitcoinMotivation'
  | 'bitcoinOssGoal'
  | 'additionalInfo'
  | 'questionsForBitshala';

// Roughly one textarea row, so switching to Preview doesn't collapse the
// layout and bounce everything below it up the page.
const ROW_HEIGHT_PX = 23;

/**
 * Label row + a Write/Preview toggle wrapped around a long-form field.
 *
 * The editor itself is passed as `children` (the form's own controlled
 * TextField), so react-hook-form registration, validation, the character
 * counter and draft autosave are untouched by the toggle. The field stays
 * mounted while previewing, so cursor position and scroll survive a round trip.
 */
export const MarkdownField = ({
  control,
  name,
  label,
  minRows,
  disabled = false,
  children,
}: {
  control: Control<ProposalFields>;
  name: MarkdownFieldName;
  label: React.ReactNode;
  minRows: number;
  disabled?: boolean;
  children: React.ReactNode;
}) => {
  const [previewing, setPreviewing] = useState(false);
  // `useWatch` rather than `getValues` so the preview tracks keystrokes.
  const value = useWatch({ control, name }) ?? '';
  // A submitted or read-only draft renders through ProposalView anyway.
  const showToggle = !disabled;
  const preview = showToggle && previewing;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 1,
          '& > .MuiTypography-caption': { mb: 0 },
          mb: 0.75,
        }}
      >
        <FieldLabel>{label}</FieldLabel>
        {showToggle && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={previewing ? 'preview' : 'write'}
            onChange={(_, next) => {
              if (next) setPreviewing(next === 'preview');
            }}
            sx={{
              '& .MuiToggleButton-root': {
                px: 1,
                py: 0.15,
                fontSize: '0.68rem',
                letterSpacing: 0.6,
                textTransform: 'uppercase',
                fontWeight: 600,
                border: '1px solid',
                borderColor: 'divider',
              },
            }}
          >
            <ToggleButton value="write">Write</ToggleButton>
            <ToggleButton value="preview">Preview</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Kept mounted so toggling doesn't reset the textarea's caret. */}
      <Box sx={preview ? { display: 'none' } : undefined}>{children}</Box>

      {preview && (
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            minHeight: minRows * ROW_HEIGHT_PX,
            mb: 2.5,
          }}
        >
          {String(value).trim() ? (
            // Always rendered as markdown: preview answers "what does my
            // markdown look like?", so gating it on detection would show an
            // unchanged pane and read as broken. The review step, which shares
            // the reviewer's detection path, is the authoritative check.
            <MarkdownView content={String(value)} dense />
          ) : (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Nothing to preview yet.
            </Typography>
          )}
        </Box>
      )}

      {/* The toggle says a preview exists; this says what syntax it understands.
          Shown only while previewing, which is when the question comes up. */}
      {preview && (
        <Typography
          variant="caption"
          sx={{ display: 'block', color: 'text.secondary', mt: -2, mb: 2.5 }}
        >
          GitHub Flavored Markdown: <code># heading</code>, <code>- list</code>,{' '}
          <code>1. list</code>, <code>**bold**</code>, <code>`code`</code>,{' '}
          <code>&gt; quote</code>, <code>[text](url)</code>, tables,{' '}
          <code>- [ ] task</code>
        </Typography>
      )}
    </Box>
  );
};

export default MarkdownField;
