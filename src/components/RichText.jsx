import { Link } from 'react-router-dom';
// Colours #hashtags (violet, link to the topic) and @mentions (pink, link to the profile) inside any text.
export const TOKEN = /(#[\p{L}\p{N}_]{2,30}|(?<![\w])@[a-zA-Z0-9_]{3,24})/gu;
export const tokenize = (text = '') => String(text).split(TOKEN).map((t, i) => (i % 2 ? { t, kind: t[0] === '#' ? 'tag' : 'mention' } : { t }));
export default function RichText({ text, className = '' }) {
  return <p className={`whitespace-pre-wrap break-words ${className}`}>{tokenize(text).map((x, i) => x.kind === 'tag' ? <Link key={i} to={`/topic/${x.t.slice(1).toLowerCase()}`} className="text-violet-light font-medium" onClick={(e) => e.stopPropagation()}>{x.t}</Link>
    : x.kind === 'mention' ? <Link key={i} to={`/u/${x.t.slice(1).toLowerCase()}`} className="text-pink font-medium" onClick={(e) => e.stopPropagation()}>{x.t}</Link> : x.t)}</p>;
}
