"use client";
import "./styles.css";
import { useState, useEffect, useRef, useMemo } from "react";
import SignInModal from "@/components/SignInModal";

const NAV_ITEMS = ['Home','Players','Seasons','Games','Leaders','Postseason','Lab','Media'];
const NAV_HREF = {
  Home:       '/',
  Players:    '/players',
  Seasons:    '/seasons',
  Games:      '/games',
  Leaders:    '/leaders',
  Postseason: '/postseason',
  Lab:        '/lab',
  Media:      '/media',
};

/* ============================================================
 * DATA — career stats as Met (illustrative)
 * ============================================================ */
const PLAYERS = [
  { id: 1,  name: 'David Wright',     pos: '3B', years: '2004-18', era: '2000-19', G: 1585, PA: 6911, AB: 6048, R: 949, H: 1777, '2B': 390, '3B': 26, HR: 242, RBI: 970, SB: 196, BB: 762, SO: 1292, AVG: .296, OBP: .376, SLG: .491, OPS: .867, ISO: .195, BABIP: .345, wOBA: .378, 'wRC+': 133, 'BB%': 11.0, 'K%': 18.5, 'HR/PA': 3.5, off: 287, def: 12, BsR: 18, bWAR: 54.6 },
  { id: 2,  name: 'Mike Piazza',      pos: 'C',  years: '1998-05', era: '2000-19', G: 972,  PA: 3941, AB: 3553, R: 532, H: 1052, '2B': 168, '3B': 4,  HR: 220, RBI: 655, SB: 0,   BB: 374, SO: 671,  AVG: .296, OBP: .373, SLG: .542, OPS: .915, ISO: .246, BABIP: .331, wOBA: .395, 'wRC+': 142, 'BB%': 9.5,  'K%': 17.0, 'HR/PA': 5.6, off: 245, def: -28, BsR: -8, bWAR: 24.5 },
  { id: 3,  name: 'Darryl Strawberry',pos: 'RF', years: '1983-90', era: '1980-99', G: 1109, PA: 4549, AB: 3903, R: 662, H: 1025, '2B': 187, '3B': 30, HR: 252, RBI: 733, SB: 191, BB: 580, SO: 960,  AVG: .263, OBP: .359, SLG: .520, OPS: .879, ISO: .257, BABIP: .305, wOBA: .380, 'wRC+': 143, 'BB%': 12.8, 'K%': 21.1, 'HR/PA': 5.5, off: 282, def: -10, BsR: 22, bWAR: 36.3 },
  { id: 4,  name: 'Carlos Beltran',   pos: 'CF', years: '2005-11', era: '2000-19', G: 839,  PA: 3640, AB: 3162, R: 551, H: 887,  '2B': 208, '3B': 9,  HR: 149, RBI: 559, SB: 100, BB: 416, SO: 632,  AVG: .280, OBP: .369, SLG: .500, OPS: .869, ISO: .220, BABIP: .311, wOBA: .378, 'wRC+': 134, 'BB%': 11.4, 'K%': 17.4, 'HR/PA': 4.1, off: 220, def: 35,  BsR: 30, bWAR: 31.5 },
  { id: 5,  name: 'Jose Reyes',       pos: 'SS', years: '2003-18', era: '2000-19', G: 1364, PA: 6101, AB: 5640, R: 877, H: 1597, '2B': 285, '3B': 113,HR: 145, RBI: 609, SB: 408, BB: 405, SO: 690,  AVG: .283, OBP: .332, SLG: .427, OPS: .759, ISO: .144, BABIP: .311, wOBA: .335, 'wRC+': 105, 'BB%': 6.6,  'K%': 11.3, 'HR/PA': 2.4, off: 95,  def: 8,   BsR: 75, bWAR: 36.5 },
  { id: 6,  name: 'Howard Johnson',   pos: '3B', years: '1985-93', era: '1980-99', G: 1165, PA: 4591, AB: 3968, R: 627, H: 997,  '2B': 199, '3B': 32, HR: 192, RBI: 629, SB: 202, BB: 479, SO: 988,  AVG: .251, OBP: .342, SLG: .459, OPS: .801, ISO: .208, BABIP: .293, wOBA: .350, 'wRC+': 121, 'BB%': 10.4, 'K%': 21.5, 'HR/PA': 4.2, off: 148, def: -22, BsR: 28, bWAR: 31.9 },
  { id: 7,  name: 'Keith Hernandez',  pos: '1B', years: '1983-89', era: '1980-99', G: 880,  PA: 3608, AB: 3164, R: 455, H: 939,  '2B': 175, '3B': 16, HR: 80,  RBI: 468, SB: 17,  BB: 426, SO: 326,  AVG: .297, OBP: .387, SLG: .429, OPS: .816, ISO: .132, BABIP: .323, wOBA: .355, 'wRC+': 130, 'BB%': 11.8, 'K%': 9.0,  'HR/PA': 2.2, off: 178, def: 88,  BsR: -4, bWAR: 26.7 },
  { id: 8,  name: 'Edgardo Alfonzo',  pos: '3B', years: '1995-02', era: '2000-19', G: 1086, PA: 4449, AB: 3897, R: 614, H: 1136, '2B': 212, '3B': 21, HR: 120, RBI: 538, SB: 45,  BB: 437, SO: 510,  AVG: .292, OBP: .367, SLG: .445, OPS: .812, ISO: .153, BABIP: .305, wOBA: .353, 'wRC+': 119, 'BB%': 9.8,  'K%': 11.5, 'HR/PA': 2.7, off: 142, def: 58,  BsR: -2, bWAR: 28.2 },
  { id: 9,  name: 'Gary Carter',      pos: 'C',  years: '1985-89', era: '1980-99', G: 600,  PA: 2371, AB: 2082, R: 285, H: 519,  '2B': 84,  '3B': 4,  HR: 89,  RBI: 349, SB: 6,   BB: 244, SO: 268,  AVG: .249, OBP: .319, SLG: .412, OPS: .731, ISO: .163, BABIP: .261, wOBA: .322, 'wRC+': 102, 'BB%': 10.3, 'K%': 11.3, 'HR/PA': 3.8, off: 30,  def: 35,  BsR: -8, bWAR: 19.2 },
  { id: 10, name: 'Mookie Wilson',    pos: 'CF', years: '1980-89', era: '1980-99', G: 1116, PA: 4448, AB: 4027, R: 592, H: 1112, '2B': 170, '3B': 62, HR: 60,  RBI: 342, SB: 281, BB: 233, SO: 731,  AVG: .276, OBP: .314, SLG: .386, OPS: .700, ISO: .110, BABIP: .322, wOBA: .312, 'wRC+': 96,  'BB%': 5.2,  'K%': 16.4, 'HR/PA': 1.3, off: -12, def: 38,  BsR: 65, bWAR: 19.8 },
  { id: 11, name: 'Lenny Dykstra',    pos: 'CF', years: '1985-89', era: '1980-99', G: 438,  PA: 1601, AB: 1411, R: 226, H: 392,  '2B': 75,  '3B': 13, HR: 30,  RBI: 116, SB: 116, BB: 178, SO: 197,  AVG: .278, OBP: .355, SLG: .422, OPS: .777, ISO: .144, BABIP: .306, wOBA: .342, 'wRC+': 116, 'BB%': 11.1, 'K%': 12.3, 'HR/PA': 1.9, off: 65,  def: 18,  BsR: 32, bWAR: 10.4 },
  { id: 12, name: 'Pete Alonso',      pos: '1B', years: '2019-25', era: '2020+',   G: 911,  PA: 3863, AB: 3415, R: 542, H: 868,  '2B': 161, '3B': 6,  HR: 226, RBI: 586, SB: 16,  BB: 388, SO: 893,  AVG: .254, OBP: .346, SLG: .520, OPS: .866, ISO: .266, BABIP: .283, wOBA: .371, 'wRC+': 134, 'BB%': 10.0, 'K%': 23.1, 'HR/PA': 5.9, off: 148, def: -12, BsR: -8, bWAR: 16.8 },
  { id: 13, name: 'Francisco Lindor', pos: 'SS', years: '2021-25', era: '2020+',   G: 687,  PA: 3033, AB: 2722, R: 460, H: 702,  '2B': 142, '3B': 19, HR: 153, RBI: 481, SB: 86,  BB: 269, SO: 511,  AVG: .258, OBP: .331, SLG: .465, OPS: .796, ISO: .207, BABIP: .272, wOBA: .343, 'wRC+': 121, 'BB%': 8.9,  'K%': 16.8, 'HR/PA': 5.0, off: 130, def: 65,  BsR: 38, bWAR: 21.4 },
  { id: 14, name: 'Cleon Jones',      pos: 'LF', years: '1963-75', era: '1962-79', G: 1201, PA: 4536, AB: 4083, R: 563, H: 1147, '2B': 182, '3B': 34, HR: 93,  RBI: 521, SB: 91,  BB: 384, SO: 638,  AVG: .281, OBP: .335, SLG: .404, OPS: .739, ISO: .123, BABIP: .311, wOBA: .322, 'wRC+': 115, 'BB%': 8.5,  'K%': 14.1, 'HR/PA': 2.1, off: 88,  def: 18,  BsR: 12, bWAR: 21.5 },
  { id: 15, name: 'Tommie Agee',      pos: 'CF', years: '1968-72', era: '1962-79', G: 601,  PA: 2403, AB: 2173, R: 305, H: 571,  '2B': 99,  '3B': 14, HR: 82,  RBI: 263, SB: 92,  BB: 197, SO: 415,  AVG: .263, OBP: .324, SLG: .422, OPS: .746, ISO: .159, BABIP: .293, wOBA: .328, 'wRC+': 117, 'BB%': 8.2,  'K%': 17.3, 'HR/PA': 3.4, off: 68,  def: 35,  BsR: 14, bWAR: 16.8 },
  { id: 16, name: 'Rusty Staub',      pos: 'RF', years: '1972-85', era: '1962-79', G: 942,  PA: 3445, AB: 3036, R: 359, H: 838,  '2B': 152, '3B': 16, HR: 75,  RBI: 399, SB: 6,   BB: 366, SO: 254,  AVG: .276, OBP: .358, SLG: .415, OPS: .773, ISO: .139, BABIP: .283, wOBA: .346, 'wRC+': 119, 'BB%': 10.6, 'K%': 7.4,  'HR/PA': 2.2, off: 92,  def: -25, BsR: -28, bWAR: 12.7 },
  { id: 17, name: 'Robin Ventura',    pos: '3B', years: '1999-01', era: '2000-19', G: 352,  PA: 1480, AB: 1242, R: 198, H: 305,  '2B': 53,  '3B': 0,  HR: 77,  RBI: 199, SB: 3,   BB: 207, SO: 250,  AVG: .246, OBP: .353, SLG: .459, OPS: .812, ISO: .213, BABIP: .258, wOBA: .354, 'wRC+': 115, 'BB%': 14.0, 'K%': 16.9, 'HR/PA': 5.2, off: 58,  def: 32,  BsR: -6, bWAR: 9.0  },
  { id: 18, name: 'John Olerud',      pos: '1B', years: '1997-99', era: '2000-19', G: 457,  PA: 1955, AB: 1662, R: 269, H: 524,  '2B': 121, '3B': 4,  HR: 63,  RBI: 291, SB: 8,   BB: 271, SO: 209,  AVG: .315, OBP: .425, SLG: .501, OPS: .926, ISO: .186, BABIP: .329, wOBA: .393, 'wRC+': 142, 'BB%': 13.9, 'K%': 10.7, 'HR/PA': 3.2, off: 122, def: 18,  BsR: -10, bWAR: 16.7 },
  { id: 19, name: 'Wally Backman',    pos: '2B', years: '1980-88', era: '1980-99', G: 765,  PA: 2603, AB: 2218, R: 354, H: 627,  '2B': 86,  '3B': 24, HR: 7,   RBI: 155, SB: 100, BB: 249, SO: 311,  AVG: .283, OBP: .354, SLG: .357, OPS: .711, ISO: .074, BABIP: .335, wOBA: .315, 'wRC+': 99,  'BB%': 9.6,  'K%': 12.0, 'HR/PA': 0.3, off: 22,  def: 8,   BsR: 22, bWAR: 12.5 },
  { id: 20, name: 'Jerry Grote',      pos: 'C',  years: '1966-77', era: '1962-79', G: 1235, PA: 4334, AB: 3851, R: 352, H: 986,  '2B': 154, '3B': 17, HR: 35,  RBI: 357, SB: 14,  BB: 351, SO: 561,  AVG: .256, OBP: .317, SLG: .337, OPS: .654, ISO: .081, BABIP: .288, wOBA: .291, 'wRC+': 88,  'BB%': 8.1,  'K%': 12.9, 'HR/PA': 0.8, off: -42, def: 78,  BsR: -6, bWAR: 18.0 },
  { id: 21, name: 'Bud Harrelson',    pos: 'SS', years: '1965-77', era: '1962-79', G: 1322, PA: 4990, AB: 4390, R: 561, H: 1029, '2B': 137, '3B': 45, HR: 6,   RBI: 242, SB: 115, BB: 573, SO: 568,  AVG: .234, OBP: .324, SLG: .288, OPS: .612, ISO: .054, BABIP: .265, wOBA: .284, 'wRC+': 80,  'BB%': 11.5, 'K%': 11.4, 'HR/PA': 0.1, off: -85, def: 95,  BsR: 18, bWAR: 19.2 },
  { id: 22, name: 'Mookie Betts',     pos: 'RF', years: '2024-25', era: '2020+',   G: 168,  PA: 728,  AB: 638,  R: 102, H: 175,  '2B': 38,  '3B': 2,  HR: 28,  RBI: 89,  SB: 16,  BB: 75,  SO: 95,   AVG: .274, OBP: .353, SLG: .470, OPS: .823, ISO: .196, BABIP: .291, wOBA: .354, 'wRC+': 125, 'BB%': 10.3, 'K%': 13.0, 'HR/PA': 3.8, off: 28,  def: 8,   BsR: 6,  bWAR: 4.2  },
];

const POSITIONS = ['ALL','C','1B','2B','3B','SS','LF','CF','RF','OF'];
const ERAS = ['All Time','1962-79','1980-99','2000-19','2020+'];
const SEASONS = ['Career','2025','2024','2023','2022','2021','2020','2015','2006','1986','1969'];

const PRESETS = {
  Dashboard:        { cols: ['G','PA','HR','RBI','SB','BB%','K%','AVG','OBP','SLG','OPS','wRC+','bWAR'], default: 'bWAR' },
  Standard:         { cols: ['G','AB','R','H','2B','3B','HR','RBI','SB','BB','SO','AVG','OBP','SLG'],   default: 'H' },
  Advanced:         { cols: ['G','PA','BB%','K%','ISO','BABIP','wOBA','wRC+','bWAR'],                    default: 'wRC+' },
  Power:            { cols: ['G','PA','HR','2B','3B','RBI','ISO','SLG','HR/PA'],                         default: 'HR' },
  'Plate Discipline':{ cols: ['G','PA','BB','SO','BB%','K%','OBP','AVG','BABIP'],                        default: 'BB%' },
  Value:            { cols: ['G','PA','off','def','BsR','wRC+','bWAR'],                                  default: 'bWAR' },
};

const COL_FORMAT = {
  AVG: 3, OBP: 3, SLG: 3, OPS: 3, ISO: 3, BABIP: 3, wOBA: 3,
  'BB%': 1, 'K%': 1, 'HR/PA': 1, bWAR: 1,
};

const TRENDING_VIEWS = [
  { name: '1986 Champions Roster', meta: 'Era=1980-99 · Positions=All', filter: { era:'1980-99' } },
  { name: 'Top 10 Career bWAR',    meta: 'All Time · sorted bWAR ↓',     filter: {} },
  { name: 'Best K% (Plate Disc.)', meta: 'Min 1500 PA · K% ascending',   filter: { minPA: 1500 } },
  { name: 'Power Surge 2020+',     meta: 'Era=2020+ · HR ↓',              filter: { era:'2020+' } },
];

const DEFAULT_SAVED_VIEWS = [
  { id: 1, name: 'My Hall of Fame Picks', meta: 'Min PA 4000 · bWAR > 25', filter: { minPA: 4000 } },
  { id: 2, name: 'Catchers Tracker',      meta: 'Position=C · Career',     filter: { pos: 'C' } },
];

const AVATAR_COLORS = ['#002D72','#FF5910','#10B981','#8B5CF6','#EC4899','#0EA5E9'];

function fmt(col, val) {
  if (val == null) return '—';
  if (COL_FORMAT[col] === 3) return val === 0 ? '.000' : val.toFixed(3).replace(/^0/, '');
  if (COL_FORMAT[col] === 1) return Number(val).toFixed(1);
  return typeof val === 'number' ? val.toLocaleString() : val;
}
function makeInitials(name) { const p=name.trim().split(/\s+/); return (p.length===1?name.slice(0,2):p[0][0]+p.at(-1)[0]).toUpperCase(); }
function pickColor(s) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))>>>0; return AVATAR_COLORS[h%AVATAR_COLORS.length]; }
function useClickOutside(ref, fn) { useEffect(()=>{const cb=e=>{if(ref.current&&!ref.current.contains(e.target))fn();}; document.addEventListener('mousedown',cb); return ()=>document.removeEventListener('mousedown',cb);},[ref,fn]); }

/* ============= COMPONENTS ============= */

function SaveViewModal({ onClose, onSave, currentFilters }) {
  const [name, setName] = useState('');
  const filterDescription = useMemo(() => {
    const parts = [];
    if (currentFilters.era !== 'All Time') parts.push(`Era=${currentFilters.era}`);
    if (currentFilters.pos !== 'ALL') parts.push(`Pos=${currentFilters.pos}`);
    if (currentFilters.season !== 'Career') parts.push(`Season=${currentFilters.season}`);
    if (currentFilters.minPA > 0) parts.push(`Min PA=${currentFilters.minPA}`);
    parts.push(`Preset=${currentFilters.preset}`);
    parts.push(`Sort=${currentFilters.sortCol} ${currentFilters.sortDir}`);
    return parts.join(' · ');
  }, [currentFilters]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Save this view</div>
        <div className="modal-subtitle">Save the current filter combination so you can return to it later.</div>
        <label className="modal-label">View name</label>
        <input className="modal-input" autoFocus value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. My HOF Picks" />
        <div style={{padding:10,background:'#F9FAFB',borderRadius:6,fontSize:12,color:'var(--text-muted)',marginBottom:16,fontFamily:'var(--num-font)'}}>{filterDescription}</div>
        <button className="modal-submit" disabled={!name.trim()} onClick={()=>{ onSave(name.trim(), filterDescription); }}>Save View</button>
      </div>
    </div>
  );
}

function FilterBar({ filters, setFilters, onSaveView, user }) {
  const update = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  return (
    <div className="filters">
      <div className="filters-inner">
        <div className="filter-group">
          <label className="filter-label">Season</label>
          <select className="filter-select" value={filters.season} onChange={e=>update('season', e.target.value)}>
            {SEASONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Era</label>
          <select className="filter-select" value={filters.era} onChange={e=>update('era', e.target.value)}>
            {ERAS.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Position</label>
          <select className="filter-select" value={filters.pos} onChange={e=>update('pos', e.target.value)}>
            {POSITIONS.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Min PA</label>
          <input className="filter-input" type="number" value={filters.minPA} min={0} max={10000} step={500}
                 onChange={e=>update('minPA', parseInt(e.target.value)||0)} style={{minWidth:100}} />
        </div>
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input className="filter-input" type="text" value={filters.q} placeholder="player name..."
                 onChange={e=>update('q', e.target.value)} />
        </div>
        <div className="filter-spacer" />
        <div className="filter-actions">
          <button className="filter-clear" onClick={()=>setFilters({ season:'Career', era:'All Time', pos:'ALL', minPA:0, q:'' })}>Clear all</button>
          <button className="save-view-btn" onClick={onSaveView}>📁 Save view</button>
        </div>
      </div>
    </div>
  );
}

function FilterChips({ filters, setFilters }) {
  const chips = [];
  if (filters.season !== 'Career') chips.push({ k: 'season', v: 'Season: ' + filters.season, reset: 'Career' });
  if (filters.era !== 'All Time')  chips.push({ k: 'era',    v: 'Era: ' + filters.era,        reset: 'All Time' });
  if (filters.pos !== 'ALL')       chips.push({ k: 'pos',    v: 'Pos: ' + filters.pos,        reset: 'ALL' });
  if (filters.minPA > 0)           chips.push({ k: 'minPA',  v: 'Min PA ≥ ' + filters.minPA,  reset: 0 });
  if (filters.q)                   chips.push({ k: 'q',      v: '"' + filters.q + '"',         reset: '' });
  if (chips.length === 0) return null;
  return (
    <div className="filter-chips">
      {chips.map(c => (
        <span className="chip" key={c.k}>
          {c.v} <span className="x" onClick={() => setFilters(f => ({ ...f, [c.k]: c.reset }))}>×</span>
        </span>
      ))}
    </div>
  );
}

function PresetTabs({ presets, active, onChange }) {
  return (
    <div className="presets">
      <div className="presets-inner">
        {presets.map(p => (
          <button key={p} className={'preset-tab' + (active===p?' active':'')} onClick={()=>onChange(p)}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function LeadersTable({ rows, columns, sortCol, sortDir, onSort, favorites, onToggleFav, user, onSignInClick, pageSize, page, onPageChange }) {
  const start = (page-1)*pageSize;
  const visible = pageSize === Infinity ? rows : rows.slice(start, start+pageSize);
  const totalPages = pageSize === Infinity ? 1 : Math.ceil(rows.length/pageSize);

  // Identify "leader" cells (top value in each numeric col)
  const leaderValues = useMemo(() => {
    const m = {};
    columns.forEach(c => {
      const vals = rows.map(r => r[c]).filter(v => typeof v === 'number');
      if (vals.length) m[c] = Math.max(...vals);
    });
    return m;
  }, [rows, columns]);

  return (
    <>
    <div className="ldr-table-wrap">
      <table className="ldr">
        <thead>
          <tr>
            <th className="left star">★</th>
            <th className="left center">#</th>
            <th className="left">Player</th>
            <th className="left center">Pos</th>
            <th className="left">Years</th>
            {columns.map(col => (
              <th key={col} className={sortCol === col ? 'sorted' : ''} onClick={() => onSort(col)}>
                {col}<span className="arr">{sortCol===col ? (sortDir==='desc'?'▼':'▲') : '↕'}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((r, i) => {
            const isFav = favorites.has(r.id);
            return (
              <tr key={r.id} className={isFav ? 'is-fav' : ''}>
                <td className="left center sticky-l star">
                  <button className={isFav ? 'on' : ''}
                          title={user ? (isFav?'Remove from favorites':'Add to favorites') : 'Sign in to favorite'}
                          onClick={() => user ? onToggleFav(r.id) : onSignInClick()}>
                    {isFav ? '★' : '☆'}
                  </button>
                </td>
                <td className={'left center rank' + ((start+i+1)<=3?' top3':'')}>{start+i+1}</td>
                <td className="left"><a href={NAV_HREF.Players} className="name linkable" style={{textDecoration:'none', color:'inherit'}}>{r.name}</a></td>
                <td className="left center">{r.pos}</td>
                <td className="left" style={{color:'var(--text-muted)',fontSize:11.5}}>{r.years}</td>
                {columns.map(col => {
                  const v = r[col];
                  const isLeader = typeof v === 'number' && v === leaderValues[col] && rows.length > 1;
                  return <td key={col} className={isLeader ? 'leader-cell' : ''}>{fmt(col, v)}</td>;
                })}
              </tr>
            );
          })}
          {visible.length === 0 && (
            <tr><td colSpan={5+columns.length} style={{padding:30,textAlign:'center',color:'var(--text-muted)'}}>No players match these filters.</td></tr>
          )}
        </tbody>
      </table>
    </div>

    {pageSize !== Infinity && totalPages > 1 && (
      <div className="pagination">
        <div className="result-count">
          Showing <strong>{start+1}–{Math.min(start+pageSize, rows.length)}</strong> of <strong>{rows.length}</strong>
        </div>
        <div className="page-btns">
          <button disabled={page===1} onClick={()=>onPageChange(page-1)}>← Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} className={page===i+1?'active':''} onClick={()=>onPageChange(i+1)}>{i+1}</button>
          ))}
          <button disabled={page===totalPages} onClick={()=>onPageChange(page+1)}>Next →</button>
        </div>
      </div>
    )}
    </>
  );
}

function MyFavorites({ favorites, allPlayers, user, onSignInClick, onRemove, onClearAll }) {
  if (!user) {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">★ My Favorites</div></div>
        <div className="fav-empty">
          <div className="icon">★</div>
          <div><strong onClick={onSignInClick} style={{color:'var(--mets-orange)',cursor:'pointer'}}>Sign in</strong> to save players to your personal list and access them from any device.</div>
        </div>
      </div>
    );
  }

  const favPlayers = allPlayers.filter(p => favorites.has(p.id));
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">★ My Favorites · {favPlayers.length}</div>
        {favPlayers.length > 0 && <button className="card-action" onClick={onClearAll} style={{color:'var(--text-muted)',cursor:'pointer'}}>Clear all</button>}
      </div>
      {favPlayers.length === 0
        ? <div className="fav-empty"><div className="icon">☆</div><div>Click the ☆ on any player row to add them here. Your list syncs across all your devices.</div></div>
        : favPlayers.map(p => (
            <div className="fav-row" key={p.id}>
              <div className="fav-avatar" style={{background: pickColor(p.name)}}>{makeInitials(p.name)}</div>
              <div className="fav-info">
                <div className="fav-name">{p.name}</div>
                <div className="fav-meta">{p.pos} · {p.years} · {fmt('bWAR', p.bWAR)} bWAR</div>
              </div>
              <button className="fav-remove" onClick={() => onRemove(p.id)}>×</button>
            </div>
          ))
      }
    </div>
  );
}

function SavedViews({ views, user, onSignInClick, onApply, onDelete }) {
  if (!user) {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">📁 Saved Views</div></div>
        <div className="fav-empty">
          <div className="icon">📁</div>
          <div><strong onClick={onSignInClick} style={{color:'var(--mets-orange)',cursor:'pointer'}}>Sign in</strong> to save filter combinations and return to them with one click.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">📁 Saved Views · {views.length}</div></div>
      {views.length === 0
        ? <div className="fav-empty"><div className="icon">📁</div><div>Configure your filters then click <strong>Save view</strong> in the toolbar to save the current setup.</div></div>
        : views.map(v => (
            <div className="saved-view" key={v.id} onClick={() => onApply(v)}>
              <span className="delete" onClick={e => { e.stopPropagation(); onDelete(v.id); }}>×</span>
              <div className="saved-view-title">{v.name}</div>
              <div className="saved-view-meta">{v.meta}</div>
            </div>
          ))
      }
    </div>
  );
}

function TrendingViews({ onApply }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">🔥 Trending Views</div></div>
      {TRENDING_VIEWS.map((v, i) => (
        <a className="trending-link" key={i} onClick={() => onApply(v)}>
          <span className="arrow">→</span>
          <div>{v.name}</div>
          <div className="meta">{v.meta}</div>
        </a>
      ))}
    </div>
  );
}

/* ============= APP ============= */

export default function LeadersPage() {
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSaveView, setShowSaveView] = useState(false);
  const [filters, setFilters] = useState({ season: 'Career', era: 'All Time', pos: 'ALL', minPA: 0, q: '' });
  const [preset, setPreset] = useState('Dashboard');
  const [sortCol, setSortCol] = useState('bWAR');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [favorites, setFavorites] = useState(new Set());
  const [savedViews, setSavedViews] = useState([]);
  const [toast, setToast] = useState<any>(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const filteredRows = useMemo(() => {
    let rows = [...PLAYERS];
    if (filters.era !== 'All Time') rows = rows.filter(r => r.era === filters.era);
    if (filters.pos !== 'ALL') rows = rows.filter(r => r.pos === filters.pos || (filters.pos==='OF' && ['LF','CF','RF'].includes(r.pos)));
    if (filters.minPA > 0) rows = rows.filter(r => r.PA >= filters.minPA);
    if (filters.q) rows = rows.filter(r => r.name.toLowerCase().includes(filters.q.toLowerCase()));
    rows.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
    return rows;
  }, [filters, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(1);
  };

  const onSignIn = (u) => { setUser(u); setShowSignIn(false); setSavedViews(DEFAULT_SAVED_VIEWS); };
  const onSignOut = () => { setUser(null); setFavorites(new Set()); setSavedViews([]); };

  const toggleFav = (id) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); showToast('Removed from favorites'); }
      else { next.add(id); showToast('★ Added to favorites'); }
      return next;
    });
  };

  const handleSaveView = (name, meta) => {
    setSavedViews(views => [...views, { id: Date.now(), name, meta, filter: { ...filters, preset, sortCol, sortDir } }]);
    setShowSaveView(false);
    showToast('📁 View saved');
  };

  const applyView = (v) => {
    if (v.filter) {
      setFilters(f => ({ ...f, ...v.filter }));
      if (v.filter.preset) setPreset(v.filter.preset);
      if (v.filter.sortCol) setSortCol(v.filter.sortCol);
      if (v.filter.sortDir) setSortDir(v.filter.sortDir);
      setPage(1);
      showToast('Loaded: ' + v.name);
    }
  };

  const columns = PRESETS[preset].cols;

  return (
    <>
      <section className="page-header">
        <div className="page-header-inner">
          <div className="page-crumb"><a>Home</a> / Leaders</div>
          <div className="page-title">Mets Leaderboards</div>
          <div className="page-sub">All-time franchise leaders · Career & single-season stats since 1962</div>
          <div className="stat-type-toggle">
            <button className="active">Batting</button>
            <button>Pitching</button>
            <button>Fielding</button>
          </div>
        </div>
        <FilterBar filters={filters} setFilters={(f)=>{ setFilters(f); setPage(1); }} onSaveView={() => user ? setShowSaveView(true) : setShowSignIn(true)} user={user} />
        <FilterChips filters={filters} setFilters={(f)=>{ setFilters(f); setPage(1); }} />
      </section>

      <PresetTabs presets={Object.keys(PRESETS)} active={preset} onChange={(p)=>{ setPreset(p); setSortCol(PRESETS[p].default); setSortDir('desc'); setPage(1); }} />

      <main className="main">
        <div className="content">
          <div className="card">
            <div className="table-toolbar">
              <div className="result-count">
                <strong>{filteredRows.length}</strong> players · sorted by <strong>{sortCol}</strong> {sortDir === 'desc' ? '↓' : '↑'}
              </div>
              <div className="table-tools">
                <span style={{color:'var(--text-muted)'}}>Show:</span>
                <select value={pageSize} onChange={e => { setPageSize(e.target.value === 'Infinity' ? Infinity : parseInt(e.target.value)); setPage(1); }}>
                  <option value="10">10</option>
                  <option value="30">30</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="Infinity">All</option>
                </select>
                <button className="export-btn" onClick={() => showToast('CSV export — Members only')}>↓ Export CSV</button>
                <button className="export-btn" onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('🔗 Link copied'); }}>↗ Share view</button>
              </div>
            </div>

            <LeadersTable
              rows={filteredRows}
              columns={columns}
              sortCol={sortCol}
              sortDir={sortDir}
              onSort={handleSort}
              favorites={favorites}
              onToggleFav={toggleFav}
              user={user}
              onSignInClick={() => setShowSignIn(true)}
              pageSize={pageSize}
              page={page}
              onPageChange={setPage}
            />
          </div>
        </div>

        <aside className="sidebar">
          <MyFavorites
            favorites={favorites}
            allPlayers={PLAYERS}
            user={user}
            onSignInClick={() => setShowSignIn(true)}
            onRemove={(id) => { setFavorites(prev => { const n = new Set(prev); n.delete(id); return n; }); }}
            onClearAll={() => { setFavorites(new Set()); showToast('Favorites cleared'); }}
          />
          <SavedViews
            views={savedViews}
            user={user}
            onSignInClick={() => setShowSignIn(true)}
            onApply={applyView}
            onDelete={(id) => { setSavedViews(vs => vs.filter(v => v.id !== id)); showToast('View deleted'); }}
          />
          <TrendingViews onApply={applyView} />
        </aside>
      </main>

      {showSignIn && <SignInModal onClose={()=>setShowSignIn(false)} onSignIn={(email)=>onSignIn({ name: email, handle: email.toLowerCase().replace(/\s+/g,'_'), initials: makeInitials(email), color: pickColor(email) })} />}
      {showSaveView && <SaveViewModal onClose={()=>setShowSaveView(false)} onSave={handleSaveView} currentFilters={{...filters, preset, sortCol, sortDir}} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
