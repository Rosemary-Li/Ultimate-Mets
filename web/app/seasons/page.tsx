"use client";
import "./styles.css";
import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const TABS = ['Overview','Schedule','Roster','Batting','Pitching','Fielding','Splits','Transactions','Postseason'];

/* ============= DATA — 2015 NYM ============= */
const SEASON = {
  year: 2015,
  team: 'New York Mets',
  record: { w: 90, l: 72, pct: .556 },
  finish: '1st, NL East',
  postseason: 'Lost World Series (4-1) vs. KCR',
  manager: 'Terry Collins',
  gm: 'Sandy Alderson',
  ballpark: 'Citi Field',
  attendance: 2569753,
  attendanceRank: '15th of 30',
  payroll: 101000000,
  rs: 683, ra: 613,
  rsPg: 4.2, raPg: 3.8,
  pythag: { w: 89, l: 73 },
  runDiff: '+70',
  bWAR: 47.8,
};

/* Cumulative games above .500 by date */
const TIMELINE = {
  labels: ['Apr 1','Apr 15','May 1','May 15','Jun 1','Jun 15','Jul 1','Jul 15','Aug 1','Aug 15','Sep 1','Sep 15','Oct 1','Oct 5'],
  diff:    [0, 8, 11, 9, 5, 1, 4, -2, 8, 14, 19, 23, 18, 18],
  ydiff:   [0, 4, 6, 7, 5, 4, 5, 6, 8, 9, 10, 11, 11, 11],
};

const STANDINGS = [
  { team: 'New York Mets',         w: 90, l: 72, pct: .556, gb: '—',   rs: 683, ra: 613, last10: '6-4',  strk: 'L1', us: true },
  { team: 'Washington Nationals',  w: 83, l: 79, pct: .512, gb: '7.0', rs: 703, ra: 635, last10: '4-6',  strk: 'W2', us: false },
  { team: 'Miami Marlins',         w: 71, l: 91, pct: .438, gb: '19.0',rs: 613, ra: 678, last10: '5-5',  strk: 'L1', us: false },
  { team: 'Atlanta Braves',        w: 67, l: 95, pct: .414, gb: '23.0',rs: 573, ra: 760, last10: '4-6',  strk: 'L3', us: false },
  { team: 'Philadelphia Phillies', w: 63, l: 99, pct: .389, gb: '27.0',rs: 626, ra: 809, last10: '6-4',  strk: 'W1', us: false },
];

/* Schedule months — each game: opp, ha (home/away), w/l, score, future flag */
const SCHEDULE = [
  { month: 'April', rec: '15-8', games: [
    {opp:'WSN',h:0,r:'W',score:'3-1'},{opp:'WSN',h:0,r:'W',score:'6-3'},{opp:'WSN',h:0,r:'L',score:'1-2'},
    {opp:'ATL',h:1,r:'W',score:'7-1'},{opp:'ATL',h:1,r:'W',score:'2-0'},{opp:'ATL',h:1,r:'W',score:'4-3'},{opp:'ATL',h:1,r:'W',score:'8-2'},
    {opp:'PHI',h:0,r:'W',score:'8-2'},{opp:'PHI',h:0,r:'W',score:'4-1'},{opp:'PHI',h:0,r:'L',score:'1-2'},
    {opp:'MIA',h:1,r:'W',score:'7-3'},{opp:'MIA',h:1,r:'W',score:'4-1'},{opp:'MIA',h:1,r:'L',score:'2-7'},
    {opp:'NYY',h:0,r:'W',score:'8-2'},{opp:'NYY',h:0,r:'W',score:'5-3'},{opp:'NYY',h:0,r:'L',score:'1-4'},
    {opp:'WSN',h:1,r:'W',score:'6-3'},{opp:'WSN',h:1,r:'W',score:'5-2'},{opp:'WSN',h:1,r:'L',score:'2-3'},
    {opp:'CHC',h:0,r:'W',score:'4-3'},{opp:'CHC',h:0,r:'L',score:'2-6'},{opp:'STL',h:0,r:'L',score:'0-3'},{opp:'STL',h:0,r:'L',score:'1-9'},
  ]},
  { month: 'May', rec: '15-12', games: Array.from({length: 27}, (_,i) => {
    const opps=['BAL','MIL','SDP','PHI','MIA','PIT','LAD','SFG','STL','CHC','PIT','MIA'];
    const win = [1,1,0,1,1,0,0,1,1,1,0,1,0,1,1,1,0,0,1,0,1,0,1,0,1,1,1][i];
    return {opp:opps[i%opps.length],h:i%2,r:win?'W':'L',score:win?`${4+i%4}-${1+i%3}`:`${1+i%3}-${4+i%4}`};
  })},
  { month: 'June', rec: '11-15', games: Array.from({length: 26}, (_,i) => {
    const opps=['MIA','SDP','ARI','SFG','LAD','TOR','ATL','CHC','PIT','TBR'];
    const win = [0,1,0,1,0,0,1,0,0,1,0,1,1,0,0,1,0,0,1,1,0,1,0,1,0,1][i];
    return {opp:opps[i%opps.length],h:i%2,r:win?'W':'L',score:win?`${3+i%5}-${1+i%2}`:`${1+i%3}-${4+i%5}`};
  })},
  { month: 'July', rec: '13-13', games: Array.from({length: 26}, (_,i) => {
    const opps=['LAD','SFG','ARI','WSN','SDP','COL','PHI','LAA','WSN'];
    const win = [0,1,1,0,0,1,0,1,1,0,0,1,1,1,0,1,1,0,0,1,0,1,0,1,1,0][i];
    return {opp:opps[i%opps.length],h:i%2,r:win?'W':'L',score:win?`${4+i%3}-${1+i%2}`:`${1+i%2}-${4+i%4}`};
  })},
  { month: 'Aug', rec: '20-8', games: Array.from({length: 28}, (_,i) => {
    const opps=['WSN','TBR','PIT','MIA','COL','ARI','BAL','PHI','BOS','MIA'];
    const win = [1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,0,1][i];
    return {opp:opps[i%opps.length],h:i%2,r:win?'W':'L',score:win?`${5+i%4}-${1+i%2}`:`${1+i%2}-${4+i%3}`};
  })},
  { month: 'Sept', rec: '16-12', games: Array.from({length: 28}, (_,i) => {
    const opps=['MIA','WSN','ATL','MIA','PHI','ATL','WSN','CIN','PHI'];
    const win = [1,1,1,1,0,1,0,1,1,1,1,0,1,1,1,1,0,1,0,1,1,1,1,0,1,0,1,1][i];
    return {opp:opps[i%opps.length],h:i%2,r:win?'W':'L',score:win?`${4+i%3}-${2+i%2}`:`${2+i%2}-${4+i%3}`};
  })},
];

const POSTSEASON_GAMES = [
  {opp:'LAD',r:'L',score:'1-3',label:'NLDS G1'},
  {opp:'LAD',r:'W',score:'5-2',label:'NLDS G2'},
  {opp:'LAD',r:'W',score:'13-7',label:'NLDS G3'},
  {opp:'LAD',r:'L',score:'1-3',label:'NLDS G4'},
  {opp:'LAD',r:'W',score:'3-2',label:'NLDS G5'},
  {opp:'CHC',r:'W',score:'4-2',label:'NLCS G1'},
  {opp:'CHC',r:'W',score:'4-1',label:'NLCS G2'},
  {opp:'CHC',r:'W',score:'5-2',label:'NLCS G3'},
  {opp:'CHC',r:'W',score:'8-3',label:'NLCS G4'},
  {opp:'KCR',r:'L',score:'4-5',label:'WS G1'},
  {opp:'KCR',r:'L',score:'1-7',label:'WS G2'},
  {opp:'KCR',r:'W',score:'9-3',label:'WS G3'},
  {opp:'KCR',r:'L',score:'3-5',label:'WS G4'},
  {opp:'KCR',r:'L',score:'2-7',label:'WS G5'},
];

const BAT_LEADERS = [
  { name: 'Yoenis Cespedes',  pos: 'OF', stat: 'HR',  val: 17,  leader: true,  note: 'in 57 G' },
  { name: 'Lucas Duda',       pos: '1B', stat: 'HR',  val: 27,  leader: false },
  { name: 'Curtis Granderson',pos: 'OF', stat: 'HR',  val: 26,  leader: false },
  { name: 'Daniel Murphy',    pos: '2B', stat: 'AVG', val: .281, leader: true },
  { name: 'David Wright',     pos: '3B', stat: 'OBP', val: .379, leader: true },
  { name: 'Travis d\'Arnaud', pos: 'C',  stat: 'SLG', val: .485, leader: false },
];
const BAT_TABLE = [
  { name: 'Lucas Duda',        pos: '1B', G: 135, PA: 530, HR: 27, RBI: 73, SB: 0,  AVG: .244, OBP: .352, SLG: .486, OPS: .838, wRC: 130, bWAR: 2.6 },
  { name: 'Curtis Granderson', pos: 'RF', G: 157, PA: 682, HR: 26, RBI: 70, SB: 11, AVG: .259, OBP: .364, SLG: .457, OPS: .821, wRC: 124, bWAR: 4.4 },
  { name: 'Yoenis Cespedes',   pos: 'CF', G: 57,  PA: 249, HR: 17, RBI: 44, SB: 3,  AVG: .287, OBP: .337, SLG: .604, OPS: .942, wRC: 161, bWAR: 3.0 },
  { name: 'Daniel Murphy',     pos: '2B', G: 130, PA: 538, HR: 14, RBI: 73, SB: 2,  AVG: .281, OBP: .322, SLG: .449, OPS: .770, wRC: 110, bWAR: 1.4 },
  { name: 'Travis d\'Arnaud',  pos: 'C',  G: 67,  PA: 268, HR: 12, RBI: 41, SB: 0,  AVG: .268, OBP: .340, SLG: .485, OPS: .825, wRC: 130, bWAR: 1.7 },
  { name: 'David Wright',      pos: '3B', G: 38,  PA: 170, HR: 5,  RBI: 17, SB: 2,  AVG: .289, OBP: .379, SLG: .434, OPS: .813, wRC: 129, bWAR: 0.8 },
  { name: 'Wilmer Flores',     pos: 'SS', G: 137, PA: 510, HR: 16, RBI: 59, SB: 0,  AVG: .263, OBP: .295, SLG: .408, OPS: .703, wRC: 92,  bWAR: 1.0 },
  { name: 'Michael Conforto',  pos: 'LF', G: 56,  PA: 194, HR: 9,  RBI: 26, SB: 0,  AVG: .270, OBP: .335, SLG: .506, OPS: .841, wRC: 132, bWAR: 1.3 },
];

const PIT_TABLE = [
  { name: 'Jacob deGrom',   pos: 'SP', W: 14, L: 8,  GS: 30, IP: 191.0, K: 205, BB: 38, ERA: 2.54, WHIP: 0.99, FIP: 2.70, bWAR: 5.7 },
  { name: 'Matt Harvey',    pos: 'SP', W: 13, L: 8,  GS: 29, IP: 189.1, K: 188, BB: 37, ERA: 2.71, WHIP: 1.02, FIP: 3.05, bWAR: 5.0 },
  { name: 'Noah Syndergaard',pos:'SP', W: 9,  L: 7,  GS: 24, IP: 150.0, K: 166, BB: 31, ERA: 3.24, WHIP: 1.05, FIP: 3.25, bWAR: 3.1 },
  { name: 'Bartolo Colon',  pos: 'SP', W: 14, L: 13, GS: 31, IP: 194.2, K: 136, BB: 24, ERA: 4.16, WHIP: 1.24, FIP: 3.71, bWAR: 2.5 },
  { name: 'Jonathon Niese', pos: 'SP', W: 9,  L: 10, GS: 29, IP: 176.2, K: 113, BB: 38, ERA: 4.13, WHIP: 1.34, FIP: 4.24, bWAR: 1.0 },
  { name: 'Jeurys Familia', pos: 'CL', W: 2,  L: 2,  GS: 0,  IP: 78.0,  K: 86,  BB: 19, ERA: 1.85, WHIP: 0.99, FIP: 2.74, bWAR: 2.4 },
  { name: 'Tyler Clippard', pos: 'RP', W: 1,  L: 2,  GS: 0,  IP: 32.1,  K: 32,  BB: 12, ERA: 3.06, WHIP: 1.02, FIP: 4.23, bWAR: 0.4 },
];

const TRANSACTIONS = [
  { date: 'Jul 31', tag: 'TRADED', text: <>Acquired OF <strong>Yoenis Cespedes</strong> from Detroit Tigers for RHP Michael Fulmer & RHP Luis Cessa.</> },
  { date: 'Jul 31', tag: 'TRADED', text: <>Acquired UT <strong>Juan Uribe</strong> & RHP Kelly Johnson from Atlanta for INF Eric Campbell & RHP John Gant.</> },
  { date: 'Jul 24', tag: 'TRADED', text: <>Acquired SS <strong>Tyler Clippard</strong> from Oakland for RHP Casey Meisner.</> },
  { date: 'Jul 24', tag: 'TRADED', text: <>Acquired OF <strong>Kelly Johnson</strong> from Atlanta in earlier deal.</> },
  { date: 'Jun 12', tag: 'CALL-UP',text: <>Called up RHP <strong>Noah Syndergaard</strong> — major-league debut May 12.</> },
  { date: 'Apr 8',  tag: 'CALL-UP',text: <>Called up OF <strong>Michael Conforto</strong> from Double-A — debut Jul 24.</> },
  { date: 'Mar 28', tag: 'SIGNED', text: <>Re-signed C <strong>Anthony Recker</strong> to 1-year deal.</> },
];

const AWARDS = [
  { i: '🏆', who: 'Daniel Murphy', what: 'NLCS MVP — 7 HR through NLDS+NLCS' },
  { i: '⚾', who: 'Jacob deGrom',  what: 'NL All-Star starter · 4th in Cy Young' },
  { i: '⚾', who: 'Matt Harvey',   what: 'NL All-Star · Comeback Player of the Year' },
  { i: '🏆', who: 'Terry Collins', what: 'NL Manager of the Year (2nd)' },
  { i: '⚾', who: 'Jeurys Familia',what: 'NL Reliever finalist · 43 saves' },
];

const MOMENTS = [
  { date: 'Jul 31', title: 'Cespedes trade', desc: 'Sandy Alderson swings deadline deal that ignites a 20-8 August surge.' },
  { date: 'Aug 24', title: 'Wilmer\'s tears game', desc: 'Wilmer Flores cries on field after near-trade — hits walk-off HR vs. Nationals 2 days later.' },
  { date: 'Sep 26', title: 'NL East clincher', desc: 'Mets clinch the division at Cincinnati. First NL East title since 2006.' },
  { date: 'Oct 15', title: 'NLDS G5', desc: 'Jacob deGrom outduels Zack Greinke in LA, sending Mets to NLCS.' },
];

/* ============= COMPONENTS ============= */
function SeasonHeader() {
  return (
    <section className="season-header">
      <div className="season-header-inner">
        <div className="season-crumb"><a href="#">Seasons</a> › 2010s › <strong style={{color:'white'}}>2015</strong></div>
        <div className="season-title-row">
          <h1 className="season-title"><span className="year">2015</span>New York Mets</h1>
          <div className="season-record-pill">
            <span className="rec">{SEASON.record.w}–{SEASON.record.l}</span>
            <span className="pct">.{(SEASON.record.pct*1000).toFixed(0)}</span>
          </div>
        </div>
        <div className="season-meta">
          <span><strong>{SEASON.finish}</strong></span>
          <span>{SEASON.postseason}</span>
          <span>Manager: <strong>{SEASON.manager}</strong></span>
          <span>GM: <strong>{SEASON.gm}</strong></span>
          <span>{SEASON.ballpark}</span>
        </div>
        <div className="season-honors">
          <span className="badge">NL East Champions</span>
          <span className="badge">NL Pennant</span>
          <span className="badge">5th World Series Appearance</span>
          <span className="badge">Daniel Murphy NLCS MVP</span>
        </div>
        <div className="season-nav">
          <button>← 2014 (79–83)</button>
          <button>2016 (87–75) →</button>
          <button>Compare seasons</button>
        </div>
      </div>
    </section>
  );
}

function StatStrip() {
  const cells = [
    { lbl: 'Run Diff',     val: '+70',    sub: '683 RS / 613 RA',   trend: 'up' },
    { lbl: 'Pythag W-L',   val: '89–73',  sub: '1 W luckier than expected' },
    { lbl: 'Team OPS',     val: '.712',   sub: '7th in NL' },
    { lbl: 'Team ERA',     val: '3.43',   sub: '2nd in NL',          trend: 'up' },
    { lbl: 'Team bWAR',    val: '47.8',   sub: 'Bat 18.6 · Pit 22.4 · Def 6.8' },
    { lbl: 'Attendance',   val: '2.57M',  sub: '15th of 30 · 31,725/g' },
  ];
  return (
    <div className="stat-strip">
      <div className="stat-strip-inner">
        {cells.map((c,i) => (
          <div className="strip-cell" key={i}>
            <div className="strip-lbl">{c.lbl}</div>
            <div className="strip-val">{c.val}</div>
            <div className="strip-sub">
              {c.trend && <span className={'strip-trend ' + c.trend}>{c.trend==='up'?'▲ ':'▼ '}</span>}
              {c.sub}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tabs({ active, onChange }) {
  return (
    <nav className="tabs">
      <div className="tabs-inner">
        {TABS.map(t => (
          <a key={t} className={'tab ' + (t===active?'active':'')} onClick={e=>{e.preventDefault(); onChange(t);}} href="#">{t}</a>
        ))}
      </div>
    </nav>
  );
}

function TimelineChart() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current;
    if (!ctx) return;
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: TIMELINE.labels,
        datasets: [
          { label: '2015 Mets (games above .500)', data: TIMELINE.diff,
            borderColor: '#FF5910', backgroundColor: 'rgba(255,89,16,0.12)', borderWidth: 3,
            tension: 0.35, pointRadius: 4, pointBackgroundColor: '#FF5910', pointBorderColor: 'white',
            pointBorderWidth: 2, fill: true },
          { label: '2014 Mets', data: TIMELINE.ydiff,
            borderColor: '#9CA3AF', borderWidth: 2, borderDash: [5,5], pointRadius: 0, fill: false, tension: 0.4 },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: '#111827', padding: 10, cornerRadius: 6 },
        },
        scales: {
          y: { title: { display: true, text: 'Games above .500', font:{size:11,weight:600}, color:'#6B7280' },
               grid: { color: '#F3F4F6' }, ticks: { font: { family: "'Roboto Mono'", size: 11 }, color: '#6B7280' } },
          x: { grid: { display: false }, ticks: { font: { family: "'Roboto Mono'", size: 11 }, color: '#6B7280' } },
        }
      }
    } as any);
    return () => chart.destroy();
  }, []);
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Season Trajectory · Games above .500</div>
        <div className="card-action">Compare another season ▾</div>
      </div>
      <div className="timeline-container"><canvas ref={ref}></canvas></div>
      <div className="timeline-legend">
        <div className="legend-item"><span className="legend-dot" style={{background:'#FF5910'}}></span>2015 NYM (peaked +23 on Sept 15)</div>
        <div className="legend-item"><span className="legend-dot" style={{background:'#9CA3AF'}}></span>2014 NYM (79–83)</div>
      </div>
    </div>
  );
}

function StandingsCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Final Standings · NL East</div>
        <div className="card-action">View full league →</div>
      </div>
      <table className="standings">
        <thead>
          <tr><th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th><th>RS</th><th>RA</th><th>Last 10</th><th>Strk</th></tr>
        </thead>
        <tbody>
          {STANDINGS.map((s,i) => (
            <tr key={s.team} className={s.us?'us':''}>
              <td><span className="rank">{i+1}.</span>{s.team}</td>
              <td>{s.w}</td><td>{s.l}</td><td>.{(s.pct*1000).toFixed(0)}</td><td>{s.gb}</td>
              <td>{s.rs}</td><td>{s.ra}</td><td>{s.last10}</td><td>{s.strk}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ScheduleCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Schedule & Results · 162 games</div>
        <div className="card-action">Filter: All · Home · Away</div>
      </div>
      {SCHEDULE.map(m => (
        <div className="schedule-month" key={m.month}>
          <div className="schedule-month-head">
            <span className="schedule-month-name">{m.month}</span>
            <span className="schedule-month-rec">{m.rec}</span>
          </div>
          <div className="schedule-grid">
            {m.games.map((g,i) => (
              <div key={i} className={'game-cell ' + (g.r==='W'?'win':'loss')} title={`${g.h?'vs':'@'} ${g.opp} · ${g.score}`}>
                <span className="opp">{g.h?'':'@'}{g.opp}</span>
                <span className="score">{g.score}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="schedule-month">
        <div className="schedule-month-head">
          <span className="schedule-month-name" style={{color:'var(--mets-orange)'}}>Postseason</span>
          <span className="schedule-month-rec">9–5</span>
        </div>
        <div className="schedule-grid">
          {POSTSEASON_GAMES.map((g,i) => (
            <a key={i} href="/games"
               className={'game-cell playoff ' + (g.r==='W'?'win':'loss')}
               style={{textDecoration:'none'}}
               title={`Open ${g.label} vs ${g.opp} · ${g.score}`}>
              <span className="opp">{g.opp}</span>
              <span className="score">{g.score}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadersCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Team Leaders · 2015</div>
        <div className="card-action">Full team stats →</div>
      </div>
      <div className="leaders-grid">
        <div className="leaders-block">
          <h4>Batting</h4>
          <table className="mini">
            <thead><tr><th>Player</th><th>G</th><th>HR</th><th>RBI</th><th>AVG</th><th>OPS</th><th>bWAR</th></tr></thead>
            <tbody>
              {BAT_TABLE.map((p,i) => (
                <tr key={p.name} className="linkable-row" onClick={()=> window.location.href = '/players'}>
                  <td><span className="rk">{i+1}.</span><span className="linkable">{p.name}</span><span className="pos">{p.pos}</span></td>
                  <td>{p.G}</td>
                  <td className={p.HR>=20?'leader':''}>{p.HR}</td>
                  <td>{p.RBI}</td>
                  <td>{p.AVG.toFixed(3).replace(/^0/,'')}</td>
                  <td>{p.OPS.toFixed(3).replace(/^0/,'')}</td>
                  <td>{p.bWAR.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="leaders-block">
          <h4>Pitching</h4>
          <table className="mini">
            <thead><tr><th>Player</th><th>W-L</th><th>IP</th><th>K</th><th>ERA</th><th>WHIP</th><th>bWAR</th></tr></thead>
            <tbody>
              {PIT_TABLE.map((p,i) => (
                <tr key={p.name} className="linkable-row" onClick={()=> window.location.href = '/players'}>
                  <td><span className="rk">{i+1}.</span><span className="linkable">{p.name}</span><span className="pos">{p.pos}</span></td>
                  <td>{p.W}-{p.L}</td>
                  <td>{p.IP.toFixed(1)}</td>
                  <td className={p.K>=180?'leader':''}>{p.K}</td>
                  <td className={p.ERA<3?'leader':''}>{p.ERA.toFixed(2)}</td>
                  <td>{p.WHIP.toFixed(2)}</td>
                  <td>{p.bWAR.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PostseasonCard() {
  const series = [
    { round: 'NLDS',   opp: 'vs LAD', result: 'won', score: '3-2', games: ['L','W','W','L','W'], mvp: 'Daniel Murphy (.333, 3 HR)' },
    { round: 'NLCS',   opp: 'vs CHC', result: 'won', score: '4-0 sweep', games: ['W','W','W','W'], mvp: 'Daniel Murphy — NLCS MVP (.529, 4 HR)' },
    { round: 'WS',     opp: 'vs KCR', result: 'lost',score: '1-4',  games: ['L','L','W','L','L'], mvp: 'KC: Salvador Perez (WS MVP)' },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Postseason Path · 2015</div>
        <div className="card-action">Open WS recap →</div>
      </div>
      {series.map((s,i) => (
        <div key={i} className={'pseries ' + (s.result==='lost'?'lost':'')}>
          <div className="pseries-tag">
            <div className="round">{s.round}</div>
            <div className="opp">{s.opp}</div>
          </div>
          <div className="pseries-body">
            <div className="pseries-result">
              {s.result==='won' ? <span className="won">WON {s.score}</span> : <span className="lost">LOST {s.score}</span>}
            </div>
            <div className="pseries-games">
              {s.games.map((g,j) => <div key={j} className={'pseries-game ' + g.toLowerCase()}>{g}</div>)}
            </div>
            <div className="pseries-mvp">MVP / Standout: <strong>{s.mvp}</strong></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionsCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Notable Transactions</div>
        <div className="card-action">Show all 47 →</div>
      </div>
      <div className="txn-list">
        {TRANSACTIONS.map((t,i) => (
          <div className="txn-item" key={i}>
            <span className="txn-date">{t.date}</span>
            <span className={'txn-tag ' + t.tag.toLowerCase().replace('-','')}>{t.tag}</span>
            <span className="txn-text">{t.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="card">
        <div className="card-header"><div className="card-title">At a Glance</div></div>
        <div className="sidebar-stat"><span className="lbl">Manager</span><span className="val">T. Collins</span></div>
        <div className="sidebar-stat"><span className="lbl">GM</span><span className="val">S. Alderson</span></div>
        <div className="sidebar-stat"><span className="lbl">Ballpark</span><span className="val">Citi Field</span></div>
        <div className="sidebar-stat"><span className="lbl">Payroll</span><span className="val">$101M (21st)</span></div>
        <div className="sidebar-stat"><span className="lbl">Attendance</span><span className="val">2,569,753</span></div>
        <div className="sidebar-stat"><span className="lbl">Avg / Game</span><span className="val">31,725</span></div>
        <div className="sidebar-stat"><span className="lbl">Players Used</span><span className="val">52</span></div>
        <div className="sidebar-stat"><span className="lbl">Pitchers Used</span><span className="val">28</span></div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Awards & Honors</div></div>
        {AWARDS.map((a,i) => (
          <div className="award-row" key={i}>
            <div className="award-icon">{a.i}</div>
            <div>
              <div className="who">{a.who}</div>
              <div className="what">{a.what}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Defining Moments</div></div>
        {MOMENTS.map((m,i) => (
          <div className="moment-card" key={i}>
            <div className="moment-date">{m.date}, 2015</div>
            <div className="moment-title">{m.title}</div>
            <div className="moment-desc">{m.desc}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Related</div></div>
        <a href="#" className="moment-card" style={{display:'block',textDecoration:'none'}}>
          <div className="moment-date">Same era</div>
          <div className="moment-title">2016 Wild Card season →</div>
        </a>
        <a href="#" className="moment-card" style={{display:'block',textDecoration:'none'}}>
          <div className="moment-date">Franchise</div>
          <div className="moment-title">All NL East titles (1969, 73, 86, 88, 06, 15) →</div>
        </a>
      </div>
    </aside>
  );
}

export default function SeasonsPage() {
  const [tab, setTab] = useState('Overview');
  return (
    <>
      <SeasonHeader />
      <Tabs active={tab} onChange={setTab} />
      <StatStrip />
      <main className="main">
        <div className="content">
          <TimelineChart />
          <StandingsCard />
          <LeadersCard />
          <ScheduleCard />
          <PostseasonCard />
          <TransactionsCard />
        </div>
        <Sidebar />
      </main>
    </>
  );
}
