import React from 'react';
import { Link } from 'react-router-dom';

// Rendu Markdown minimal et sûr (aucun HTML injecté) pour les réponses de l'assistant :
// titres, listes à puces / numérotées, **gras**, *italique*, `code`
// (pas d'italique avec "_" pour ne pas altérer des rôles comme SERVICE_FISCAL),
// et références de demandes (DEM000017) transformées en liens vers /requests/17.

const INLINE_PATTERN = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|\bDEM\d{6}\b)/g;

const renderInline = (text, keyPrefix, onNavigate) => {
  const parts = String(text).split(INLINE_PATTERN);
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (!part) return null;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <strong key={key} className="font-semibold text-[var(--ink)]">
          {renderInline(part.slice(2, -2), key, onNavigate)}
        </strong>
      );
    }
    if (/^`[^`]+`$/.test(part)) {
      return (
        <code key={key} className="rounded bg-[var(--surface-2)] px-1 py-0.5 font-mono text-[0.8em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (/^\*[^*\s][^*]*\*$/.test(part)) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (/^DEM\d{6}$/.test(part)) {
      const id = Number(part.slice(3));
      return (
        <Link
          key={key}
          to={`/requests/${id}`}
          onClick={onNavigate}
          className="rounded bg-brand-500/10 px-1 font-mono text-[0.85em] font-medium text-brand-600 underline-offset-2 hover:underline dark:text-brand-300"
        >
          {part}
        </Link>
      );
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
};

const ChatMarkdown = ({ text, onNavigate }) => {
  const lines = String(text || '').replace(/\r\n/g, '\n').split('\n');
  const blocks = [];
  let list = null;

  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  lines.forEach((rawLine) => {
    const line = rawLine.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);

    if (bullet) {
      if (!list || list.type !== 'ul') { flushList(); list = { type: 'ul', items: [] }; }
      list.items.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!list || list.type !== 'ol') { flushList(); list = { type: 'ol', items: [], start: Number(numbered[1]) }; }
      list.items.push(numbered[2]);
      return;
    }
    flushList();
    if (!line.trim()) {
      blocks.push({ type: 'space' });
      return;
    }
    if (heading) {
      blocks.push({ type: 'heading', text: heading[1] });
      return;
    }
    blocks.push({ type: 'p', text: line });
  });
  flushList();

  return (
    <div className="space-y-1.5">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        if (block.type === 'space') return null;
        if (block.type === 'heading') {
          return <p key={key} className="pt-1 font-semibold text-[var(--ink)]">{renderInline(block.text, key, onNavigate)}</p>;
        }
        if (block.type === 'ul') {
          return (
            <ul key={key} className="space-y-1 pl-1">
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`} className="flex gap-2">
                  <span className="mt-[0.6em] h-1 w-1 flex-shrink-0 rounded-full bg-brand-500" />
                  <span>{renderInline(item, `${key}-${i}`, onNavigate)}</span>
                </li>
              ))}
            </ul>
          );
        }
        if (block.type === 'ol') {
          return (
            <ol key={key} className="space-y-1 pl-1">
              {block.items.map((item, i) => (
                <li key={`${key}-${i}`} className="flex gap-2">
                  <span className="min-w-[1.1rem] font-['Inter_Tight'] text-xs tabular-nums leading-6 text-brand-500">
                    {block.start + i}.
                  </span>
                  <span>{renderInline(item, `${key}-${i}`, onNavigate)}</span>
                </li>
              ))}
            </ol>
          );
        }
        return <p key={key}>{renderInline(block.text, key, onNavigate)}</p>;
      })}
    </div>
  );
};

export default ChatMarkdown;
