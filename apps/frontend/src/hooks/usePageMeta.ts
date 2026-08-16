import { useEffect } from 'react';

const DEFAULT_TITLE = 'Bitshala Portal';

/**
 * Sets the document title and meta description for a page.
 *
 * This helps browser tabs, bookmarks and Google (which renders JS). It does
 * NOT affect link unfurls: Slack, Discord and X don't execute JavaScript, and
 * Vite serves the same index.html for every route, so those crawlers only ever
 * see the static tags in index.html. Per-route unfurls would need prerendering.
 */
export const usePageMeta = (title?: string, description?: string): void => {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title ? `${title} · Bitshala` : DEFAULT_TITLE;

    const tag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = tag?.content;
    if (tag && description) {
      tag.content = description;
    }

    return () => {
      document.title = previousTitle;
      if (tag && previousDescription !== undefined) {
        tag.content = previousDescription;
      }
    };
  }, [title, description]);
};
