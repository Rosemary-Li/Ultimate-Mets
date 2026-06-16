"use client";
import "./styles.css";
import { useState, useEffect, useRef, useMemo } from "react";
import Chart from "chart.js/auto";
import SignInModal from "@/components/SignInModal";

/* ============================================================
 * DATA — in real app this comes from /api/players/:id
 * ============================================================ */
const PLAYER = {
  name: 'David Wright',
  number: 5,
  initials: 'DW',
  position: '3B',
  bats: 'R',
  throws: 'R',
  height: "6'0\"",
  weight: '200 lb',
  born: 'Dec 20, 1982',
  birthplace: 'Norfolk, VA',
  debut: 'Jul 21, 2004',
  seasons: '14 seasons (all NYM)',
  honors: ['7× All-Star', '2× Silver Slugger', '2× Gold Glove', 'Mets Captain', 'Mets Hall of Fame'],
};

const CAREER_TOTALS = [
  ['Games', '1,585'], ['Hits', '1,777'], ['Home Runs', '242'], ['RBI', '970'],
  ['Stolen Bases', '196'], ['Slash Line', '.296/.376/.491'], ['OPS+', '133'], ['bWAR', '54.6'],
];

const PERCENTILES = [
  { label: 'Hits', value: 94 },
  { label: 'On-Base %', value: 88 },
  { label: 'wRC+', value: 85 },
  { label: 'bWAR', value: 82 },
  { label: 'Stolen Bases', value: 67 },
  { label: 'Defensive Runs', value: 54 },
  { label: 'Strikeout Rate', value: 42 },
];

const SEASONS = [
  { Year: 2004, Age: 21, G: 69,  PA: 283, HR: 14, RBI: 40,  SB: 6,  'BB%': 5.7,  'K%': 14.5, AVG: .293, OBP: .332, SLG: .525, OPS: .857, 'wRC+': 129, bWAR: 1.6 },
  { Year: 2005, Age: 22, G: 160, PA: 695, HR: 27, RBI: 102, SB: 17, 'BB%': 10.5, 'K%': 16.4, AVG: .306, OBP: .388, SLG: .523, OPS: .911, 'wRC+': 140, bWAR: 6.4 },
  { Year: 2006, Age: 23, G: 154, PA: 662, HR: 26, RBI: 116, SB: 20, 'BB%': 10.6, 'K%': 17.7, AVG: .311, OBP: .381, SLG: .531, OPS: .912, 'wRC+': 137, bWAR: 6.4 },
  { Year: 2007, Age: 24, G: 160, PA: 711, HR: 30, RBI: 107, SB: 34, 'BB%': 13.5, 'K%': 16.6, AVG: .325, OBP: .416, SLG: .546, OPS: .963, 'wRC+': 150, bWAR: 8.3, leaders: ['HR','SB','wRC+','bWAR'] },
  { Year: 2008, Age: 25, G: 160, PA: 736, HR: 33, RBI: 124, SB: 15, 'BB%': 12.4, 'K%': 15.4, AVG: .302, OBP: .390, SLG: .534, OPS: .924, 'wRC+': 140, bWAR: 7.0 },
  { Year: 2009, Age: 26, G: 144, PA: 618, HR: 10, RBI: 72,  SB: 27, 'BB%': 12.6, 'K%': 22.0, AVG: .307, OBP: .390, SLG: .447, OPS: .837, 'wRC+': 129, bWAR: 4.1 },
  { Year: 2010, Age: 27, G: 157, PA: 670, HR: 29, RBI: 103, SB: 19, 'BB%': 10.0, 'K%': 23.6, AVG: .283, OBP: .354, SLG: .503, OPS: .856, 'wRC+': 129, bWAR: 3.7 },
  { Year: 2011, Age: 28, G: 102, PA: 447, HR: 14, RBI: 61,  SB: 13, 'BB%': 13.4, 'K%': 20.4, AVG: .254, OBP: .345, SLG: .427, OPS: .771, 'wRC+': 118, bWAR: 2.3 },
  { Year: 2012, Age: 29, G: 156, PA: 670, HR: 21, RBI: 93,  SB: 15, 'BB%': 10.6, 'K%': 17.9, AVG: .306, OBP: .391, SLG: .492, OPS: .883, 'wRC+': 141, bWAR: 6.7 },
  { Year: 2013, Age: 30, G: 112, PA: 490, HR: 18, RBI: 58,  SB: 17, 'BB%': 10.8, 'K%': 17.8, AVG: .307, OBP: .390, SLG: .514, OPS: .904, 'wRC+': 147, bWAR: 5.1 },
  { Year: 2014, Age: 31, G: 134, PA: 586, HR: 8,  RBI: 63,  SB: 8,  'BB%': 9.6,  'K%': 17.6, AVG: .269, OBP: .324, SLG: .374, OPS: .698, 'wRC+': 100, bWAR: 1.9 },
  { Year: 2015, Age: 32, G: 38,  PA: 170, HR: 5,  RBI: 17,  SB: 2,  'BB%': 11.2, 'K%': 15.3, AVG: .289, OBP: .379, SLG: .434, OPS: .813, 'wRC+': 132, bWAR: 0.8 },
  { Year: 2016, Age: 33, G: 37,  PA: 164, HR: 7,  RBI: 14,  SB: 1,  'BB%': 10.4, 'K%': 20.7, AVG: .226, OBP: .350, SLG: .438, OPS: .788, 'wRC+': 114, bWAR: 0.4 },
  { Year: 2018, Age: 35, G: 2,   PA: 9,   HR: 0,  RBI: 1,   SB: 0,  'BB%': 0.0,  'K%': 33.3, AVG: .000, OBP: .000, SLG: .000, OPS: .000, 'wRC+': -100, bWAR: -0.1 },
];

const CAREER_ROW = {
  Year: 'Career', Age: '—', G: 1585, PA: 6911, HR: 242, RBI: 970, SB: 196,
  'BB%': 11.0, 'K%': 18.5, AVG: .296, OBP: .376, SLG: .491, OPS: .867, 'wRC+': 133, bWAR: 54.6,
};

const SIMILAR_PLAYERS = [
  { initials: 'SR', name: 'Scott Rolen', meta: '3B · 1996–2012 · 70.1 bWAR', score: 972, mets: false },
  { initials: 'RS', name: 'Ron Santo',   meta: '3B · 1960–1974 · 70.5 bWAR', score: 951, mets: false },
  { initials: 'EM', name: 'Edgar Martinez', meta: 'DH · 1987–2004 · 68.4 bWAR', score: 948, mets: false },
  { initials: 'HJ', name: 'Howard Johnson', meta: '3B · 1982–1995 · 35.9 bWAR', score: 935, mets: true },
  { initials: 'EL', name: 'Evan Longoria',  meta: '3B · 2008–2023 · 58.8 bWAR', score: 924, mets: false },
];

const AWARDS = [
  ['2007', 'NL Silver Slugger · NL Gold Glove · All-Star'],
  ['2008', 'NL Silver Slugger · NL Gold Glove · All-Star'],
  ['2009', 'NL All-Star'],
  ['2010', 'NL All-Star'],
  ['2012', 'NL All-Star · MVP (6th)'],
  ['2013', 'NL All-Star · Mets Captain'],
  ['2022', 'Mets Hall of Fame'],
];

const POSTSEASON = [
  ['Series Played', '3'], ['Games', '17'], ['Slash Line', '.231/.317/.354'],
  ['HR', '1'], ['2015 WS', '.208 / 1 HR'],
];

const COMMENT_TAGS = ['Career', 'Postseason', 'Off-field', 'Tribute'];

const TAG_COLORS = {
  'Career':     { bg: '#DBEAFE', fg: '#002D72' },
  'Postseason': { bg: '#FEE2E2', fg: '#B91C1C' },
  'Off-field':  { bg: '#DCFCE7', fg: '#166534' },
  'Tribute':    { bg: '#FEF3C7', fg: '#92400E' },
};

const AVATAR_COLORS = ['#002D72', '#FF5910', '#10B981', '#8B5CF6', '#EC4899', '#0EA5E9'];

const NOW = Date.now();
const INITIAL_COMMENTS = [
  {
    id: 1,
    user: 'CitiFieldKid',
    initials: 'CK',
    color: '#FF5910',
    timestamp: NOW - 1000 * 60 * 60 * 4,
    text: "Saw his last game in 2018 — left no dry eye in the stadium. Forever the Captain.",
    likes: 47,
    tag: 'Tribute',
    canDelete: false,
  },
  {
    id: 2,
    user: 'MetsFan86',
    initials: 'MF',
    color: '#002D72',
    timestamp: NOW - 1000 * 60 * 60 * 26,
    text: "Wright belongs in Cooperstown, not just the Mets HOF. Injuries cut his career short, but at his peak (2007–2008), he was the best player in the NL — 8.3 bWAR is no joke.",
    likes: 24,
    tag: 'Career',
    canDelete: false,
  },
  {
    id: 3,
    user: 'Amazin84',
    initials: 'A8',
    color: '#10B981',
    timestamp: NOW - 1000 * 60 * 60 * 24 * 3,
    text: "His 2012 comeback season is so underrated. 6.7 bWAR after the back issues started — pure determination.",
    likes: 12,
    tag: 'Career',
    canDelete: false,
  },
  {
    id: 4,
    user: 'FlushingForever',
    initials: 'FF',
    color: '#8B5CF6',
    timestamp: NOW - 1000 * 60 * 60 * 24 * 5,
    text: "Anyone else still get chills watching the 2015 NLCS clincher? Wright's HR off Arrieta in Game 1 of that WS was magic.",
    likes: 31,
    tag: 'Postseason',
    canDelete: false,
  },
];

const CAREER_ARC_DATA = {
  labels: SEASONS.map(s => String(s.Year)).concat(['2017']),
  wright:  [...SEASONS.slice(0,13).map(s => s.bWAR), null, SEASONS[13].bWAR],
  league:  [2.2, 2.3, 2.1, 2.4, 2.0, 2.2, 2.1, 2.0, 2.3, 2.2, 2.1, 2.0, 2.1, 2.2, 2.1],
};

const STAT_COLUMNS = ['Year','Age','G','PA','HR','RBI','SB','BB%','K%','AVG','OBP','SLG','OPS','wRC+','bWAR'];

const TABS = ['Profile','Standard','Advanced','Splits','Game Logs','Postseason','Awards','Media'];

/* ============================================================
 * HELPERS
 * ============================================================ */
function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  const w = Math.floor(d / 7);
  if (w < 4) return w + 'w ago';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function makeInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return name.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function pickColor(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function useClickOutside(ref, handler) {
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [ref, handler]);
}

/* ============================================================
 * COMPONENTS
 * ============================================================ */

function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  return (
    <div className="user-menu" ref={ref}>
      <button
        className="user-avatar-btn"
        style={{ background: user.color }}
        onClick={() => setOpen(o => !o)}
        title={user.name}>
        {user.initials}
      </button>
      {open && (
        <div className="user-dropdown">
          <div className="user-dropdown-header">
            <div className="user-dropdown-name">{user.name}</div>
            <div className="user-dropdown-handle">@{user.handle}</div>
          </div>
          <button>My Profile</button>
          <button>My Comments</button>
          <button>Followed Players</button>
          <button>Settings</button>
          <button className="signout" onClick={() => { setOpen(false); onSignOut(); }}>Sign Out</button>
        </div>
      )}
    </div>
  );
}

function ShareButton({ playerName, onQuoteShare }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<any>(null);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const text = `${playerName} on UltimateMets — career stats, percentile rankings, and fan discussion`;

  return (
    <div className="share-wrap" ref={ref}>
      <button className="header-action-btn" onClick={() => setOpen(o => !o)}>↗ Share</button>
      {open && (
        <div className="share-popover">
          <button onClick={() => { navigator.clipboard?.writeText(url); showToast('Link copied to clipboard'); setOpen(false); }}>
            <span className="share-icon">🔗</span>Copy link
          </button>
          <button onClick={() => { window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank'); setOpen(false); }}>
            <span className="share-icon">𝕏</span>Share to X
          </button>
          <button onClick={() => { window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank'); setOpen(false); }}>
            <span className="share-icon">f</span>Share to Facebook
          </button>
          <button onClick={() => { window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text + ' ' + url)}`, '_blank'); setOpen(false); }}>
            <span className="share-icon">🦋</span>Share to Bluesky
          </button>
          <button onClick={() => { onQuoteShare(); setOpen(false); }}>
            <span className="share-icon">💬</span>Quote &amp; Comment
          </button>
        </div>
      )}
      {toast && <div className="share-toast">{toast}</div>}
    </div>
  );
}

function CommentForm({ user, onPost, onSignInClick, autoFocus }) {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('Career');
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && taRef.current && user) taRef.current.focus();
  }, [autoFocus, user]);

  if (!user) {
    return (
      <div className="comment-prompt">
        Want to join the discussion?{' '}
        <strong onClick={onSignInClick}>Sign in</strong> to post your take on {PLAYER.name}.
      </div>
    );
  }

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onPost({ text: trimmed, tag });
    setText('');
  };

  return (
    <div className="comment-form">
      <div className="comment-form-top">
        <div className="comment-avatar" style={{ background: user.color }}>{user.initials}</div>
        <textarea
          ref={taRef}
          value={text}
          placeholder={`Share your take on ${PLAYER.name}...`}
          onChange={e => setText(e.target.value)}
          maxLength={500} />
      </div>
      <div className="comment-form-row">
        <div className="comment-tags">
          {COMMENT_TAGS.map(t => (
            <button key={t}
                    className={'comment-tag-pick' + (tag === t ? ' active' : '')}
                    onClick={() => setTag(t)}>
              {t}
            </button>
          ))}
        </div>
        <button className="comment-post-btn" onClick={submit} disabled={!text.trim()}>
          Post {text.trim() && <span style={{opacity:0.7, marginLeft:4, fontSize:11}}>{text.length}/500</span>}
        </button>
      </div>
    </div>
  );
}

function CommentItem({ comment, currentUser, onLike, onDelete }) {
  const tagColor = TAG_COLORS[comment.tag] || TAG_COLORS.Career;
  const isMine = currentUser && comment.user === currentUser.name;
  return (
    <div className="comment">
      <div className="comment-avatar" style={{ background: comment.color }}>{comment.initials}</div>
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-user">{comment.user}</span>
          <span className="comment-time">· {timeAgo(comment.timestamp)}</span>
          <span className="comment-tag" style={{ background: tagColor.bg, color: tagColor.fg }}>{comment.tag}</span>
          {isMine && <span className="comment-time" style={{color: 'var(--mets-orange)', fontWeight: 600}}>· You</span>}
        </div>
        <div className="comment-text">{comment.text}</div>
        <div className="comment-actions">
          <button
            className={'comment-action' + (comment.likedByMe ? ' liked' : '')}
            onClick={() => onLike(comment.id)}>
            {comment.likedByMe ? '♥' : '♡'} {comment.likes}
          </button>
          <button className="comment-action">↩ Reply</button>
          <button className="comment-action">↗ Share</button>
          {isMine && <button className="comment-action danger" onClick={() => onDelete(comment.id)}>🗑 Delete</button>}
        </div>
      </div>
    </div>
  );
}

function CommentSection({ comments, user, onSignInClick, onPost, onLike, onDelete, formAutoFocus }) {
  const [sort, setSort] = useState('newest');
  const sorted = useMemo(() => {
    const copy = [...comments];
    if (sort === 'top') copy.sort((a, b) => b.likes - a.likes);
    else copy.sort((a, b) => b.timestamp - a.timestamp);
    return copy;
  }, [comments, sort]);

  return (
    <Card title={`Fan Discussion · ${comments.length}`} action="ⓘ community guidelines">
      <CommentForm user={user} onPost={onPost} onSignInClick={onSignInClick} autoFocus={formAutoFocus} />
      <div className="comments-toolbar">
        <div className="comments-count">
          <strong>{comments.length}</strong> comments about {PLAYER.name}
        </div>
        <div className="comments-sort">
          <button className={sort === 'newest' ? 'active' : ''} onClick={() => setSort('newest')}>Newest</button>
          <button className={sort === 'top' ? 'active' : ''} onClick={() => setSort('top')}>Top</button>
        </div>
      </div>
      {sorted.map(c => (
        <CommentItem key={c.id} comment={c} currentUser={user} onLike={onLike} onDelete={onDelete} />
      ))}
    </Card>
  );
}

function PlayerHeader({ player, actions }) {
  return (
    <section className="player-header">
      {actions && <div className="header-actions">{actions}</div>}
      <div className="player-header-inner">
        <div className="player-photo">{player.initials}</div>
        <div className="player-info">
          <h1>{player.name}<span className="number">#{player.number}</span></h1>
          <div className="player-meta">
            <span><strong>{player.position}</strong></span>
            <span>Bats: <strong>{player.bats}</strong></span>
            <span>Throws: <strong>{player.throws}</strong></span>
            <span>{player.height}, {player.weight}</span>
            <span>Born: <strong>{player.born}</strong> · {player.birthplace}</span>
            <span>Debut: <strong>{player.debut}</strong></span>
            <span>{player.seasons}</span>
          </div>
          <div className="player-honors">
            {player.honors.map(h => <span key={h} className="badge">{h}</span>)}
          </div>
        </div>
      </div>
    </section>
  );
}

function Tabs({ tabs, active, onChange }) {
  return (
    <nav className="tabs">
      <div className="tabs-inner">
        {tabs.map(t => (
          <button
            key={t}
            className={'tab' + (active === t ? ' active' : '')}
            onClick={() => onChange(t)}>
            {t}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Card({ title, action, children }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        {action && <button className="card-action">{action}</button>}
      </div>
      {children}
    </div>
  );
}

function CareerArcChart({ data }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'David Wright bWAR',
            data: data.wright,
            borderColor: '#FF5910',
            backgroundColor: 'rgba(255,89,16,0.12)',
            borderWidth: 3,
            tension: 0.35,
            pointRadius: 5,
            pointHoverRadius: 8,
            pointBackgroundColor: '#FF5910',
            pointBorderColor: 'white',
            pointBorderWidth: 2,
            fill: true,
            spanGaps: true,
          },
          {
            label: 'League Avg 3B',
            data: data.league,
            borderColor: '#002D72',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleFont: { weight: 'bold', size: 13 },
            bodyFont: { size: 12 },
            padding: 12,
            cornerRadius: 6,
            callbacks: {
              label: c => c.parsed.y === null
                ? c.dataset.label + ': DNP (injury)'
                : c.dataset.label + ': ' + c.parsed.y.toFixed(1)
            },
          },
        },
        scales: {
          y: {
            title: { display: true, text: 'bWAR', font: {size: 11, weight: 600}, color: '#6B7280' },
            grid: { color: '#F3F4F6' },
            ticks: { font: { family: "'Roboto Mono'", size: 11 }, color: '#6B7280' },
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: "'Roboto Mono'", size: 11 }, color: '#6B7280' },
          },
        },
      },
    } as any);

    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  return (
    <Card title="Career Arc · bWAR by Season" action="Switch metric ▾">
      <div className="chart-container"><canvas ref={canvasRef} /></div>
      <div className="chart-legend">
        <div className="legend-item"><div className="legend-dot" style={{background:'#FF5910'}} />David Wright bWAR</div>
        <div className="legend-item"><div className="legend-line" style={{borderColor:'#002D72'}} />League Avg 3B</div>
        <div className="legend-item"><div className="legend-dot" style={{background:'#9CA3AF'}} />Replacement Level (0)</div>
      </div>
    </Card>
  );
}

function PercentilesCard({ percentiles }) {
  return (
    <Card title="Career Percentile Rankings · vs. all 3B since 1962" action="ⓘ how is this calculated">
      {percentiles.map(p => (
        <div className="pct-row" key={p.label}>
          <div className="pct-label">{p.label}</div>
          <div className="pct-bar-track">
            <div className="pct-bar-marker" style={{ left: p.value + '%' }} />
          </div>
          <div className="pct-value">{p.value}</div>
        </div>
      ))}
      <div className="pct-help">
        <span>← Lower (Worse)</span>
        <span>50 = League Avg</span>
        <span>Higher (Better) →</span>
      </div>
    </Card>
  );
}

function fmtCell(col, val) {
  if (val === null || val === undefined) return '—';
  if (['AVG','OBP','SLG','OPS'].includes(col)) {
    return val === 0 ? '.000' : val.toFixed(3).replace(/^0/, '');
  }
  if (['BB%','K%','bWAR'].includes(col)) return Number(val).toFixed(1);
  return val;
}

function StatsTable({ rows, careerRow, columns }) {
  const [sortCol, setSortCol] = useState<any>(null);
  const [sortDir, setSortDir] = useState('desc');

  const sortedRows = useMemo(() => {
    if (!sortCol) return rows;
    const sorted = [...rows].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return sorted;
  }, [rows, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  return (
    <Card title="Year-by-Year Standard Batting" action="Share & Export ▾">
      <div className="table-wrap">
        <table className="stats">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col}
                    className={sortCol === col ? 'sorted' : ''}
                    onClick={() => handleSort(col)}>
                  {col}
                  <span className="sort-arrow">
                    {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr key={row.Year} className="linkable-row"
                  onClick={() => window.location.href = '/seasons'}
                  title={'Open ' + row.Year + ' season'}>
                {columns.map((col, idx) => {
                  const isLeader = row.leaders && row.leaders.includes(col);
                  const cell = fmtCell(col, row[col]);
                  if (idx === 0) {
                    return <td key={col}><span className="linkable" style={{fontWeight:600}}>{cell}</span></td>;
                  }
                  return <td key={col}>{isLeader ? <span className="leader-cell">{cell}</span> : cell}</td>;
                })}
              </tr>
            ))}
            <tr className="career-total">
              {columns.map(col => <td key={col}>{fmtCell(col, careerRow[col])}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatList({ title, items, action }) {
  return (
    <Card title={title} action={action}>
      {items.map(([lbl, val]) => (
        <div className="sidebar-stat" key={lbl}>
          <span className="lbl">{lbl}</span>
          <span className="val">{val}</span>
        </div>
      ))}
    </Card>
  );
}

function SimilarPlayers({ players }) {
  return (
    <Card title="Similar Players" action="view all">
      {players.map(p => (
        <a className="similar-player" href="/players" key={p.name}>
          <div className={'sim-avatar' + (p.mets ? ' mets' : '')}>{p.initials}</div>
          <div className="sim-info">
            <div className="name">{p.name}</div>
            <div className="meta">{p.meta}</div>
          </div>
          <div className="sim-score">{p.score}</div>
        </a>
      ))}
    </Card>
  );
}

function Awards({ awards }) {
  return (
    <Card title="Awards & Honors">
      {awards.map(([year, text]) => (
        <div className="award-item" key={year + text}>
          <span className="award-year">{year}</span>
          <span>{text}</span>
        </div>
      ))}
    </Card>
  );
}

/* ============================================================
 * PAGE
 * ============================================================ */
export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState('Profile');
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [formAutoFocus, setFormAutoFocus] = useState(0);

  const handleSignIn = (email) => {
    const name = (email || '').split('@')[0] || 'User';
    setUser({
      name,
      handle: name.toLowerCase().replace(/\s+/g, '_'),
      initials: makeInitials(name),
      color: pickColor(name),
    });
    setShowSignIn(false);
  };

  const handleSignOut = () => {
    setComments(cs => cs.map(c => ({ ...c, likedByMe: false })));
    setUser(null);
  };

  const handlePost = ({ text, tag }) => {
    if (!user) { setShowSignIn(true); return; }
    setComments(cs => [{
      id: Date.now(),
      user: user.name,
      initials: user.initials,
      color: user.color,
      timestamp: Date.now(),
      text,
      likes: 0,
      tag,
      canDelete: true,
    }, ...cs]);
  };

  const handleLike = (id) => {
    if (!user) { setShowSignIn(true); return; }
    setComments(cs => cs.map(c => c.id === id
      ? { ...c, likes: c.likes + (c.likedByMe ? -1 : 1), likedByMe: !c.likedByMe }
      : c));
  };

  const handleDelete = (id) => {
    setComments(cs => cs.filter(c => c.id !== id));
  };

  const handleQuoteShare = () => {
    if (!user) setShowSignIn(true);
    else {
      setActiveTab('Profile');
      setFormAutoFocus(n => n + 1);
      setTimeout(() => {
        document.querySelector('.comment-form textarea')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }
  };

  const headerActions = (
    <>
      <ShareButton playerName={PLAYER.name} onQuoteShare={handleQuoteShare} />
      <button
        className={'header-action-btn' + (user ? ' primary' : '')}
        onClick={() => !user && setShowSignIn(true)}>
        {user ? '★ Following' : '☆ Follow'}
      </button>
    </>
  );

  return (
    <>
      <PlayerHeader player={PLAYER} actions={headerActions} />
      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <main className="main">
        <div className="content">
          <CareerArcChart data={CAREER_ARC_DATA} />
          <PercentilesCard percentiles={PERCENTILES} />
          <StatsTable rows={SEASONS} careerRow={CAREER_ROW} columns={STAT_COLUMNS} />
          <CommentSection
            comments={comments}
            user={user}
            onSignInClick={() => setShowSignIn(true)}
            onPost={handlePost}
            onLike={handleLike}
            onDelete={handleDelete}
            formAutoFocus={formAutoFocus} />
        </div>
        <aside className="sidebar">
          <StatList title="Career Totals" items={CAREER_TOTALS} />
          <SimilarPlayers players={SIMILAR_PLAYERS} />
          <Awards awards={AWARDS} />
          <StatList title="Postseason Snapshot" items={POSTSEASON} />
        </aside>
      </main>
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} onSignIn={handleSignIn} />}
    </>
  );
}
