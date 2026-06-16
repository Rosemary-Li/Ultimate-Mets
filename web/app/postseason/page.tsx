"use client";
import "./styles.css";
import { useState, useMemo } from "react";

const SUBNAV = ['Overview','All Series','Series Hub','Career Leaders','Single-Series Records','Famous Moments'];

/* ============= DATA ============= */
const ALL_SERIES = [
  // year, round, opp, result(W/L), score, mvp, note, classification (champ/penn/lcs/ds/wc)
  { year: 1969, round: 'NLCS', opp: 'Atlanta Braves',     res: 'W', score: '3-0', mvp: 'Tommie Agee', note: 'First-ever NL East champ',     cls: 'champ', regSeason: '100-62' },
  { year: 1969, round: 'WS',   opp: 'Baltimore Orioles',  res: 'W', score: '4-1', mvp: 'Donn Clendenon', note: '"Miracle Mets" — first title',cls: 'champ', regSeason: '100-62' },
  { year: 1973, round: 'NLCS', opp: 'Cincinnati Reds',    res: 'W', score: '3-2', mvp: 'Rusty Staub',  note: '"Ya Gotta Believe"',          cls: 'penn',  regSeason: '82-79' },
  { year: 1973, round: 'WS',   opp: 'Oakland Athletics',  res: 'L', score: '3-4', mvp: 'OAK: Reggie Jackson', note: '7-game heartbreak',    cls: 'penn',  regSeason: '82-79' },
  { year: 1986, round: 'NLCS', opp: 'Houston Astros',     res: 'W', score: '4-2', mvp: 'Mike Scott (HOU)', note: 'G6: 16-inning epic',      cls: 'champ', regSeason: '108-54' },
  { year: 1986, round: 'WS',   opp: 'Boston Red Sox',     res: 'W', score: '4-3', mvp: 'Ray Knight',   note: 'Mookie\'s grounder, G6',      cls: 'champ', regSeason: '108-54' },
  { year: 1988, round: 'NLCS', opp: 'Los Angeles Dodgers',res: 'L', score: '3-4', mvp: 'LA: Orel Hershiser',  note: '7-game upset',         cls: 'lcs',   regSeason: '100-60' },
  { year: 1999, round: 'NLDS', opp: 'Arizona D\'backs',   res: 'W', score: '3-1', mvp: 'Todd Pratt',   note: 'Walkoff HR off Mantei',       cls: 'lcs',   regSeason: '97-66 (WC)' },
  { year: 1999, round: 'NLCS', opp: 'Atlanta Braves',     res: 'L', score: '2-4', mvp: 'ATL: Eddie Perez',    note: 'G6: 11-inning loss',   cls: 'lcs',   regSeason: '97-66 (WC)' },
  { year: 2000, round: 'NLDS', opp: 'San Francisco Giants',res:'W', score: '3-1', mvp: 'B. Agbayani', note: '13th-inning walkoff G3',       cls: 'penn',  regSeason: '94-68 (WC)' },
  { year: 2000, round: 'NLCS', opp: 'St. Louis Cardinals',res: 'W', score: '4-1', mvp: 'Mike Hampton', note: '11-IP shutout in clincher',   cls: 'penn',  regSeason: '94-68 (WC)' },
  { year: 2000, round: 'WS',   opp: 'New York Yankees',   res: 'L', score: '1-4', mvp: 'NYY: Derek Jeter',    note: 'Subway Series',        cls: 'penn',  regSeason: '94-68 (WC)' },
  { year: 2006, round: 'NLDS', opp: 'Los Angeles Dodgers',res: 'W', score: '3-0', mvp: 'Carlos Delgado',note: 'Sweep on the road',          cls: 'lcs',   regSeason: '97-65' },
  { year: 2006, round: 'NLCS', opp: 'St. Louis Cardinals',res: 'L', score: '3-4', mvp: 'STL: Suppan',  note: 'G7: Beltran called K',        cls: 'lcs',   regSeason: '97-65' },
  { year: 2015, round: 'NLDS', opp: 'Los Angeles Dodgers',res: 'W', score: '3-2', mvp: 'Daniel Murphy',note: 'Murphy 3 HR, deGrom G5',      cls: 'penn',  regSeason: '90-72' },
  { year: 2015, round: 'NLCS', opp: 'Chicago Cubs',       res: 'W', score: '4-0', mvp: 'Daniel Murphy',note: 'NLCS MVP — sweep',            cls: 'penn',  regSeason: '90-72' },
  { year: 2015, round: 'WS',   opp: 'Kansas City Royals', res: 'L', score: '1-4', mvp: 'KC: Salvador Perez',  note: '8th-inning collapse G4',cls: 'penn', regSeason: '90-72' },
  { year: 2016, round: 'WC',   opp: 'San Francisco Giants',res:'L', score: '0-1', mvp: 'SF: Madison Bumgarner',note: 'Bumgarner 4-hit SHO', cls: 'wc',    regSeason: '87-75' },
  { year: 2022, round: 'WC',   opp: 'San Diego Padres',   res: 'L', score: '1-2', mvp: 'SD: Joe Musgrove',    note: 'Musgrove G3 vs deGrom',cls: 'wc',    regSeason: '101-61' },
  { year: 2024, round: 'WC',   opp: 'Milwaukee Brewers',  res: 'W', score: '2-1', mvp: 'Pete Alonso',  note: 'Alonso 9th-inning 3-run HR G3',cls: 'lcs',  regSeason: '89-73 (WC)' },
  { year: 2024, round: 'NLDS', opp: 'Philadelphia Phillies',res:'W',score: '3-1', mvp: 'Francisco Lindor',note: 'Lindor grand slam G4',     cls: 'lcs',   regSeason: '89-73 (WC)' },
  { year: 2024, round: 'NLCS', opp: 'Los Angeles Dodgers',res: 'L', score: '2-4', mvp: 'LA: Tommy Edman',     note: 'Edman .407, Dodgers',  cls: 'lcs',   regSeason: '89-73 (WC)' },
];

/* Aggregated postseason years for hero stats */
const POSTSEASON_YEARS = [...new Set(ALL_SERIES.map(s=>s.year))]; // 11 appearances

/* Year cards */
const YEAR_CARDS = [
  { year: 1969, rec: '100-62', cls: 'champ', tag: 'WORLD CHAMPIONS', hero: 'Tom Seaver — 25 wins' },
  { year: 1973, rec: '82-79',  cls: 'pennant', tag: 'NL Pennant',     hero: 'Tug McGraw' },
  { year: 1986, rec: '108-54', cls: 'champ', tag: 'WORLD CHAMPIONS', hero: 'Carter, Hernandez, Doc' },
  { year: 1988, rec: '100-60', cls: '',        tag: 'NLCS — lost',    hero: 'Strawberry, Gooden' },
  { year: 1999, rec: '97-66',  cls: '',        tag: 'NLCS — lost',    hero: 'Piazza, Pratt walkoff' },
  { year: 2000, rec: '94-68',  cls: 'pennant', tag: 'NL Pennant',     hero: 'Subway Series' },
  { year: 2006, rec: '97-65',  cls: '',        tag: 'NLCS — lost',    hero: 'Beltran, Reyes' },
  { year: 2015, rec: '90-72',  cls: 'pennant', tag: 'NL Pennant',     hero: 'Murphy, Harvey, deGrom' },
  { year: 2016, rec: '87-75',  cls: '',        tag: 'Wild Card — lost',hero: 'Bumgarner shut us out' },
  { year: 2022, rec: '101-61', cls: '',        tag: 'Wild Card — lost',hero: 'deGrom, Scherzer' },
  { year: 2024, rec: '89-73',  cls: '',        tag: 'NLCS — lost',    hero: 'Lindor, Alonso, OMG' },
];

const CAREER_BAT_LEADERS = [
  { name: 'David Wright',    pos: '3B', G: 17, PA: 67, H: 14, HR: 1, RBI: 6,  AVG: .231, OBP: .317, SLG: .354, OPS: .671 },
  { name: 'Daniel Murphy',   pos: '2B', G: 14, PA: 64, H: 21, HR: 7, RBI: 11, AVG: .328, OBP: .391, SLG: .724, OPS: 1.115 },
  { name: 'Carlos Beltran',  pos: 'CF', G: 11, PA: 49, H: 14, HR: 3, RBI: 8,  AVG: .296, OBP: .388, SLG: .574, OPS: .962 },
  { name: 'Mike Piazza',     pos: 'C',  G: 17, PA: 64, H: 14, HR: 4, RBI: 11, AVG: .230, OBP: .333, SLG: .443, OPS: .776 },
  { name: 'Lenny Dykstra',   pos: 'CF', G: 17, PA: 71, H: 22, HR: 3, RBI: 7,  AVG: .344, OBP: .394, SLG: .500, OPS: .894 },
  { name: 'Gary Carter',     pos: 'C',  G: 13, PA: 53, H: 12, HR: 3, RBI: 12, AVG: .240, OBP: .302, SLG: .440, OPS: .742 },
  { name: 'Keith Hernandez', pos: '1B', G: 13, PA: 56, H: 14, HR: 0, RBI: 4,  AVG: .280, OBP: .375, SLG: .380, OPS: .755 },
  { name: 'Cleon Jones',     pos: 'LF', G: 8,  PA: 31, H: 10, HR: 0, RBI: 4,  AVG: .345, OBP: .387, SLG: .448, OPS: .835 },
  { name: 'Pete Alonso',     pos: '1B', G: 4,  PA: 18, H: 6,  HR: 2, RBI: 5,  AVG: .375, OBP: .444, SLG: .813, OPS: 1.257 },
  { name: 'Francisco Lindor',pos: 'SS', G: 13, PA: 59, H: 15, HR: 4, RBI: 12, AVG: .283, OBP: .356, SLG: .547, OPS: .903 },
];

const CAREER_PIT_LEADERS = [
  { name: 'Tom Seaver',     G: 5, GS: 5, IP: 38.0, K: 36, W: 2, L: 2, ERA: 2.84, WHIP: 1.16 },
  { name: 'Jerry Koosman',  G: 4, GS: 4, IP: 31.2, K: 26, W: 3, L: 0, ERA: 2.39, WHIP: 1.20 },
  { name: 'Dwight Gooden',  G: 8, GS: 8, IP: 47.1, K: 40, W: 1, L: 3, ERA: 4.18, WHIP: 1.41 },
  { name: 'Ron Darling',    G: 6, GS: 6, IP: 37.0, K: 18, W: 1, L: 3, ERA: 3.16, WHIP: 1.24 },
  { name: 'Sid Fernandez',  G: 5, GS: 3, IP: 17.2, K: 19, W: 1, L: 0, ERA: 2.55, WHIP: 1.19 },
  { name: 'Jacob deGrom',   G: 5, GS: 5, IP: 32.0, K: 38, W: 3, L: 1, ERA: 2.81, WHIP: 1.03 },
  { name: 'Matt Harvey',    G: 4, GS: 4, IP: 26.2, K: 22, W: 0, L: 1, ERA: 3.04, WHIP: 1.27 },
  { name: 'Noah Syndergaard',G:5, GS: 4, IP: 21.0, K: 27, W: 1, L: 1, ERA: 2.57, WHIP: 1.10 },
  { name: 'John Franco',    G:13, GS: 0, IP: 13.1, K: 12, W: 1, L: 1, ERA: 2.70, WHIP: 1.20 },
];

const FAMOUS_MOMENTS = [
  { date: 'Oct 25, 1986', title: 'Bill Buckner\'s grounder', desc: 'Mookie Wilson\'s slow roller in WS Game 6 trickles through Buckner\'s legs, scoring Ray Knight from second to win the game and force a Game 7.', meta: 'WS G6 · 10th inning · Win Probability: 0% → 100%', img: '⚾', featured: true },
  { date: 'Oct 19, 1969', title: 'Cleon Jones makes the catch', desc: 'Jones squeezes the final out against the Orioles in WS G5 — first championship in franchise history, completing the "Miracle."', meta: 'WS G5 · vs BAL · Final out', img: '🏆' },
  { date: 'Oct 17, 1999', title: 'Todd Pratt walkoff HR', desc: 'Backup catcher Pratt sends a pitch from Matt Mantei over the center-field wall to clinch NLDS G4 vs Arizona.', meta: 'NLDS G4 · 10th inning · Walkoff', img: 'TP' },
  { date: 'Oct 21, 2015', title: 'Daniel Murphy\'s 6th straight HR', desc: 'Murphy ties an MLB postseason record with a HR in 6 consecutive games, sealing his NLCS MVP performance.', meta: 'NLCS G4 · vs CHC · Murphy: .529, 4 HR series', img: 'DM' },
  { date: 'Oct 19, 1986', title: 'Mike Scott vs the Mets', desc: 'Astros ace Mike Scott had Mets so spooked they NEEDED to win in 6 games to avoid him in G7. The 16-inning G6 was one of the greatest games ever played.', meta: 'NLCS G6 · 16 innings · WIN', img: '6' },
  { date: 'Oct 9, 2024', title: 'Lindor\'s grand slam', desc: 'Francisco Lindor blasts a 6th-inning grand slam off Carlos Estévez to clinch NLDS G4 vs Philadelphia.', meta: 'NLDS G4 · vs PHI · 6th inning', img: 'FL' },
];

/* ============= COMPONENTS ============= */
function Hero() {
  const wins = ALL_SERIES.filter(s=>s.res==='W').length;
  const losses = ALL_SERIES.filter(s=>s.res==='L').length;
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-crumb">Mets Database › <strong style={{color:'white'}}>Postseason</strong></div>
        <h1 className="hero-title">Postseason History</h1>
        <p className="hero-sub">11 postseason appearances since 1962. 5 NL pennants, 2 World Series titles. Every series, every game, every legendary moment in one place.</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="num">11</div>
            <div className="lbl">Postseason Appearances</div>
            <div className="sub">1969 → 2024</div>
          </div>
          <div className="hero-stat">
            <div className="num">2</div>
            <div className="lbl">World Series Titles</div>
            <div className="sub">1969 · 1986</div>
          </div>
          <div className="hero-stat">
            <div className="num">5</div>
            <div className="lbl">NL Pennants</div>
            <div className="sub">'69, '73, '86, '00, '15</div>
          </div>
          <div className="hero-stat">
            <div className="num">{wins}–{losses}</div>
            <div className="lbl">All-Time Series Record</div>
            <div className="sub">{(wins/(wins+losses)*100).toFixed(1)}%</div>
          </div>
          <div className="hero-stat">
            <div className="num">62–73</div>
            <div className="lbl">Postseason Game Record</div>
            <div className="sub">.459 win pct</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SubNav() {
  const [active, setActive] = useState('Series Hub');
  return (
    <nav className="subnav">
      <div className="subnav-inner">
        {SUBNAV.map(s => (
          <a key={s} className={'subnav-item ' + (s===active?'active':'')} onClick={e=>{e.preventDefault(); setActive(s);}} href="#">{s}</a>
        ))}
      </div>
    </nav>
  );
}

function YearTimeline({ selectedYear, onSelect }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All Postseason Appearances · 11 years</div>
        <div className="pill-toggle">
          <button className="active">Chronological</button>
          <button>By Result</button>
        </div>
      </div>
      <div className="timeline">
        {YEAR_CARDS.map(y => (
          <div key={y.year}
               className={'year-card ' + (y.cls) + (selectedYear===y.year?' selected':'')}
               onClick={() => onSelect(y.year)}>
            <div className="year-num">{y.year}</div>
            <div className="year-rec">{y.rec}</div>
            <div className={'year-result ' + (y.cls==='champ'?'champ':y.cls==='pennant'?'penn':y.tag.includes('NLCS')?'lcs':y.tag.includes('NLDS')?'ds':'wc')}>{y.tag.split(' ')[0]==='WORLD'?'CHAMPS':y.tag.split(' — ')[0]}</div>
            <div className="year-mvp">{y.hero}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeriesDetail({ year }) {
  const yearSeries = ALL_SERIES.filter(s => s.year === year);
  if (yearSeries.length === 0) return null;
  const yearMeta = YEAR_CARDS.find(y => y.year === year);
  return (
    <>
      {yearSeries.map((s, idx) => {
        const games = parseScoreGames(s.score, s.res);
        return (
          <div key={idx} className="series-detail">
            <div className="series-detail-head">
              <div>
                <div className="series-detail-title">{s.year} {s.round} <span style={{color:'var(--text-muted)',fontWeight:600,fontSize:16}}>vs. {s.opp}</span></div>
                <div className="series-detail-sub">
                  Reg season: {yearMeta?.rec} · {s.note}
                  {' · '}
                  <a href="/seasons" className="linkable" style={{color:'var(--mets-orange)',fontWeight:600,textDecoration:'none'}}>View full {s.year} season →</a>
                </div>
              </div>
              <div className="series-result-big">
                <span className={'verdict ' + (s.res==='W'?'won':'lost')}>{s.res==='W'?'WON':'LOST'}</span>
                <span className="vs">{s.score}</span>
              </div>
            </div>
            <div className="series-games-row">
              {games.map((g, i) => (
                <a key={i} href="/games"
                   className={'series-game-card ' + (g.r==='W'?'win':'loss')}
                   style={{textDecoration:'none', color:'inherit'}}
                   title={'Open Game ' + (i+1) + ' recap'}>
                  <div className="gnum">Game {i+1}</div>
                  <div className="gscore">{g.r}</div>
                  <div className="gloc">{i<2 ? '@ opp' : i<4 ? 'home' : '@ opp'}</div>
                  {i===games.length-1 && <div className="gnote">→ {s.res==='W'?'Series clinch':'Eliminated'}</div>}
                </a>
              ))}
            </div>
            <div style={{marginTop: 14, fontSize: 12.5, color: 'var(--text-muted)'}}>
              <strong style={{color: 'var(--text)'}}>MVP / Standout:</strong> {s.mvp}
            </div>
          </div>
        );
      })}
    </>
  );
}

function parseScoreGames(score, res) {
  const [a, b] = score.split('-').map(Number);
  const games = [];
  if (res === 'W') {
    for (let i=0; i<a; i++) games.push({r:'W'});
    for (let i=0; i<b; i++) games.push({r:'L'});
  } else {
    for (let i=0; i<a; i++) games.push({r:'W'});
    for (let i=0; i<b; i++) games.push({r:'L'});
  }
  return games;
}

function AllSeriesTable({ selectedYear, onSelect }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">All Series — Drill Down</div>
        <div className="card-action">Export CSV</div>
      </div>
      <table className="series-table">
        <thead>
          <tr>
            <th>Year</th><th>Round</th><th>Opponent</th>
            <th>Result</th><th>Score</th><th>MVP / Standout</th><th>Note</th>
          </tr>
        </thead>
        <tbody>
          {ALL_SERIES.map((s,i) => (
            <tr key={i} className={s.year===selectedYear?'selected':''} onClick={()=>onSelect(s.year)}>
              <td><span className="yr">{s.year}</span></td>
              <td><span className={'rd-tag rd-' + s.round}>{s.round}</span></td>
              <td>{s.opp}</td>
              <td><span className={'res ' + s.res.toLowerCase()}>{s.res==='W'?'WON':'LOST'}</span></td>
              <td>{s.score}</td>
              <td>{s.mvp}</td>
              <td style={{color:'var(--text-muted)',fontSize:11.5}}>{s.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CareerLeaders() {
  const [tab, setTab] = useState('Batting');
  const [stat, setStat] = useState('OPS');
  const data = tab === 'Batting' ? CAREER_BAT_LEADERS : CAREER_PIT_LEADERS;
  const sortable = tab === 'Batting' ? ['G','PA','H','HR','RBI','AVG','OBP','SLG','OPS'] : ['G','GS','IP','K','W','L','ERA','WHIP'];
  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a,b) => {
      if (stat === 'ERA' || stat === 'WHIP' || stat === 'L') return a[stat] - b[stat];
      return b[stat] - a[stat];
    });
    return arr;
  }, [data, stat]);
  const isPct = ['AVG','OBP','SLG','OPS'].includes(stat);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Career Postseason Leaders · as a Met</div>
        <div className="pill-toggle">
          <button className={tab==='Batting'?'active':''} onClick={()=>{setTab('Batting'); setStat('OPS');}}>Batting</button>
          <button className={tab==='Pitching'?'active':''} onClick={()=>{setTab('Pitching'); setStat('ERA');}}>Pitching</button>
        </div>
      </div>
      <div style={{marginBottom: 12, display:'flex', gap:8, flexWrap:'wrap', alignItems:'center'}}>
        <span style={{fontSize:12, color:'var(--text-muted)', marginRight:4}}>Sort by:</span>
        {sortable.map(s => (
          <button key={s}
                  onClick={()=>setStat(s)}
                  style={{padding:'4px 10px', fontSize:11.5, fontWeight:600, borderRadius:4,
                          background: stat===s?'var(--mets-orange)':'#F3F4F6',
                          color: stat===s?'white':'var(--text-muted)'}}>{s}</button>
        ))}
      </div>
      <table className="lead">
        <thead>
          <tr>
            <th></th><th>Player</th>
            {tab==='Batting'
              ? ['G','PA','H','HR','RBI','AVG','OBP','SLG','OPS'].map(c => <th key={c}>{c}</th>)
              : ['G','GS','IP','K','W','L','ERA','WHIP'].map(c => <th key={c}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((p,i) => (
            <tr key={p.name} className="linkable-row" onClick={()=> window.location.href = '/players'}>
              <td>{i+1}</td>
              <td><span className="linkable" style={{fontWeight:600}}>{p.name}</span><span className="pos">{p.pos||''}</span></td>
              {tab==='Batting'
                ? ['G','PA','H','HR','RBI','AVG','OBP','SLG','OPS'].map(c => (
                    <td key={c} className={c===stat?'leader-val':''}>
                      {['AVG','OBP','SLG','OPS'].includes(c) ? p[c].toFixed(3).replace(/^0/,'') : p[c]}
                    </td>))
                : ['G','GS','IP','K','W','L','ERA','WHIP'].map(c => (
                    <td key={c} className={c===stat?'leader-val':''}>
                      {c==='IP' ? p[c].toFixed(1) : ['ERA','WHIP'].includes(c) ? p[c].toFixed(2) : p[c]}
                    </td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FamousMoments() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Famous Moments</div>
        <div className="card-action">View all 24 →</div>
      </div>
      {FAMOUS_MOMENTS.map((m,i) => (
        <div key={i} className={'moment-card ' + (m.featured?'featured':'')}>
          <div className="moment-img">{m.img}</div>
          <div>
            <div className="m-date">{m.date}</div>
            <div className="m-title">{m.title}</div>
            <div className="m-desc">{m.desc}</div>
            <div className="m-meta">{m.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Sidebar({ year, onYear }) {
  return (
    <aside>
      <div className="card">
        <div className="card-header"><div className="card-title">Quick Jump</div></div>
        {YEAR_CARDS.slice().reverse().map(y => (
          <a key={y.year} href="#" onClick={e=>{e.preventDefault(); onYear(y.year);}}
             className="opponent-row" style={{textDecoration:'none', color:'inherit'}}>
            <span>
              <span style={{fontFamily:'var(--num-font)', fontWeight:700, marginRight:8, color: year===y.year?'var(--mets-orange)':'var(--mets-blue)'}}>{y.year}</span>
              <span className="opp-name">{y.tag}</span>
            </span>
            <span className="opp-rec">{y.rec}</span>
          </a>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Postseason Records</div></div>
        <div className="sidebar-stat"><span className="lbl">All-Time Series</span><span className="val">11W–11L</span></div>
        <div className="sidebar-stat"><span className="lbl">All-Time Games</span><span className="val">62–73 (.459)</span></div>
        <div className="sidebar-stat"><span className="lbl">Home Record</span><span className="val">35–32</span></div>
        <div className="sidebar-stat"><span className="lbl">Road Record</span><span className="val">27–41</span></div>
        <div className="sidebar-stat"><span className="lbl">Extra-Inning</span><span className="val">5–4</span></div>
        <div className="sidebar-stat"><span className="lbl">One-Run Games</span><span className="val">17–18</span></div>
        <div className="sidebar-stat"><span className="lbl">Shutouts (W/L)</span><span className="val">5 / 8</span></div>
        <div className="sidebar-stat"><span className="lbl">Walk-offs (W/L)</span><span className="val">6 / 4</span></div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Most Faced Opponent</div></div>
        <div className="opponent-row"><span className="opp-name">Los Angeles Dodgers</span><span className="opp-rec bad">2W–2L</span></div>
        <div className="opponent-row"><span className="opp-name">Atlanta Braves</span><span className="opp-rec dom">1W–1L</span></div>
        <div className="opponent-row"><span className="opp-name">St. Louis Cardinals</span><span className="opp-rec">1W–1L</span></div>
        <div className="opponent-row"><span className="opp-name">Houston Astros (NL)</span><span className="opp-rec dom">1W–0L</span></div>
        <div className="opponent-row"><span className="opp-name">Cincinnati Reds</span><span className="opp-rec dom">1W–0L</span></div>
        <div className="opponent-row"><span className="opp-name">Chicago Cubs</span><span className="opp-rec dom">1W–0L</span></div>
        <div className="opponent-row"><span className="opp-name">San Francisco Giants</span><span className="opp-rec">1W–1L</span></div>
        <div className="opponent-row"><span className="opp-name">Arizona Diamondbacks</span><span className="opp-rec dom">1W–0L</span></div>
        <div className="opponent-row"><span className="opp-name">Philadelphia Phillies</span><span className="opp-rec dom">1W–0L</span></div>
        <div className="opponent-row"><span className="opp-name">Milwaukee Brewers</span><span className="opp-rec dom">1W–0L</span></div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">By Round</div></div>
        <div className="sidebar-stat"><span className="lbl">World Series</span><span className="val">2–3</span></div>
        <div className="sidebar-stat"><span className="lbl">LCS</span><span className="val">5–3</span></div>
        <div className="sidebar-stat"><span className="lbl">Division Series</span><span className="val">4–1</span></div>
        <div className="sidebar-stat"><span className="lbl">Wild Card</span><span className="val">1–2</span></div>
      </div>
    </aside>
  );
}

export default function PostseasonPage() {
  const [year, setYear] = useState(1986);
  return (
    <>
      <Hero />
      <SubNav />
      <main className="main">
        <div>
          <YearTimeline selectedYear={year} onSelect={setYear} />
          <SeriesDetail year={year} />
          <AllSeriesTable selectedYear={year} onSelect={setYear} />
          <CareerLeaders />
          <FamousMoments />
        </div>
        <Sidebar year={year} onYear={setYear} />
      </main>
    </>
  );
}
