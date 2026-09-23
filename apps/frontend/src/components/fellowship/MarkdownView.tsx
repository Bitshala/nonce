import { memo, useMemo } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fontFamilyMono } from './theme';

interface Props {
  content: string;
  /**
   * Scale blocks down to MUI `body2` (0.875rem / 1.6) — the metrics the
   * proposal read views use for plain text — so turning markdown on changes
   * structure and emphasis without changing text size or rhythm.
   */
  dense?: boolean;
  /** Print/PDF context: links stay black so the document greyscales cleanly. */
  print?: boolean;
  /**
   * Shift authored heading levels down so author-controlled prose doesn't own
   * the page outline. The rendered *size* still follows the authored level.
   */
  headingOffset?: number;
}

type HeadingMargin = { mt: number; mb: number };

type Scale = {
  body: { fontSize: string; lineHeight: number; my: number; letterSpacing?: string };
  list: { fontSize: string; pl: number; my: number; itemMb: number };
  quote: { fontSize: string; pl: number; my: number };
  code: { fontSize: string; my: number };
  headingSizes: readonly string[];
  headingMargins: readonly HeadingMargin[];
  h1Rule: boolean;
};

// `default` is the report styling; `dense` is the body2-parity set used by the
// proposal read views and the print/PDF export.
const SCALES: Record<'default' | 'dense', Scale> = {
  default: {
    body: { fontSize: '1.05rem', lineHeight: 1.75, my: 1.5 },
    list: { fontSize: '1.02rem', pl: 3.5, my: 1.5, itemMb: 0.75 },
    quote: { fontSize: '1.02rem', pl: 2, my: 2 },
    code: { fontSize: '0.92rem', my: 1.5 },
    headingSizes: ['1.9rem', '1.5rem', '1.25rem', '1.1rem', '1rem', '0.95rem'],
    headingMargins: [
      { mt: 0, mb: 2.5 },
      { mt: 4, mb: 2 },
      { mt: 3, mb: 1.5 },
      { mt: 2.5, mb: 1.25 },
      { mt: 2, mb: 1 },
      { mt: 2, mb: 1 },
    ],
    h1Rule: true,
  },
  dense: {
    body: { fontSize: '0.875rem', lineHeight: 1.6, my: 1, letterSpacing: '0.01071em' },
    list: { fontSize: '0.875rem', pl: 2.5, my: 0.75, itemMb: 0.4 },
    quote: { fontSize: '0.875rem', pl: 1.5, my: 1 },
    code: { fontSize: '0.8rem', my: 1 },
    // Clamped: an unclamped h1 would outsize the print view's own document
    // title (variant="h5", 1.5rem) and fight the section caption above it.
    headingSizes: ['1.05rem', '0.98rem', '0.92rem', '0.875rem', '0.875rem', '0.875rem'],
    headingMargins: [
      { mt: 0, mb: 0.75 },
      { mt: 1.5, mb: 0.5 },
      { mt: 1.25, mb: 0.5 },
      { mt: 1, mb: 0.5 },
      { mt: 1, mb: 0.5 },
      { mt: 1, mb: 0.5 },
    ],
    h1Rule: false,
  },
};

/**
 * react-markdown already blocks every scheme outside
 * `http/https/irc/ircs/mailto/xmpp`. This tightens that further: `//host`
 * inherits the page's scheme and hides its host in plain sight, and `irc:`/
 * `xmpp:` hand off to a desktop application, which proposal text read by admin
 * reviewers has no reason to do.
 */
const urlTransform = (url: string): string => {
  const value = url.trim();
  if (value.startsWith('//')) return '';
  if (value.startsWith('/') || value.startsWith('#')) return value;
  return /^(?:https?:\/\/|mailto:)/i.test(value) ? value : '';
};

const buildComponents = (scale: Scale, print: boolean, headingOffset: number): Components => {
  const heading = (level: number) => {
    const Heading = ({ children }: { children?: React.ReactNode }) => (
      <Typography
        component={`h${Math.min(level + headingOffset, 6)}` as 'h1'}
        sx={{
          fontWeight: level <= 2 ? 700 : 600,
          fontSize: scale.headingSizes[level - 1],
          lineHeight: 1.25,
          color: 'text.primary',
          borderBottom: level === 1 && scale.h1Rule ? '1px solid' : 'none',
          borderColor: 'divider',
          pb: level === 1 && scale.h1Rule ? 1.5 : 0,
          breakAfter: 'avoid',
          ...scale.headingMargins[level - 1],
        }}
      >
        {children}
      </Typography>
    );
    return Heading;
  };

  const listSx = {
    pl: scale.list.pl,
    my: scale.list.my,
    fontSize: scale.list.fontSize,
    lineHeight: scale.body.lineHeight,
    letterSpacing: scale.body.letterSpacing,
    color: 'text.primary',
    '& li': { mb: scale.list.itemMb, breakInside: 'avoid' },
    // A loose list wraps each item in <p>; drop its margins so loose and tight
    // lists keep the same rhythm.
    '& li > p': { my: 0 },
    // Nested lists shouldn't re-apply the outer indent or vertical rhythm.
    '& ul, & ol': { my: 0.25, pl: 2.5 },
    // GFM task lists carry their own checkbox, so drop the bullet.
    '&.contains-task-list': { listStyle: 'none', pl: 1 },
  } as const;

  const cellSx = {
    border: '1px solid',
    borderColor: 'divider',
    px: 1,
    py: 0.5,
    textAlign: 'left',
  } as const;

  return {
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),

    p: ({ children }) => (
      <Typography
        component="p"
        sx={{
          fontSize: scale.body.fontSize,
          lineHeight: scale.body.lineHeight,
          letterSpacing: scale.body.letterSpacing,
          color: 'text.primary',
          my: scale.body.my,
          // Keeps two things the spec would otherwise discard visually: runs of
          // spaces in hand-aligned text, and single newlines, which CommonMark
          // emits as a literal "\n" and HTML would collapse to a space.
          whiteSpace: 'pre-wrap',
          orphans: 2,
          widows: 2,
        }}
      >
        {children}
      </Typography>
    ),

    ul: ({ children, className }) => (
      <Box component="ul" className={className} sx={listSx}>
        {children}
      </Box>
    ),
    ol: ({ children, className, start }) => (
      <Box component="ol" className={className} start={start} sx={listSx}>
        {children}
      </Box>
    ),
    li: ({ children, className }) => (
      <Box component="li" className={className}>
        {children}
      </Box>
    ),

    blockquote: ({ children }) => (
      <Box
        sx={{
          borderLeft: '3px solid',
          borderColor: 'divider',
          pl: scale.quote.pl,
          my: scale.quote.my,
          color: 'text.secondary',
          fontStyle: 'italic',
          '& p': { fontSize: scale.quote.fontSize, my: 0.5 },
        }}
      >
        {children}
      </Box>
    ),

    // urlTransform blanks out any scheme it rejects; render those as plain text
    // rather than a dead anchor that looks clickable and reloads the page.
    a: ({ children, href }) =>
      href ? (
        <Box
          component="a"
          href={href}
          title={href}
          target="_blank"
          rel="noopener noreferrer"
          sx={
            print
              ? { color: 'inherit', textDecoration: 'underline' }
              : { color: 'primary.main', textDecoration: 'underline' }
          }
        >
          {children}
        </Box>
      ) : (
        <>{children}</>
      ),

    strong: ({ children }) => (
      <Box component="strong" sx={{ fontWeight: 700 }}>
        {children}
      </Box>
    ),
    em: ({ children }) => (
      <Box component="em" sx={{ fontStyle: 'italic' }}>
        {children}
      </Box>
    ),
    del: ({ children }) => (
      <Box component="del" sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
        {children}
      </Box>
    ),

    code: ({ children }) => (
      <Box
        component="code"
        sx={{
          fontFamily: fontFamilyMono,
          bgcolor: print ? 'transparent' : 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          px: 0.5,
          py: 0.15,
          borderRadius: 0.5,
          fontSize: '0.9em',
        }}
      >
        {children}
      </Box>
    ),
    pre: ({ children }) => (
      <Box
        component="pre"
        sx={{
          fontSize: scale.code.fontSize,
          lineHeight: 1.5,
          color: 'text.primary',
          bgcolor: print ? 'transparent' : 'action.hover',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          p: 1.25,
          my: scale.code.my,
          overflowX: 'auto',
          // The fenced block owns the frame, so the <code> inside it sheds the
          // inline-code chrome rather than drawing a second box.
          '& code': {
            bgcolor: 'transparent',
            border: 'none',
            p: 0,
            borderRadius: 0,
            fontSize: 'inherit',
          },
        }}
      >
        {children}
      </Box>
    ),

    hr: () => <Divider sx={{ my: scale.body.my * 1.5 }} />,

    table: ({ children }) => (
      <Box sx={{ overflowX: 'auto', my: scale.body.my }}>
        <Box
          component="table"
          sx={{
            borderCollapse: 'collapse',
            fontSize: scale.body.fontSize,
            lineHeight: scale.body.lineHeight,
            color: 'text.primary',
          }}
        >
          {children}
        </Box>
      </Box>
    ),
    th: ({ children, style }) => (
      <Box component="th" style={style} sx={{ ...cellSx, fontWeight: 700, bgcolor: print ? 'transparent' : 'action.hover' }}>
        {children}
      </Box>
    ),
    td: ({ children, style }) => (
      <Box component="td" style={style} sx={cellSx}>
        {children}
      </Box>
    ),

    // GFM task-list checkbox: read-only, since this is a rendered view.
    input: ({ checked, type }) =>
      type === 'checkbox' ? (
        <Box
          component="input"
          type="checkbox"
          checked={!!checked}
          readOnly
          disabled
          sx={{ mr: 0.75, verticalAlign: 'middle' }}
        />
      ) : null,

    // Images are not rendered: a remote <img> in author-supplied text would
    // leak a reviewer's IP and user-agent to its host on load, with no click.
    // The link keeps the reference without fetching anything.
    img: ({ src, alt }) => {
      const href = typeof src === 'string' ? urlTransform(src) : '';
      return (
        <Box component="span" sx={{ fontSize: scale.body.fontSize }}>
          {alt || 'image'}
          {href && (
            <>
              {' ('}
              <Box
                component="a"
                href={href}
                title={href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: print ? 'inherit' : 'primary.main' }}
              >
                link
              </Box>
              {')'}
            </>
          )}
        </Box>
      );
    },
  };
};

/**
 * Renders GitHub Flavored Markdown — the same dialect and parser family GitHub
 * uses (CommonMark + GFM extensions), via react-markdown. It builds React
 * elements rather than an HTML string, so there is no `innerHTML` to sanitize;
 * raw HTML in the source is skipped outright.
 */
export const MarkdownView = memo(
  ({ content, dense = false, print = false, headingOffset = 0 }: Props) => {
    const components = useMemo(
      () => buildComponents(SCALES[dense ? 'dense' : 'default'], print, headingOffset),
      [dense, print, headingOffset],
    );
    return (
      <Box
        sx={{
          // Flattening the outer margins keeps a leading "## Heading" from
          // stacking its own mt on the section's, and lets ExpandableText
          // measure the clamp height without margin bleed.
          '& > :first-of-type': { mt: 0 },
          '& > :last-child': { mb: 0 },
        }}
      >
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={components}
          urlTransform={urlTransform}
          skipHtml
        >
          {content}
        </Markdown>
      </Box>
    );
  },
);

export default MarkdownView;
