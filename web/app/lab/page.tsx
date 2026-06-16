"use client";
import "./styles.css";
import { useState, useEffect, useRef, useMemo } from "react";
import Chart from "chart.js/auto";
import SignInModal from "@/components/SignInModal";

const SLOT_COLORS = ['#FF5910', '#002D72', '#10B981', '#8B5CF6'];

/* ============================================================
 * DATA — Mets players with year-by-year WAR, tool grades, percentiles
 * ============================================================ */
const PLAYERS = [
  { id: 1, name: 'David Wright', initials: 'DW', pos: '3B', years: '2004-18',
    summary: { G: 1585, PA: 6911, HR: 242, RBI: 970, SB: 196, AVG: .296, OBP: .376, SLG: .491, OPS: .867, 'wRC+': 133, bWAR: 54.6 },
    yearlyWAR: [['2004', 1.6], ['2005', 6.4], ['2006', 6.4], ['2007', 8.3], ['2008', 7.0], ['2009', 4.1], ['2010', 3.7], ['2011', 2.3], ['2012', 6.7], ['2013', 5.1], ['2014', 1.9], ['2015', 0.8], ['2016', 0.4], ['2018', -0.1]],
    tools: { Hit: 70, Power: 65, Speed: 55, Field: 55, Plate: 65, Durability: 55 },
    percentiles: { 'Hits': 94, 'OBP': 88, 'wRC+': 85, 'bWAR': 82, 'SB': 67, 'Defense': 54 },
    notable: ['7× All-Star', '2× Silver Slugger', 'Mets Captain'],
  },
  { id: 2, name: 'Mike Piazza', initials: 'MP', pos: 'C', years: '1998-05',
    summary: { G: 972, PA: 3941, HR: 220, RBI: 655, SB: 0, AVG: .296, OBP: .373, SLG: .542, OPS: .915, 'wRC+': 142, bWAR: 24.5 },
    yearlyWAR: [['1998', 5.0], ['1999', 4.7], ['2000', 5.6], ['2001', 5.3], ['2002', 1.4], ['2003', 0.4], ['2004', 0.7], ['2005', 0.7]],
    tools: { Hit: 75, Power: 75, Speed: 30, Field: 35, Plate: 55, Durability: 65 },
    percentiles: { 'Hits': 81, 'OBP': 82, 'wRC+': 96, 'bWAR': 70, 'SB': 5, 'Defense': 22 },
    notable: ['HOF 2016', 'NL ROY 1993', '12× All-Star'],
  },
  { id: 3, name: 'Darryl Strawberry', initials: 'DS', pos: 'RF', years: '1983-90',
    summary: { G: 1109, PA: 4549, HR: 252, RBI: 733, SB: 191, AVG: .263, OBP: .359, SLG: .520, OPS: .879, 'wRC+': 143, bWAR: 36.3 },
    yearlyWAR: [['1983', 4.4], ['1984', 4.6], ['1985', 5.5], ['1986', 5.0], ['1987', 6.4], ['1988', 5.5], ['1989', 4.0], ['1990', 2.0]],
    tools: { Hit: 60, Power: 80, Speed: 65, Field: 50, Plate: 60, Durability: 50 },
    percentiles: { 'Hits': 78, 'OBP': 76, 'wRC+': 96, 'bWAR': 72, 'SB': 75, 'Defense': 42 },
    notable: ['NL ROY 1983', '8× All-Star', '1986 WS Champion'],
  },
  { id: 4, name: 'Carlos Beltran', initials: 'CB', pos: 'CF', years: '2005-11',
    summary: { G: 839, PA: 3640, HR: 149, RBI: 559, SB: 100, AVG: .280, OBP: .369, SLG: .500, OPS: .869, 'wRC+': 134, bWAR: 31.5 },
    yearlyWAR: [['2005', 1.6], ['2006', 8.2], ['2007', 4.8], ['2008', 7.0], ['2009', 1.8], ['2010', -0.6], ['2011', 4.6]],
    tools: { Hit: 65, Power: 65, Speed: 65, Field: 70, Plate: 65, Durability: 60 },
    percentiles: { 'Hits': 71, 'OBP': 84, 'wRC+': 88, 'bWAR': 68, 'SB': 70, 'Defense': 78 },
    notable: ['5× All-Star (NYM)', '3× Gold Glove', '2× Silver Slugger'],
  },
  { id: 5, name: 'Jose Reyes', initials: 'JR', pos: 'SS', years: '2003-18',
    summary: { G: 1364, PA: 6101, HR: 145, RBI: 609, SB: 408, AVG: .283, OBP: .332, SLG: .427, OPS: .759, 'wRC+': 105, bWAR: 36.5 },
    yearlyWAR: [['2003', 0.7], ['2004', 0.5], ['2005', 1.1], ['2006', 4.7], ['2007', 5.8], ['2008', 5.6], ['2009', 2.4], ['2010', 1.7], ['2011', 6.2], ['2016', 0.2], ['2017', -1.4], ['2018', -1.7]],
    tools: { Hit: 60, Power: 45, Speed: 80, Field: 55, Plate: 50, Durability: 60 },
    percentiles: { 'Hits': 90, 'OBP': 60, 'wRC+': 55, 'bWAR': 73, 'SB': 95, 'Defense': 55 },
    notable: ['2011 NL Batting Title', '4× All-Star', 'Mets SB record'],
  },
  { id: 6, name: 'Howard Johnson', initials: 'HJ', pos: '3B', years: '1985-93',
    summary: { G: 1165, PA: 4591, HR: 192, RBI: 629, SB: 202, AVG: .251, OBP: .342, SLG: .459, OPS: .801, 'wRC+': 121, bWAR: 31.9 },
    yearlyWAR: [['1985', 1.4], ['1986', 1.6], ['1987', 5.2], ['1988', 4.0], ['1989', 7.5], ['1990', 1.7], ['1991', 3.4], ['1992', -0.8], ['1993', -0.5]],
    tools: { Hit: 50, Power: 70, Speed: 70, Field: 45, Plate: 60, Durability: 60 },
    percentiles: { 'Hits': 65, 'OBP': 68, 'wRC+': 72, 'bWAR': 70, 'SB': 78, 'Defense': 38 },
    notable: ['2× All-Star', '30/30 Club (3×)', '1986 WS Champion'],
  },
  { id: 7, name: 'Pete Alonso', initials: 'PA', pos: '1B', years: '2019-25',
    summary: { G: 911, PA: 3863, HR: 226, RBI: 586, SB: 16, AVG: .254, OBP: .346, SLG: .520, OPS: .866, 'wRC+': 134, bWAR: 16.8 },
    yearlyWAR: [['2019', 4.7], ['2020', -0.2], ['2021', 2.7], ['2022', 4.5], ['2023', 1.7], ['2024', 1.9], ['2025', 2.5]],
    tools: { Hit: 50, Power: 80, Speed: 30, Field: 45, Plate: 55, Durability: 70 },
    percentiles: { 'Hits': 70, 'OBP': 72, 'wRC+': 88, 'bWAR': 50, 'SB': 12, 'Defense': 32 },
    notable: ['2019 NL ROY', '2× HR Derby', 'Polar Bear'],
  },
  { id: 8, name: 'Francisco Lindor', initials: 'FL', pos: 'SS', years: '2021-25',
    summary: { G: 687, PA: 3033, HR: 153, RBI: 481, SB: 86, AVG: .258, OBP: .331, SLG: .465, OPS: .796, 'wRC+': 121, bWAR: 21.4 },
    yearlyWAR: [['2021', 1.9], ['2022', 6.7], ['2023', 4.8], ['2024', 7.6], ['2025', 5.5]],
    tools: { Hit: 60, Power: 65, Speed: 65, Field: 75, Plate: 60, Durability: 70 },
    percentiles: { 'Hits': 73, 'OBP': 65, 'wRC+': 76, 'bWAR': 60, 'SB': 75, 'Defense': 88 },
    notable: ['MVP runner-up 2024', 'Platinum Glove', 'Mr. Smile'],
  },
  { id: 9, name: 'Keith Hernandez', initials: 'KH', pos: '1B', years: '1983-89',
    summary: { G: 880, PA: 3608, HR: 80, RBI: 468, SB: 17, AVG: .297, OBP: .387, SLG: .429, OPS: .816, 'wRC+': 130, bWAR: 26.7 },
    yearlyWAR: [['1983', 4.0], ['1984', 4.7], ['1985', 5.4], ['1986', 4.4], ['1987', 4.3], ['1988', 0.6], ['1989', -0.2]],
    tools: { Hit: 70, Power: 50, Speed: 35, Field: 80, Plate: 75, Durability: 70 },
    percentiles: { 'Hits': 76, 'OBP': 92, 'wRC+': 80, 'bWAR': 65, 'SB': 12, 'Defense': 95 },
    notable: ['11× Gold Glove', '1986 WS Champion', 'Mets Captain'],
  },
  { id: 10, name: 'Edgardo Alfonzo', initials: 'EA', pos: '3B', years: '1995-02',
    summary: { G: 1086, PA: 4449, HR: 120, RBI: 538, SB: 45, AVG: .292, OBP: .367, SLG: .445, OPS: .812, 'wRC+': 119, bWAR: 28.2 },
    yearlyWAR: [['1995', 1.9], ['1996', 1.6], ['1997', 5.1], ['1998', 4.6], ['1999', 5.5], ['2000', 6.2], ['2001', 1.7], ['2002', 1.6]],
    tools: { Hit: 65, Power: 55, Speed: 40, Field: 65, Plate: 65, Durability: 60 },
    percentiles: { 'Hits': 80, 'OBP': 78, 'wRC+': 70, 'bWAR': 65, 'SB': 28, 'Defense': 70 },
    notable: ['1× All-Star', '2× Silver Slugger', '2000 NLCS hero'],
  },
];

const COMPARE_METRICS = [
  { key: 'G',     label: 'Games',         desc: 'Career as Met', dir: 'high' },
  { key: 'PA',    label: 'Plate App.',    desc: 'Career as Met', dir: 'high' },
  { key: 'HR',    label: 'Home Runs',     desc: 'Career', dir: 'high' },
  { key: 'RBI',   label: 'RBI',           desc: 'Career', dir: 'high' },
  { key: 'SB',    label: 'Stolen Bases',  desc: 'Career', dir: 'high' },
  { key: 'AVG',   label: 'AVG',           desc: 'Batting Avg', dir: 'high', fmt: 3 },
  { key: 'OBP',   label: 'OBP',           desc: 'On-base %', dir: 'high', fmt: 3 },
  { key: 'SLG',   label: 'SLG',           desc: 'Slugging %', dir: 'high', fmt: 3 },
  { key: 'OPS',   label: 'OPS',           desc: 'OBP + SLG', dir: 'high', fmt: 3 },
  { key: 'wRC+',  label: 'wRC+',          desc: '100 = league avg', dir: 'high' },
  { key: 'bWAR',  label: 'bWAR',          desc: 'Wins above replacement', dir: 'high', fmt: 1 },
];

const TOOL_AXES = ['Hit', 'Power', 'Speed', 'Field', 'Plate', 'Durability'];
const PCT_METRICS = ['Hits', 'OBP', 'wRC+', 'bWAR', 'SB', 'Defense'];

const SUGGESTED_MATCHUPS = [
  { name: 'Captain Era', players: [1, 9],   meta: 'Wright vs Hernandez' },
  { name: 'Modern Bats', players: [7, 8],   meta: 'Alonso vs Lindor' },
  { name: 'OF Legends',  players: [3, 4],   meta: 'Strawberry vs Beltran' },
  { name: '3B Through Time', players: [1, 6, 10], meta: 'Wright · HoJo · Fonzie' },
  { name: 'Best 4 Bats', players: [1, 2, 3, 4], meta: 'Wright · Piazza · Straw · Beltran' },
];

const AVATAR_COLORS = ['#002D72', '#FF5910', '#10B981', '#8B5CF6', '#EC4899', '#0EA5E9'];
function makeInitials(name) { const p = name.trim().split(/\s+/); return (p.length === 1 ? name.slice(0, 2) : p[0][0] + p.at(-1)[0]).toUpperCase(); }
function pickColor(s) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_COLORS[h % AVATAR_COLORS.length]; }
function useClickOutside(ref, fn) { useEffect(() => { const cb = e => { if (ref.current && !ref.current.contains(e.target)) fn(); }; document.addEventListener('mousedown', cb); return () => document.removeEventListener('mousedown', cb); }, [ref, fn]); }
function fmt(val, digits) {
  if (val == null) return '—';
  if (digits === 3) return val === 0 ? '.000' : val.toFixed(3).replace(/^0/, '');
  if (digits === 1) return Number(val).toFixed(1);
  return typeof val === 'number' ? val.toLocaleString() : val;
}

/* ============= COMPONENTS ============= */

function SaveCompModal({ onClose, onSave, players }) {
  const [name, setName] = useState(players.map(p => p.name.split(' ')[0]).join(' vs '));
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>×</button>
        <div className="modal-title">Save this comparison</div>
        <div className="modal-subtitle">Quickly return to this exact set of players later.</div>
        <label className="modal-label">Comparison name</label>
        <input className="modal-input" autoFocus value={name} onChange={e => setName(e.target.value)} />
        <button className="modal-submit" disabled={!name.trim()} onClick={() => onSave(name.trim())}>Save Comparison</button>
      </div>
    </div>
  );
}

function PlayerSlot({ player, slotIdx, onRemove, onClick }) {
  const slotClass = `s${slotIdx + 1}`;
  if (!player) {
    return (
      <div className={`slot ${slotClass} empty`} onClick={onClick}>
        <div className="add-icon">+</div>
        <div className="add-label">Add player</div>
        <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>Slot {slotIdx + 1}</div>
      </div>
    );
  }
  return (
    <div className={`slot ${slotClass}`}>
      <button className="slot-remove" onClick={onRemove} title="Remove">×</button>
      <div className="slot-top">
        <div className="slot-avatar" style={{ background: SLOT_COLORS[slotIdx] }}>{player.initials}</div>
        <div>
          <div className="slot-name">{player.name}</div>
          <div className="slot-pos-yr">{player.pos} · {player.years}</div>
        </div>
      </div>
      <div className="slot-stats">
        <div className="slot-stat"><div className="slot-stat-val">{fmt(player.summary.bWAR, 1)}</div><div className="slot-stat-lbl">bWAR</div></div>
        <div className="slot-stat"><div className="slot-stat-val">{player.summary.HR}</div><div className="slot-stat-lbl">HR</div></div>
        <div className="slot-stat"><div className="slot-stat-val">{fmt(player.summary.OPS, 3)}</div><div className="slot-stat-lbl">OPS</div></div>
      </div>
    </div>
  );
}

function PlayerPicker({ slotIdx, onClose, onPick, currentSelection, user }) {
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('all');
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, onClose);

  const list = useMemo(() => {
    let l = PLAYERS;
    if (tab === 'favorites') l = l.filter(p => [1, 7, 8].includes(p.id)); // mock favorites
    if (q) l = l.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
    return l;
  }, [q, tab]);

  return (
    <div className="picker-overlay">
      <div className="picker" ref={ref}>
        <div className="picker-header">
          <span className="picker-slot-color" style={{ background: SLOT_COLORS[slotIdx] }} />
          <div className="picker-title">Add player to slot {slotIdx + 1}</div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', fontSize: 18, padding: '4px 8px' }}>×</button>
        </div>
        <div className="picker-search">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search Mets players..." />
        </div>
        <div className="picker-tabs">
          <button className={'picker-tab' + (tab === 'all' ? ' active' : '')} onClick={() => setTab('all')}>All Players ({PLAYERS.length})</button>
          {user && <button className={'picker-tab' + (tab === 'favorites' ? ' active' : '')} onClick={() => setTab('favorites')}>★ My Favorites</button>}
        </div>
        <div className="picker-list">
          {list.length === 0
            ? <div className="picker-empty">No players match "{q}"</div>
            : list.map(p => {
                const already = currentSelection.some(s => s?.id === p.id);
                return (
                  <div key={p.id} className={'picker-row' + (already ? ' disabled' : '')} onClick={() => !already && onPick(p)}>
                    <div className="picker-avatar" style={{ background: pickColor(p.name) }}>{p.initials}</div>
                    <div className="picker-info">
                      <div className="picker-name">{p.name}</div>
                      <div className="picker-meta">{p.pos} · {p.years} · {fmt(p.summary.bWAR, 1)} bWAR · {p.summary.HR} HR</div>
                    </div>
                    <span className="picker-add">{already ? 'Already selected' : '+ Add'}</span>
                  </div>
                );
              })
          }
        </div>
      </div>
    </div>
  );
}

function CareerArcOverlay({ players }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState('career'); // 'career' or 'calendar'

  useEffect(() => {
    if (!canvasRef.current || players.length === 0) return;

    let labels;
    let datasets;
    if (mode === 'career') {
      const maxLen = Math.max(...players.map(p => p.yearlyWAR.length));
      labels = [...Array(maxLen)].map((_, i) => `Y${i + 1}`);
      datasets = players.map((p, i) => ({
        label: p.name,
        data: p.yearlyWAR.map(([_, w]) => w).concat(Array(maxLen - p.yearlyWAR.length).fill(null)),
        borderColor: SLOT_COLORS[i],
        backgroundColor: SLOT_COLORS[i] + '20',
        borderWidth: 3, tension: 0.3,
        pointRadius: 4, pointHoverRadius: 7,
        pointBackgroundColor: SLOT_COLORS[i],
        pointBorderColor: 'white', pointBorderWidth: 1.5,
        spanGaps: true,
      }));
    } else {
      const allYears = new Set();
      players.forEach(p => p.yearlyWAR.forEach(([y]) => allYears.add(y)));
      const yrs = [...allYears].sort();
      labels = yrs;
      datasets = players.map((p, i) => {
        const m = Object.fromEntries(p.yearlyWAR);
        return {
          label: p.name,
          data: yrs.map(y => m[y] != null ? m[y] : null),
          borderColor: SLOT_COLORS[i],
          backgroundColor: SLOT_COLORS[i] + '20',
          borderWidth: 3, tension: 0.3,
          pointRadius: 4, pointHoverRadius: 7,
          pointBackgroundColor: SLOT_COLORS[i],
          pointBorderColor: 'white', pointBorderWidth: 1.5,
          spanGaps: false,
        };
      });
    }

    const chart = new Chart(canvasRef.current, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: true, position: 'bottom', labels: { font: { size: 12, weight: 600 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#111827', padding: 12, cornerRadius: 6,
            callbacks: { label: c => c.dataset.label + ': ' + (c.parsed.y == null ? 'DNP' : c.parsed.y.toFixed(1) + ' bWAR') } },
        },
        scales: {
          y: { title: { display: true, text: 'bWAR', font: { size: 11, weight: 600 }, color: '#6B7280' },
               grid: { color: '#F3F4F6' }, ticks: { font: { family: "'Roboto Mono'", size: 11 } } },
          x: { title: { display: true, text: mode === 'career' ? 'Career Year' : 'Calendar Year', font: { size: 11, weight: 600 }, color: '#6B7280' },
               grid: { display: false }, ticks: { font: { family: "'Roboto Mono'", size: 11 } } },
        },
      },
    } as any);

    return () => chart.destroy();
  }, [players, mode]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Career Arc · bWAR Overlay</div>
        <div className="chart-toggle">
          <button className={mode === 'career' ? 'active' : ''} onClick={() => setMode('career')}>Career Year</button>
          <button className={mode === 'calendar' ? 'active' : ''} onClick={() => setMode('calendar')}>Calendar Year</button>
        </div>
      </div>
      <div className="chart-container"><canvas ref={canvasRef} /></div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        💡 <strong>Career Year</strong> mode aligns each player at year 1 — better for comparing aging curves regardless of birth year.
      </div>
    </div>
  );
}

function ToolsRadar({ players }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || players.length === 0) return;

    const chart = new Chart(canvasRef.current, {
      type: 'radar',
      data: {
        labels: TOOL_AXES,
        datasets: players.map((p, i) => ({
          label: p.name,
          data: TOOL_AXES.map(a => p.tools[a]),
          borderColor: SLOT_COLORS[i],
          backgroundColor: SLOT_COLORS[i] + '25',
          borderWidth: 2.5,
          pointBackgroundColor: SLOT_COLORS[i],
          pointBorderColor: 'white',
          pointBorderWidth: 1.5,
          pointRadius: 4,
          pointHoverRadius: 7,
        })),
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { size: 12, weight: 600 }, usePointStyle: true, padding: 16 } },
          tooltip: { backgroundColor: '#111827', padding: 10, cornerRadius: 6,
            callbacks: { label: c => c.dataset.label + ': ' + c.parsed.r + ' (20-80 scale)' } },
        },
        scales: {
          r: { min: 20, max: 80,
               ticks: { stepSize: 20, font: { family: "'Roboto Mono'", size: 10 }, backdropColor: 'transparent', color: '#9CA3AF' },
               pointLabels: { font: { size: 12, weight: 700 }, color: '#374151' },
               grid: { color: '#E5E7EB' },
               angleLines: { color: '#E5E7EB' } },
        },
      },
    } as any);

    return () => chart.destroy();
  }, [players]);

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Five-Tool Radar · 20-80 Scouting Scale</div>
        <div className="card-action">50 = MLB average · 80 = elite</div>
      </div>
      <div className="chart-container"><canvas ref={canvasRef} /></div>
    </div>
  );
}

function CompareTable({ players, highlightWinners, setHighlightWinners }) {
  const winnerIdx = (metric) => {
    if (!highlightWinners || players.length < 2) return -1;
    let best = -1, bestVal = -Infinity;
    players.forEach((p, i) => {
      const v = p.summary[metric.key];
      if (typeof v === 'number') {
        const score = metric.dir === 'low' ? -v : v;
        if (score > bestVal) { bestVal = score; best = i; }
      }
    });
    return best;
  };

  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Stat-by-Stat Comparison</div>
        <label className="winners-toggle">
          <input type="checkbox" checked={highlightWinners} onChange={e => setHighlightWinners(e.target.checked)} />
          Highlight winners
        </label>
      </div>
      <div style={{ overflowX: 'auto' }}>
      <table className="compare-table">
        <thead>
          <tr>
            <th className="metric-col" style={{ width: '30%' }}>Metric</th>
            {players.map((p, i) => (
              <th key={p.id}>
                <span className="col-color" style={{ background: SLOT_COLORS[i] }} />
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE_METRICS.map((m, mi) => {
            const winIdx = winnerIdx(m);
            return (
              <tr key={m.key}>
                <td className="metric">
                  {m.label}
                  <div className="meta">{m.desc}</div>
                </td>
                {players.map((p, i) => (
                  <td key={p.id} className={i === winIdx ? 'winner' : ''}>
                    {fmt(p.summary[m.key], m.fmt)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function PercentileCompare({ players }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Percentile Rankings · vs all-time MLB</div>
        <div className="card-action">100 = best in history</div>
      </div>
      {PCT_METRICS.map(metric => (
        <div className="pctc-row" key={metric}>
          <div className="pctc-label">{metric}</div>
          <div className="pctc-bar">
            {players.map((p, i) => {
              const v = p.percentiles[metric] ?? 50;
              return (
                <div key={p.id} className="pctc-marker"
                     title={`${p.name}: ${v}th percentile`}
                     style={{ left: v + '%', background: SLOT_COLORS[i] }}>
                  {p.initials}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <span>← Lower</span><span>50 = average</span><span>Higher →</span>
      </div>
    </div>
  );
}

function HeadToHead({ players }) {
  if (players.length < 2) return null;

  const battles = COMPARE_METRICS.filter(m => ['HR', 'OPS', 'wRC+', 'bWAR', 'SB', 'OBP'].includes(m.key));
  const wins = players.map(() => 0);
  battles.forEach(m => {
    let best = -Infinity, bestI = -1;
    players.forEach((p, i) => { const v = p.summary[m.key]; if (typeof v === 'number' && v > best) { best = v; bestI = i; } });
    if (bestI >= 0) wins[bestI]++;
  });

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">Head-to-Head Tally</div></div>
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, padding: '12px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8 }}>
        {players.map((p, i) => (
          <div key={p.id} style={{ flex: 1, textAlign: 'center' }}>
            <div className="mini-avatar" style={{ background: SLOT_COLORS[i], width: 28, height: 28, fontSize: 11, margin: '0 auto 6px' }}>{p.initials}</div>
            <div style={{ fontSize: 11, fontWeight: 600 }}>{p.name.split(' ')[0]}</div>
            <div style={{ fontFamily: 'var(--num-font)', fontSize: 24, fontWeight: 800, color: SLOT_COLORS[i], marginTop: 4 }}>{wins[i]}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>wins</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>Counted across {battles.length} key offensive metrics</div>
    </div>
  );
}

function SavedComparisons({ saved, user, onLoad, onDelete, onSignInClick }) {
  if (!user) {
    return (
      <div className="card">
        <div className="card-header"><div className="card-title">📁 Saved Comparisons</div></div>
        <div style={{ textAlign: 'center', padding: '20px 12px', color: 'var(--text-muted)', fontSize: 12.5, lineHeight: 1.55 }}>
          <div style={{ fontSize: 32, opacity: 0.3, marginBottom: 8 }}>📁</div>
          <div><strong onClick={onSignInClick} style={{ color: 'var(--mets-orange)', cursor: 'pointer' }}>Sign in</strong> to save comparisons and revisit them later.</div>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">📁 Saved Comparisons · {saved.length}</div></div>
      {saved.length === 0
        ? <div style={{ textAlign: 'center', padding: '18px', color: 'var(--text-muted)', fontSize: 12.5 }}>Click <strong>Save</strong> above to keep this matchup.</div>
        : saved.map(s => (
            <div key={s.id} className="saved-comp" onClick={() => onLoad(s)}>
              <span className="delete" onClick={e => { e.stopPropagation(); onDelete(s.id); }}>×</span>
              <div className="saved-comp-title">{s.name}</div>
              <div className="saved-comp-players">
                {s.playerIds.map((pid, i) => {
                  const p = PLAYERS.find(x => x.id === pid);
                  if (!p) return null;
                  return <div key={pid} className="mini-avatar" style={{ background: SLOT_COLORS[i] }}>{p.initials}</div>;
                })}
              </div>
              <div className="saved-comp-meta">{s.playerIds.length} players</div>
            </div>
          ))
      }
    </div>
  );
}

function SuggestedMatchups({ onLoad }) {
  return (
    <div className="card">
      <div className="card-header"><div className="card-title">⚔️ Suggested Matchups</div></div>
      {SUGGESTED_MATCHUPS.map((m, i) => (
        <a key={i} onClick={() => onLoad(m.players)}
           style={{ display: 'block', padding: '10px 12px', borderRadius: 6, fontSize: 13, marginBottom: 4, cursor: 'pointer', border: '1px solid transparent' }}
           onMouseEnter={e => { e.currentTarget.style.background = '#FFF7ED'; e.currentTarget.style.borderColor = '#FED7AA'; }}
           onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.borderColor = 'transparent'; }}>
          <div style={{ fontWeight: 600 }}>{m.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{m.meta}</div>
        </a>
      ))}
    </div>
  );
}

/* ============= PAGE ============= */

export default function LabPage() {
  const [user, setUser] = useState<any>(null);
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSaveComp, setShowSaveComp] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<any>(null); // slot index when picker open
  const [slots, setSlots] = useState([PLAYERS[0], PLAYERS[1], null, null]); // start with Wright vs Piazza
  const [highlightWinners, setHighlightWinners] = useState(true);
  const [saved, setSaved] = useState([]);
  const [toast, setToast] = useState<any>(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 2200); };

  const filledSlots = slots.filter(Boolean);
  const filledCount = filledSlots.length;

  const handlePick = (player) => {
    setSlots(s => s.map((sl, i) => i === pickerSlot ? player : sl));
    setPickerSlot(null);
  };
  const handleRemove = (idx) => setSlots(s => s.map((sl, i) => i === idx ? null : sl));

  const loadMatchup = (playerIds) => {
    const newSlots = [null, null, null, null];
    playerIds.forEach((pid, i) => { if (i < 4) newSlots[i] = PLAYERS.find(p => p.id === pid); });
    setSlots(newSlots);
    showToast(`Loaded matchup · ${playerIds.length} players`);
  };

  const onSignIn = (email) => {
    const t = (email || '').split('@')[0] || 'Fan';
    setUser({ name: t, handle: t.toLowerCase().replace(/\s+/g, '_'), initials: makeInitials(t), color: pickColor(t) });
    setShowSignIn(false);
  };
  const onSignOut = () => { setUser(null); setSaved([]); };

  const handleSaveComp = (name) => {
    setSaved(s => [...s, { id: Date.now(), name, playerIds: filledSlots.map(p => p.id) }]);
    setShowSaveComp(false);
    showToast('📁 Comparison saved');
  };

  const loadFromSaved = (s) => loadMatchup(s.playerIds);

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="hero-tag">Lab · Player Comparison</div>
          <div className="hero-title">Compare Players Side-by-Side</div>
          <div className="hero-sub">
            Stack up to 4 Mets legends against each other. Overlay their career arcs, compare 5-tool grades on the 20-80 scouting scale, and run a stat-by-stat showdown.
          </div>

          <div className="slots-row">
            {slots.map((p, i) => (
              <PlayerSlot key={i} player={p} slotIdx={i}
                          onClick={() => setPickerSlot(i)}
                          onRemove={() => handleRemove(i)} />
            ))}
          </div>

          <div className="quick-actions">
            <span className="lbl">Quick Matchups:</span>
            {SUGGESTED_MATCHUPS.slice(0, 3).map((m, i) => (
              <button key={i} className="matchup-pill" onClick={() => loadMatchup(m.players)}>
                {m.name}
              </button>
            ))}
            <button className="from-favs-btn" onClick={() => user ? loadMatchup([1, 7, 8]) : setShowSignIn(true)}>
              ★ Load my favorites
            </button>
          </div>
        </div>
      </section>

      <main className="main">
        <div className="content">
          {filledCount < 2 ? (
            <div className="card">
              <div className="empty-state">
                <div className="icon">⚔️</div>
                <h3>Add at least 2 players to start comparing</h3>
                <p>Click the slots above to pick players, or grab a quick matchup. Comparisons get more interesting with 3-4 players.</p>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                <button onClick={() => { navigator.clipboard?.writeText(window.location.href); showToast('🔗 Link copied'); }}
                        style={{ padding: '7px 14px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 500, background: 'white' }}>
                  ↗ Share comparison
                </button>
                <button onClick={() => user ? setShowSaveComp(true) : setShowSignIn(true)}
                        style={{ padding: '7px 14px', border: '1px solid var(--mets-blue)', borderRadius: 6, fontSize: 12, fontWeight: 600, color: 'var(--mets-blue)', background: 'white' }}>
                  📁 Save comparison
                </button>
              </div>

              <CareerArcOverlay players={filledSlots} />
              <ToolsRadar players={filledSlots} />
              <CompareTable players={filledSlots} highlightWinners={highlightWinners} setHighlightWinners={setHighlightWinners} />
              <PercentileCompare players={filledSlots} />
            </>
          )}
        </div>

        <aside className="sidebar">
          <HeadToHead players={filledSlots} />
          <SavedComparisons saved={saved} user={user} onLoad={loadFromSaved} onDelete={(id) => setSaved(s => s.filter(x => x.id !== id))} onSignInClick={() => setShowSignIn(true)} />
          <SuggestedMatchups onLoad={loadMatchup} />
        </aside>
      </main>

      {pickerSlot != null && <PlayerPicker slotIdx={pickerSlot} currentSelection={slots} user={user}
                                            onClose={() => setPickerSlot(null)} onPick={handlePick} />}
      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} onSignIn={onSignIn} />}
      {showSaveComp && <SaveCompModal onClose={() => setShowSaveComp(false)} onSave={handleSaveComp} players={filledSlots} />}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
