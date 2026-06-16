"use client";
import "./styles.css";
import { useState, useRef, useEffect, useMemo } from "react";
import Chart from "chart.js/auto";
import SignInModal from "@/components/SignInModal";

const GAME = {
  date: 'October 25, 1986',
  venue: 'Shea Stadium, Flushing, NY',
  attendance: '55,078',
  weather: '56°F, partly cloudy',
  series: '1986 World Series · Game 6',
  homeTeam: { abbr: 'NYM', name: 'Mets', record: 'World Series 3-3', logoText: 'NYM', runs: 6, hits: 8, errors: 2 },
  awayTeam: { abbr: 'BOS', name: 'Red Sox', record: 'World Series 3-3', logoText: 'BOS', runs: 5, hits: 13, errors: 3 },
  innings: ['1','2','3','4','5','6','7','8','9','10'],
  awayLine:  [2,0,0,0,0,0,1,0,0,2],
  homeLine:  [0,0,0,0,2,0,0,1,0,3],
  duration: '4:02',
};

// Win Expectancy data — Mets WE through the game.
// Carefully crafted to reflect real swings, w/ the famous 10th-inning collapse-and-comeback.
const WE_DATA = [
  { idx: 0,  inning: 'Pre-game',   we: 50, label: 'First pitch' },
  { idx: 1,  inning: 'Top 1',      we: 30, label: 'Evans 2-run HR (BOS 2-0)' },
  { idx: 2,  inning: 'End 1',      we: 32, label: 'End of 1st' },
  { idx: 3,  inning: 'End 2',      we: 30 },
  { idx: 4,  inning: 'End 3',      we: 33 },
  { idx: 5,  inning: 'End 4',      we: 31 },
  { idx: 6,  inning: 'Bot 5',      we: 50, label: 'Mets tie 2-2 (Henderson)' },
  { idx: 7,  inning: 'End 5',      we: 50 },
  { idx: 8,  inning: 'End 6',      we: 48 },
  { idx: 9,  inning: 'Top 7',      we: 32, label: 'Henderson sac fly (BOS 3-2)' },
  { idx: 10, inning: 'End 7',      we: 30 },
  { idx: 11, inning: 'Bot 8',      we: 52, label: 'Carter sac fly ties 3-3' },
  { idx: 12, inning: 'End 8',      we: 50 },
  { idx: 13, inning: 'End 9',      we: 50 },
  { idx: 14, inning: 'Top 10',     we: 22, label: 'Henderson HR (BOS 4-3)' },
  { idx: 15, inning: 'Top 10',     we: 8,  label: 'Boggs RBI 2B (BOS 5-3)' },
  { idx: 16, inning: 'End Top 10', we: 9,  label: 'Sox lead 5-3' },
  { idx: 17, inning: 'Bot 10',     we: 6,  label: 'Backman flies out (1 out)' },
  { idx: 18, inning: 'Bot 10',     we: 4,  label: 'Hernandez flies out (2 out)' },
  { idx: 19, inning: 'Bot 10',     we: 8,  label: 'Carter singles' },
  { idx: 20, inning: 'Bot 10',     we: 14, label: 'Mitchell singles, Carter to 2B' },
  { idx: 21, inning: 'Bot 10',     we: 28, label: 'Knight singles, Carter scores (BOS 5-4)' },
  { idx: 22, inning: 'Bot 10',     we: 53, label: 'Wild pitch! Mitchell scores, ties 5-5' },
  { idx: 23, inning: 'Bot 10',     we: 100, label: "Buckner E! Wilson grounder, Knight scores. METS WIN 6-5" },
];

const KEY_PLAYS = [
  { weSwing: '+25', dir: 'massive', inning: 'Bot 10, 2 out', desc: 'Mookie Wilson grounder rolls through Bill Buckner — Ray Knight scores. METS WIN.', anchor: 23 },
  { weSwing: '+25', dir: 'up',      inning: 'Bot 10, 2 out', desc: 'Wild pitch from Bob Stanley scores Kevin Mitchell, ties game 5-5.', anchor: 22 },
  { weSwing: '+14', dir: 'up',      inning: 'Bot 10, 2 out', desc: 'Ray Knight singles to center, Gary Carter scores. Sox lead cut to 5-4.', anchor: 21 },
  { weSwing: '−16', dir: 'down',    inning: 'Top 10',        desc: 'Dave Henderson HR off Rick Aguilera — Sox take 4-3 lead.', anchor: 14 },
  { weSwing: '+22', dir: 'up',      inning: 'Bot 8',         desc: 'Gary Carter sacrifice fly ties game 3-3.', anchor: 11 },
  { weSwing: '−20', dir: 'down',    inning: 'Top 1',         desc: 'Dwight Evans 2-run home run — Sox jump to 2-0 lead.', anchor: 1 },
];

// 10th inning play-by-play
const PBP_10TH = [
  { id: 22001, half: 'top',    time: '11:55 PM', batter: 'Henderson', desc: 'Henderson homers to LF off Aguilera. ', we: 22, swing: -8 },
  { id: 22002, half: 'top',    time: '11:58 PM', batter: 'Boggs',     desc: 'Boggs doubles to LCF, Boggs scores on Hernandez E.', we: 8,  swing: -14 },
  { id: 22003, half: 'top',    time: '12:01 AM', batter: '—',         desc: 'End of top half. Red Sox lead 5-3.', we: 9,  swing: 0 },
  { id: 22004, half: 'bottom', time: '12:08 AM', batter: 'Backman',   desc: 'Backman flies out to LF. 1 out, none on.', we: 6,  swing: -3 },
  { id: 22005, half: 'bottom', time: '12:11 AM', batter: 'Hernandez', desc: 'Hernandez flies out to deep CF. 2 outs, none on.', we: 4, swing: -2 },
  { id: 22006, half: 'bottom', time: '12:14 AM', batter: 'Carter',    desc: 'Carter singles to LF. Mets stay alive.', we: 8,  swing: 4 },
  { id: 22007, half: 'bottom', time: '12:16 AM', batter: 'Mitchell',  desc: 'Mitchell pinch-hit single, Carter to 2B.', we: 14, swing: 6 },
  { id: 22008, half: 'bottom', time: '12:18 AM', batter: 'Knight',    desc: 'Knight singles to CF, Carter scores. 5-4 Sox.', we: 28, swing: 14 },
  { id: 22009, half: 'bottom', time: '12:23 AM', batter: 'Wilson',    desc: 'Wild pitch from Stanley — Mitchell scores, Knight to 2B. TIED 5-5.', we: 53, swing: 25 },
  { id: 22010, half: 'bottom', time: '12:25 AM', batter: 'Wilson',    desc: 'Wilson hits slow grounder to 1B. Buckner ERROR. Knight scores. METS WIN 6-5.', we: 100, swing: 47 },
];

const STAR_PERFORMERS = [
  { name: 'Ray Knight',   line: '3-for-4, R, RBI, GW run scored', initials: 'RK', team: 'mets' },
  { name: 'Gary Carter',  line: '2 RBI, 2 R, key 8th-inning sac fly', initials: 'GC', team: 'mets' },
  { name: 'Dave Henderson', line: '2-for-5, HR, 2 RBI', initials: 'DH', team: 'sox' },
  { name: 'Mookie Wilson',  line: 'GW grounder · 10-pitch AB vs Stanley', initials: 'MW', team: 'mets' },
];

const NOW = Date.now();
const INITIAL_COMMENTS = [
  { id: 1, user: 'CitiFieldKid', initials: 'CK', color: '#FF5910', timestamp: NOW - 1000*60*60*2, text: "I was 8 years old watching this with my dad. When the ball went through Buckner's legs we both screamed and ran around the apartment.", likes: 89, anchor: 23 },
  { id: 2, user: 'BackbayBum', initials: 'BB', color: '#BD3039', timestamp: NOW - 1000*60*60*5, text: "Forever traumatized. Stanley's wild pitch was actually the bigger swing — Buckner gets all the blame but the game was already tied.", likes: 41, anchor: 22 },
  { id: 3, user: 'Amazin84',  initials: 'A8', color: '#10B981', timestamp: NOW - 1000*60*60*9, text: "Carter's single starts everything. He swore he wouldn't be the last out. 38 years later still chills.", likes: 56, anchor: 21 },
  { id: 4, user: 'StatHeadDave', initials: 'SD', color: '#8B5CF6', timestamp: NOW - 1000*60*60*22, text: "Mets WE bottomed at 4% with 2 outs in the 10th. Per Retrosheet, this is the largest WE comeback in WS history that ends in a walk-off.", likes: 124, anchor: 18 },
  { id: 5, user: 'ShakeyJ',   initials: 'SJ', color: '#EC4899', timestamp: NOW - 1000*60*60*28, text: "Wild that Boggs scored on Hernandez's error in the top of the 10th — that 5th run made it feel completely over.", likes: 18, anchor: 15 },
  { id: 6, user: 'MetsFan86', initials: 'MF', color: '#002D72', timestamp: NOW - 1000*60*60*40, text: "Game 7 is overlooked because Game 6 stole everything. We won the WS! Don't forget the comeback in Game 7 too.", likes: 33, anchor: null },
];

const AVATAR_COLORS = ['#002D72','#FF5910','#10B981','#8B5CF6','#EC4899','#0EA5E9'];

function timeAgo(ts) {
  const s = Math.floor((Date.now()-ts)/1000);
  if (s<60) return 'just now';
  const m = Math.floor(s/60); if (m<60) return m+'m ago';
  const h = Math.floor(m/60); if (h<24) return h+'h ago';
  const d = Math.floor(h/24); if (d<7) return d+'d ago';
  return new Date(ts).toLocaleDateString();
}
function makeInitials(name) { const p=name.trim().split(/\s+/); return (p.length===1?name.slice(0,2):p[0][0]+p.at(-1)[0]).toUpperCase(); }
function pickColor(s) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_COLORS[h%AVATAR_COLORS.length]; }

/* ============= COMPONENTS ============= */

function GameHeader({ game }) {
  return (
    <section className="game-header">
      <div className="header-actions">
        <button className="header-action-btn">↗ Share</button>
        <button className="header-action-btn">★ Save</button>
      </div>
      <div className="game-header-inner">
        <div className="game-tag">{game.series} · FINAL · {game.duration}</div>
        <div className="game-title">Mets walk off Red Sox in 10th — "Game 6"</div>
        <div className="game-sub">{game.date} · {game.venue} · {game.attendance} attendance · {game.weather}</div>
        <div className="scoreboard">
          <div className="team-score">
            <div className="team-logo sox">{game.awayTeam.logoText}</div>
            <div>
              <div className="team-name">Boston Red Sox</div>
              <div className="team-record">Series tied 3-3</div>
            </div>
            <div className="team-runs">{game.awayTeam.runs}</div>
          </div>
          <div className="vs">FINAL · 10</div>
          <div className="team-score">
            <div className="team-runs winner">{game.homeTeam.runs}</div>
            <div>
              <div className="team-name" style={{textAlign:'right'}}>New York Mets</div>
              <div className="team-record" style={{textAlign:'right'}}>WALK-OFF WIN</div>
            </div>
            <div className="team-logo mets">{game.homeTeam.logoText}</div>
          </div>
          <div className="game-status">Walk-off Error</div>
        </div>
      </div>
    </section>
  );
}

function Tabs({ tabs, active, onChange, badges }) {
  return (
    <nav className="tabs">
      <div className="tabs-inner">
        {tabs.map(t => (
          <button key={t} className={'tab' + (active===t?' active':'')} onClick={()=>onChange(t)}>
            {t}
            {badges[t] != null && <span className="pill">{badges[t]}</span>}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Linescore({ game }) {
  const inn = game.innings;
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Linescore</div></div>
      <div style={{overflowX:'auto'}}>
      <table className="linescore">
        <thead><tr><th></th>{inn.map(i=><th key={i}>{i}</th>)}<th>R</th><th>H</th><th>E</th></tr></thead>
        <tbody>
          <tr><td className="team">Red Sox</td>{game.awayLine.map((r,i)=><td key={i}>{r}</td>)}<td className="run-total">{game.awayTeam.runs}</td><td>{game.awayTeam.hits}</td><td>{game.awayTeam.errors}</td></tr>
          <tr><td className="team" style={{color:'var(--mets-orange)',fontWeight:700}}>Mets ★</td>{game.homeLine.map((r,i)=><td key={i} className={r>0&&i===inn.length-1?'winning-run':''}>{r}</td>)}<td className="run-total" style={{color:'var(--mets-orange)'}}>{game.homeTeam.runs}</td><td>{game.homeTeam.hits}</td><td>{game.homeTeam.errors}</td></tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

function WEChart({ data, onPointClick, selectedIdx }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const annotations = data.filter(d => d.label).reduce((acc, d) => {
      acc['lbl_'+d.idx] = {
        type: 'point',
        xValue: d.idx,
        yValue: d.we,
        backgroundColor: d.we === 100 ? '#FF5910' : (d.we < 10 ? '#EF4444' : '#3B82F6'),
        borderColor: 'white',
        borderWidth: 2,
        radius: 6,
      };
      return acc;
    }, {});
    if (selectedIdx != null) {
      annotations.selRing = {
        type: 'point',
        xValue: selectedIdx,
        yValue: data[selectedIdx]?.we ?? 50,
        backgroundColor: 'transparent',
        borderColor: '#FF5910',
        borderWidth: 3,
        radius: 12,
      };
    }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: data.map(d => d.inning),
        datasets: [{
          label: 'Mets Win Expectancy',
          data: data.map(d => d.we),
          borderColor: '#FF5910',
          backgroundColor: 'rgba(255,89,16,0.1)',
          borderWidth: 3,
          tension: 0.25,
          pointRadius: ctx => data[ctx.dataIndex]?.label ? 4 : 2,
          pointHoverRadius: 8,
          pointBackgroundColor: '#FF5910',
          pointBorderColor: 'white',
          pointBorderWidth: 1,
          fill: true,
          stepped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (e, els) => {
          if (els.length) onPointClick(els[0].index);
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827', padding: 12, cornerRadius: 6,
            callbacks: {
              title: items => data[items[0].dataIndex].inning,
              label: c => {
                const d = data[c.dataIndex];
                const lines = ['Mets WE: ' + d.we + '%'];
                if (d.label) lines.push(d.label);
                return lines;
              }
            },
          },
          annotation: { annotations },
        },
        scales: {
          y: { min: 0, max: 100,
               title: { display: true, text: 'Mets Win Expectancy (%)', font:{size:11,weight:600}, color:'#6B7280' },
               grid: { color: '#F3F4F6' },
               ticks: { font: { family: "'Roboto Mono'" }, callback: v => v + '%' } },
          x: { grid: { display: false }, ticks: { font: {size: 10}, maxRotation: 50, minRotation: 35 } }
        }
      }
    } as any);
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data, selectedIdx, onPointClick]);

  return <div className="we-chart-container"><canvas ref={canvasRef} /></div>;
}

function KeyPlays({ plays, onDiscuss }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Biggest Win Expectancy Swings</div>
        <div className="card-action">view all 78 plays →</div>
      </div>
      {plays.map((p, i) => (
        <div key={i} className={'key-play' + (p.dir==='massive'?' massive':'')}>
          <div className={'we-swing ' + p.dir}>{p.weSwing}%</div>
          <div>
            <div className="play-inning">{p.inning}</div>
            <div className="play-desc">{p.desc}</div>
          </div>
          <button className="play-discuss" onClick={()=>onDiscuss(p.anchor)}>💬 Discuss</button>
        </div>
      ))}
    </div>
  );
}

function PBP({ plays, weData, selected, onSelect, commentCounts }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">10th Inning · Play-by-Play</div>
        <div className="card-action">show full game</div>
      </div>
      <div className="pbp-wrap">
        {plays.map(p => {
          const cc = commentCounts[p.id] || 0;
          return (
            <div key={p.id}
                 className={'pbp-row' + (selected===p.id?' selected':'')}
                 onClick={()=>onSelect(p.id)}>
              <div>
                <div className="pbp-time">{p.time}</div>
                <div style={{fontSize:10,color:'var(--text-light)',fontFamily:'var(--num-font)'}}>{p.half==='top'?'T10':'B10'}</div>
              </div>
              <div className="pbp-text">
                {p.batter !== '—' && <span className="batter">{p.batter}: </span>}
                {p.desc}
              </div>
              <div className={'pbp-we'} style={{color: p.we>50?'#10B981':(p.we<20?'#EF4444':'var(--text-muted)')}}>{p.we}%</div>
              <div className={'pbp-comments-pill' + (cc>0?' has':'')}>
                💬 {cc || ''}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{fontSize:11,color:'var(--text-light)',marginTop:10}}>Click a play to discuss it · WE column = Mets win expectancy after the play</div>
    </div>
  );
}

function StarPerformers({ stars }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Top Performers</div></div>
      <div className="stars">
        {stars.map(s => (
          <div className="star-row" key={s.name}>
            <div className="star-avatar" style={{background: s.team==='sox'?'#BD3039':'var(--mets-orange)'}}>{s.initials}</div>
            <div className="star-info">
              <div className="star-name">{s.name}</div>
              <div className="star-line">{s.line}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CommentForm({ user, onPost, onSignInClick, anchor, anchorLabel, onClearAnchor, autoFocus }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus, anchor]);

  if (!user) return (
    <div className="comment-prompt">
      Want to share your take?{' '}<strong onClick={onSignInClick}>Sign in</strong> to discuss this game.
    </div>
  );

  const submit = () => {
    const t = text.trim(); if (!t) return;
    onPost({ text: t, anchor });
    setText('');
  };

  return (
    <div className="comment-form">
      <div className="comment-form-top">
        <div className="comment-avatar" style={{background:user.color}}>{user.initials}</div>
        <textarea ref={ref} value={text} onChange={e=>setText(e.target.value)} placeholder="Share your take on this game..." maxLength={500}/>
      </div>
      <div className="comment-form-row">
        <div className="comment-anchor">
          {anchor != null
            ? <span className="anchor-pill">📍 Replying to: {anchorLabel} <span className="x" onClick={onClearAnchor}>×</span></span>
            : <span style={{color:'var(--text-light)',fontSize:11}}>Tip: click a play above to attach your comment to it</span>}
        </div>
        <button className="comment-post-btn" onClick={submit} disabled={!text.trim()}>Post Comment</button>
      </div>
    </div>
  );
}

function CommentItem({ c, currentUser, onLike, onAnchorClick, anchorLabelFor }) {
  const isMine = currentUser && c.user === currentUser.name;
  return (
    <div className="comment">
      <div className="comment-avatar" style={{background:c.color}}>{c.initials}</div>
      <div className="comment-body">
        <div className="comment-meta">
          <span className="comment-user">{c.user}</span>
          <span className="comment-time">· {timeAgo(c.timestamp)}</span>
          {c.anchor != null && (
            <span className="comment-anchor-tag" onClick={()=>onAnchorClick(c.anchor)}>📍 on {anchorLabelFor(c.anchor)}</span>
          )}
          {isMine && <span className="comment-time" style={{color:'var(--mets-orange)',fontWeight:600}}>· You</span>}
        </div>
        <div className="comment-text">{c.text}</div>
        <div className="comment-actions">
          <button className={'comment-action' + (c.likedByMe?' liked':'')} onClick={()=>onLike(c.id)}>
            {c.likedByMe ? '♥' : '♡'} {c.likes}
          </button>
          <button className="comment-action">↩ Reply</button>
          <button className="comment-action">↗ Share</button>
        </div>
      </div>
    </div>
  );
}

function Discussion({ comments, user, onSignInClick, onPost, onLike, anchor, onAnchorChange, anchorLabel, anchorLabelFor, onAnchorJump, formAutoFocusKey }) {
  const [filter, setFilter] = useState<any>(null); // null = all, or anchor idx
  const filtered = filter != null
    ? comments.filter(c => c.anchor === filter)
    : comments;

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Fan Discussion · {comments.length}</div>
        <div className="card-action">community guidelines ⓘ</div>
      </div>

      <CommentForm
        user={user}
        onPost={onPost}
        onSignInClick={onSignInClick}
        anchor={anchor}
        anchorLabel={anchor != null ? anchorLabel : null}
        onClearAnchor={() => onAnchorChange(null)}
        autoFocus={formAutoFocusKey}
      />

      {filter != null && (
        <div className="filter-bar">
          📍 Showing {filtered.length} comments about <strong>{anchorLabelFor(filter)}</strong>
          <span style={{flex:1}}/>
          <span className="clear" onClick={()=>setFilter(null)}>Show all comments ×</span>
        </div>
      )}

      {filtered.length === 0 && filter != null && (
        <div style={{padding:20,textAlign:'center',color:'var(--text-muted)',fontSize:13}}>
          No comments on this play yet. {user ? 'Be the first!' : <strong onClick={onSignInClick} style={{color:'var(--mets-orange)',cursor:'pointer'}}>Sign in</strong>} to start the conversation.
        </div>
      )}

      {filtered.map(c => (
        <CommentItem
          key={c.id}
          c={c}
          currentUser={user}
          onLike={onLike}
          onAnchorClick={(idx) => { setFilter(idx); onAnchorJump(idx); }}
          anchorLabelFor={anchorLabelFor}
        />
      ))}
    </div>
  );
}

/* ============= APP ============= */

export default function GamesPage() {
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [comments, setComments] = useState(INITIAL_COMMENTS);
  const [activeTab, setActiveTab] = useState('Overview');
  const [selectedPlay, setSelectedPlay] = useState<any>(null); // PBP id (for highlighting + discussion anchor)
  const [discussionAnchor, setDiscussionAnchor] = useState<any>(null); // WE_DATA idx for comment anchor
  const [formFocusKey, setFormFocusKey] = useState(0);

  const commentCountsByPbp = useMemo(() => {
    const map = {};
    comments.forEach(c => {
      // Map WE idx to nearest PBP play id where applicable (rough: 14→top10 plays)
      // For demo simplicity, count comments by exact PBP id match if anchor falls in 17–23 range
      // Use a synthetic mapping
    });
    // Build simpler: count by play id stored separately
    PBP_10TH.forEach(p => { map[p.id] = 0; });
    comments.forEach(c => {
      if (c.anchor == null) return;
      const idx = c.anchor;
      // Map WE idx → PBP id
      const pbpMap = {17:22004, 18:22005, 21:22008, 22:22009, 23:22010, 14:22001, 15:22002};
      const pbpId = pbpMap[idx];
      if (pbpId && map[pbpId] != null) map[pbpId]++;
    });
    return map;
  }, [comments]);

  const anchorLabelFor = (idx) => WE_DATA[idx]?.label || WE_DATA[idx]?.inning || 'play';

  const onSignIn = (email) => {
    const t = (email || '').split('@')[0] || 'Guest';
    setUser({ name: t, handle: t.toLowerCase().replace(/\s+/g,'_'), initials: makeInitials(t), color: pickColor(t) });
    setShowSignIn(false);
  };
  const onSignOut = () => { setComments(cs => cs.map(c => ({...c, likedByMe: false}))); setUser(null); };

  const onPost = ({ text, anchor }) => {
    if (!user) { setShowSignIn(true); return; }
    setComments(cs => [{ id: Date.now(), user: user.name, initials: user.initials, color: user.color, timestamp: Date.now(), text, likes: 0, anchor }, ...cs]);
    setDiscussionAnchor(null);
  };

  const onLike = (id) => {
    if (!user) { setShowSignIn(true); return; }
    setComments(cs => cs.map(c => c.id === id ? { ...c, likes: c.likes + (c.likedByMe ? -1 : 1), likedByMe: !c.likedByMe } : c));
  };

  const handleDiscussFromKeyPlay = (idx) => {
    setDiscussionAnchor(idx);
    setFormFocusKey(k => k+1);
    setTimeout(() => document.querySelector('.comment-form textarea')?.scrollIntoView({behavior:'smooth', block:'center'}), 50);
  };

  const handlePbpSelect = (pbpId) => {
    setSelectedPlay(pbpId);
    // Map PBP id back to WE idx (reverse of pbpMap)
    const reverseMap = {22001:14, 22002:15, 22004:17, 22005:18, 22008:21, 22009:22, 22010:23};
    const weIdx = reverseMap[pbpId];
    if (weIdx != null) {
      setDiscussionAnchor(weIdx);
      setFormFocusKey(k => k+1);
    }
  };

  const handleWePointClick = (idx) => {
    setDiscussionAnchor(idx);
    setFormFocusKey(k => k+1);
    // Also highlight matching PBP if exists
    const pbpMap = {14:22001, 15:22002, 17:22004, 18:22005, 21:22008, 22:22009, 23:22010};
    setSelectedPlay(pbpMap[idx] || null);
    setTimeout(() => document.querySelector('.comment-form textarea')?.scrollIntoView({behavior:'smooth', block:'center'}), 50);
  };

  const handleAnchorJump = (idx) => {
    const pbpMap = {14:22001, 15:22002, 17:22004, 18:22005, 21:22008, 22:22009, 23:22010};
    const pbpId = pbpMap[idx];
    if (pbpId) {
      setSelectedPlay(pbpId);
      setTimeout(() => document.querySelector(`.pbp-row.selected`)?.scrollIntoView({behavior:'smooth', block:'center'}), 50);
    }
  };

  const tabs = ['Overview','Box Score','Play-by-Play','Win Expectancy','Discussion'];
  const tabBadges = { 'Discussion': comments.length };

  return (
    <>
      <GameHeader game={GAME} />
      <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} badges={tabBadges} />
      <main className="main">
        <div className="content">
          <Linescore game={GAME} />

          <div className="card">
            <div className="card-header">
              <div className="card-title">Win Expectancy · Mets</div>
              <div className="card-action">click a point to discuss it</div>
            </div>
            <WEChart data={WE_DATA} onPointClick={handleWePointClick} selectedIdx={discussionAnchor} />
            <div className="we-tip">
              <strong>The most dramatic comeback in WS history.</strong> Mets bottomed out at <strong>4% win expectancy</strong> with two outs in the bottom of the 10th — the largest in-game WE recovery in any World Series walk-off win. Click any point or play to attach your comment to it.
            </div>
          </div>

          <KeyPlays plays={KEY_PLAYS} onDiscuss={handleDiscussFromKeyPlay} />

          <PBP plays={PBP_10TH} weData={WE_DATA} selected={selectedPlay} onSelect={handlePbpSelect} commentCounts={commentCountsByPbp} />

          <Discussion
            comments={comments}
            user={user}
            onSignInClick={()=>setShowSignIn(true)}
            onPost={onPost}
            onLike={onLike}
            anchor={discussionAnchor}
            onAnchorChange={setDiscussionAnchor}
            anchorLabel={discussionAnchor != null ? anchorLabelFor(discussionAnchor) : null}
            anchorLabelFor={anchorLabelFor}
            onAnchorJump={handleAnchorJump}
            formAutoFocusKey={formFocusKey}
          />
        </div>

        <aside className="sidebar">
          <div className="card">
            <div className="card-header"><div className="card-title">Game Info</div></div>
            <div className="sidebar-stat"><span className="lbl">Date</span><span className="val">Oct 25, 1986</span></div>
            <div className="sidebar-stat"><span className="lbl">First pitch</span><span className="val">8:30 PM</span></div>
            <div className="sidebar-stat"><span className="lbl">Final</span><span className="val">12:25 AM</span></div>
            <div className="sidebar-stat"><span className="lbl">Duration</span><span className="val">4:02</span></div>
            <div className="sidebar-stat"><span className="lbl">Attendance</span><span className="val">55,078</span></div>
            <div className="sidebar-stat"><span className="lbl">Umpire</span><span className="val">Dale Ford</span></div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Series Context</div></div>
            <div className="sidebar-stat"><span className="lbl">Coming in</span><span className="val">Sox lead 3-2</span></div>
            <div className="sidebar-stat"><span className="lbl">After this game</span><span className="val">Tied 3-3</span></div>
            <div className="sidebar-stat"><span className="lbl">Game 7 (Oct 27)</span><span className="val" style={{color:'var(--mets-orange)'}}>METS WIN 8-5</span></div>
            <div style={{padding:'10px 0 4px',fontSize:12,color:'var(--text-muted)',lineHeight:1.55}}>
              Mets become 1986 World Series champions. This game is widely considered the most dramatic in MLB postseason history.
            </div>
          </div>

          <StarPerformers stars={STAR_PERFORMERS} />

          <div className="card">
            <div className="card-header"><div className="card-title">Pitching Decisions</div></div>
            <div className="sidebar-stat"><span className="lbl">W</span><span className="val">Aguilera (1-0)</span></div>
            <div className="sidebar-stat"><span className="lbl">L</span><span className="val">Schiraldi (0-1)</span></div>
            <div className="sidebar-stat"><span className="lbl">SV</span><span className="val">—</span></div>
          </div>
        </aside>
      </main>

      {showSignIn && <SignInModal onClose={()=>setShowSignIn(false)} onSignIn={onSignIn} />}
    </>
  );
}
