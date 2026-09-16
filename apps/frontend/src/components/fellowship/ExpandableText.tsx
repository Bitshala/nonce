import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Typography, type SxProps, type Theme } from '@mui/material';

// Line height shared by the plain-text render and the rendered-node clamp, so
// `maxLines` means the same number of visual lines either way.
const LINE_HEIGHT = 1.6;
const BODY_FONT_SIZE = '0.875rem';

/**
 * Long-form content clamped to a few lines with a "Show more" toggle —
 * keeps proposal read views scannable without hiding anything.
 *
 * Pass `children` to clamp rendered content (e.g. `<MarkdownView dense/>`).
 * That path exists because `-webkit-line-clamp` counts line boxes in an inline
 * formatting context and is undefined over block children like <p>/<ul>/<h2>,
 * so rich content is clamped by height instead. It also has to be a <div>: a
 * `Typography` renders a <p>, which cannot legally contain those blocks.
 */
export const ExpandableText = ({
  text,
  maxLines = 6,
  children,
}: {
  /** Raw text — the remeasure key, and the render itself when `children` is absent. */
  text: string;
  maxLines?: number;
  children?: React.ReactNode;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  const measure = useCallback(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, []);

  useLayoutEffect(() => {
    // Only measure while clamped — expanded content never overflows.
    if (expanded) return;
    measure();
  }, [text, expanded, maxLines, measure]);

  useEffect(() => {
    if (expanded) return;
    const el = ref.current;
    if (!el) return;
    // A single layout-pass measurement is unreliable here: it runs before the
    // webfont settles, and never re-runs when the container is resized (the
    // proposal dialog and the window both resize). Either miss leaves content
    // clipped with no "Show more" button.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => observer.disconnect();
  }, [expanded, measure]);

  const clampSx: SxProps<Theme> = expanded
    ? {}
    : {
        maxHeight: `${maxLines * LINE_HEIGHT}em`,
        overflow: 'hidden',
        ...(overflowing && {
          // Block content can't take a real ellipsis, so fade the cut instead
          // of letting a half-line read as a rendering bug.
          maskImage: 'linear-gradient(to bottom, #000 72%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, #000 72%, transparent 100%)',
        }),
      };

  return (
    <Box>
      {children ? (
        <Box
          ref={ref}
          sx={{
            // Sets the basis for the `em` clamp height above, so one `em` unit
            // equals one line of the dense markdown body text inside.
            fontSize: BODY_FONT_SIZE,
            lineHeight: LINE_HEIGHT,
            ...clampSx,
          }}
        >
          {children}
        </Box>
      ) : (
        <Typography
          ref={ref}
          variant="body2"
          sx={{
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            lineHeight: LINE_HEIGHT,
            ...(expanded
              ? {}
              : {
                  display: '-webkit-box',
                  WebkitLineClamp: maxLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }),
          }}
        >
          {text}
        </Typography>
      )}
      {(overflowing || expanded) && (
        <Button
          size="small"
          variant="text"
          onClick={() => setExpanded((e) => !e)}
          sx={{ mt: 0.5, px: 0.5, minWidth: 0, fontSize: '0.78rem' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
};

export default ExpandableText;
