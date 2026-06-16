"use client";
import "./styles.css";
import { useState, useMemo } from "react";

const TYPES = [
  { key: 'all',     label: 'All',      count: 12824 },
  { key: 'video',   label: 'Videos',   count: 4218 },
  { key: 'photo',   label: 'Photos',   count: 7891 },
  { key: 'article', label: 'Articles', count: 612 },
  { key: 'podcast', label: 'Podcasts', count: 103 },
];

const ERAS = ['All eras','1962-79','1980-99','2000-19','2020-present'];
const PLAYERS = ['All players','David Wright','Mike Piazza','Jacob deGrom','Pete Alonso','Francisco Lindor','Daniel Murphy','Tom Seaver','Darryl Strawberry','Dwight Gooden','Carlos Beltran','Mookie Wilson','Keith Hernandez'];
const SEASONS = ['All seasons','2024','2023','2022','2015','2006','2000','1999','1986','1973','1969'];
const SOURCES = ['All sources','SNY','MLB Network','Mets Vault','User submitted','AP Photo','Newsday','New York Times'];

const FEATURED = {
  type: 'video',
  title: '"Bill Buckner\'s grounder" — full video & retrospective',
  meta: '12:47 · WS Game 6, 1986 · Featured this week',
  desc: 'The most replayed moment in Mets history, broken down play-by-play with multi-angle footage and oral histories from Mookie Wilson, Ray Knight, and Howard Johnson.',
  thumb: '6'
};

/* Generate a varied set of items */
const ITEMS = [
  { id:1,  type:'video',   bg:'bg-orange', icon:'⚾', title:'Pete Alonso 9th-inning 3-run HR vs Devin Williams',         meta:['MLB Network','2024 Wild Card G3','3:42'], tags:['Pete Alonso','2024 WC','Postseason'] , views: '847K' },
  { id:2,  type:'photo',   bg:'bg-mix1',   icon:'📷', title:'Lindor & Alonso celebrate after NLDS clincher',              meta:['AP Photo','Oct 9, 2024'],                tags:['Francisco Lindor','Pete Alonso','2024'], views: '224K' },
  { id:3,  type:'article', bg:'bg-mix3',   icon:'📰', title:'How OMG became the anthem of the 2024 Mets',                  meta:['Mets Vault','Oct 12, 2024 · 8 min read'], tags:['2024','Culture'], views: '156K' },
  { id:4,  type:'video',   bg:'bg-mix2',   icon:'🎯', title:'Jacob deGrom — every 100+ MPH pitch from 2021',               meta:['SNY','Compilation','11:08'],             tags:['Jacob deGrom','2021','Pitching'], views: '1.2M' },
  { id:5,  type:'podcast', bg:'bg-mix4',   icon:'🎙', title:'Amazin\' Avenue Audio — David Wright on captaincy',            meta:['Amazin\' Avenue','Episode 218','52:14'], tags:['David Wright','Interview'], views: '38K' },
  { id:6,  type:'video',   bg:'bg-mix5',   icon:'🏆', title:'1986 World Series — full Game 6, 10th inning',                meta:['Mets Vault','Oct 25, 1986','24:11'],     tags:['1986','World Series','Mookie Wilson'], views: '2.1M' },
  { id:7,  type:'photo',   bg:'bg-mix6',   icon:'📷', title:'Tom Seaver pitching at Shea — 1969 NLCS',                     meta:['AP Photo','Oct 4, 1969'],                tags:['Tom Seaver','1969'], views: '92K' },
  { id:8,  type:'article', bg:'bg-blue',   icon:'📰', title:'The trade that saved 2015: Cespedes to NY, by the numbers',   meta:['Mets Vault','Aug 1, 2025 · 12 min'],     tags:['2015','Yoenis Cespedes','Analysis'], views: '67K' },
  { id:9,  type:'video',   bg:'bg-orange', icon:'🎯', title:'Daniel Murphy hits HR in 6th straight postseason game',       meta:['MLB','NLCS G4 2015','1:38'],             tags:['Daniel Murphy','2015 NLCS'], views: '634K' },
  { id:10, type:'photo',   bg:'bg-mix1',   icon:'📷', title:'Mike Piazza\'s post-9/11 home run — Sept 21, 2001',           meta:['Newsday','Sep 21, 2001'],                tags:['Mike Piazza','2001'], views: '485K' },
  { id:11, type:'video',   bg:'bg-mix3',   icon:'⚾', title:'Pete Alonso breaks rookie HR record (53)',                    meta:['SNY','Sep 28, 2019','2:55'],             tags:['Pete Alonso','2019'], views: '912K' },
  { id:12, type:'podcast', bg:'bg-mix4',   icon:'🎙', title:'Talkin\' Mets — Carlos Beltran on the 2006 NLCS',             meta:['Talkin\' Mets','Episode 412','1:08:22'], tags:['Carlos Beltran','2006','Interview'], views: '24K' },
  { id:13, type:'article', bg:'bg-mix2',   icon:'📰', title:'The closer\'s mental game: Edwin Diaz returns from injury',   meta:['NYTimes','May 2, 2024 · 10 min'],         tags:['Edwin Diaz','Bullpen'], views: '88K' },
  { id:14, type:'video',   bg:'bg-mix5',   icon:'🎯', title:'Francisco Lindor walk-off HR vs Atlanta',                     meta:['MLB','Sep 30, 2024','2:14'],             tags:['Francisco Lindor','2024'], views: '511K' },
  { id:15, type:'photo',   bg:'bg-mix6',   icon:'📷', title:'1986 champagne celebration in clubhouse',                     meta:['AP Photo','Oct 27, 1986'],                tags:['1986','Championship'], views: '178K' },
  { id:16, type:'video',   bg:'bg-blue',   icon:'⚾', title:'Tug McGraw — "Ya Gotta Believe!" 1973 rallying speech',        meta:['Mets Vault','Sep 1973','1:55'],          tags:['1973','Tug McGraw'], views: '147K' },
];

const COLLECTIONS = [
  { id: 1, title: '"Ya Gotta Believe": The 1973 Story',  meta: '24 items · 8 videos · 14 photos · 2 articles', desc: 'How the 82–79 Mets shocked the NL.', cls: '' },
  { id: 2, title: 'The Captain — David Wright Career', meta: '156 items · 89 videos · 52 photos · 15 articles', desc: 'Every signature moment from 2004–18.', cls: 'v2' },
  { id: 3, title: '1986 World Series: Game-by-Game',   meta: '78 items · full broadcasts',          desc: 'Restored video, every game.',         cls: 'v3' },
  { id: 4, title: 'OMG — The 2024 Run',                 meta: '92 items · still updating',           desc: 'From sub-.500 to NLCS in five months.',cls: 'v4' },
];

const TRENDING = [
  { rank: 1, title: 'Lindor walk-off HR vs Phillies (NLDS clincher)', meta: '847K views · 2 days ago' },
  { rank: 2, title: 'Pete Alonso\'s career HR montage',                meta: '512K views · 5 days ago' },
  { rank: 3, title: '"OMG" celebration video — Citi Field',            meta: '498K views · 1 week ago' },
  { rank: 4, title: 'Jacob deGrom returns: every K from his 2024 ST',  meta: '402K views · 2 weeks ago' },
  { rank: 5, title: 'Edwin Diaz entrance — full Citi crowd',           meta: '356K views · 3 weeks ago' },
  { rank: 6, title: 'Top 10 plays from Citi Field, 2024',              meta: '289K views · 1 month ago' },
];

const RELATED_PEOPLE = [
  { name: 'David Wright',     items: 1284 },
  { name: 'Pete Alonso',      items: 942 },
  { name: 'Jacob deGrom',     items: 891 },
  { name: 'Francisco Lindor', items: 612 },
  { name: 'Mike Piazza',      items: 587 },
  { name: 'Mookie Wilson',    items: 412 },
];

/* ============= COMPONENTS ============= */
function PageHeader({ activeType, onType }) {
  return (
    <section className="page-header">
      <div className="page-header-inner">
        <div className="page-crumb"><a href="#">Mets Database</a> › <strong style={{color:'var(--text)'}}>Media Vault</strong></div>
        <h1 className="page-title">Media Vault</h1>
        <p className="page-sub">Every video, photo, article, and podcast in the Mets archive — searchable by player, season, or moment. 12,824 items and counting.</p>
        <div className="type-tabs">
          {TYPES.map(t => (
            <button key={t.key}
                    className={'type-tab ' + (activeType===t.key?'active':'')}
                    onClick={() => onType(t.key)}>
              {t.label}<span className="ct">{t.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Filters({ filters, onChange, onClear }) {
  return (
    <section className="filters">
      <div className="filters-inner">
        <div className="filter-group">
          <label className="filter-label">Era</label>
          <select className="filter-select" value={filters.era} onChange={e=>onChange('era', e.target.value)}>
            {ERAS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Season</label>
          <select className="filter-select" value={filters.season} onChange={e=>onChange('season', e.target.value)}>
            {SEASONS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Player</label>
          <select className="filter-select" value={filters.player} onChange={e=>onChange('player', e.target.value)}>
            {PLAYERS.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Source</label>
          <select className="filter-select" value={filters.source} onChange={e=>onChange('source', e.target.value)}>
            {SOURCES.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label className="filter-label">Tags</label>
          <input className="filter-input" placeholder="e.g. walk-off, championship..." />
        </div>
        <div className="filter-spacer"></div>
        <button className="filter-clear" onClick={onClear}>Clear filters</button>
        <div className="view-toggle">
          <button className={filters.view==='grid'?'active':''} onClick={()=>onChange('view','grid')}>▦ Grid</button>
          <button className={filters.view==='list'?'active':''} onClick={()=>onChange('view','list')}>≡ List</button>
        </div>
      </div>
    </section>
  );
}

function Featured() {
  return (
    <div className="featured">
      <div className="featured-thumb">{FEATURED.thumb}</div>
      <div className="featured-body">
        <span className="featured-pill">Featured · Video</span>
        <h2 className="featured-title">{FEATURED.title}</h2>
        <div className="featured-meta">{FEATURED.meta}</div>
        <p className="featured-desc">{FEATURED.desc}</p>
        <a href="#" className="featured-cta">▶  Watch now</a>
      </div>
    </div>
  );
}

function Item({ item }) {
  return (
    <div className="item">
      <div className={'item-thumb ' + item.bg}>
        <span style={{position:'relative', zIndex:0, fontSize:48}}>{item.icon}</span>
        <div className="item-thumb-overlay">
          <span className={'item-type-badge ' + item.type}>{item.type}</span>
          {item.type==='video' && item.meta[2] && <span className="item-duration">{item.meta[2]}</span>}
          {item.type==='podcast' && item.meta[2] && <span className="item-duration">{item.meta[2]}</span>}
        </div>
        {(item.type==='video' || item.type==='podcast') && <div className="play-icon-mini">{item.type==='podcast'?'🎙':'▶'}</div>}
      </div>
      <div className="item-body">
        <div className="item-title">{item.title}</div>
        <div className="item-meta">
          {item.meta.slice(0, item.type==='video'||item.type==='podcast'?2:item.meta.length).map((m,i) => (
            <span key={i} style={{display:'contents'}}>
              <span>{m}</span>
              {i < (item.type==='video'||item.type==='podcast'?1:item.meta.length-1) && <span className="dot">·</span>}
            </span>
          ))}
        </div>
        <div className="item-tags">
          {item.tags.slice(0,3).map(t => (
            <span key={t} className={'item-tag ' + (PLAYERS.includes(t)?'player':'')}>{t}</span>
          ))}
          <span style={{marginLeft:'auto', fontSize:10.5, color:'var(--text-light)', fontFamily:'var(--num-font)'}}>👁 {item.views}</span>
        </div>
      </div>
    </div>
  );
}

function ResultsGrid({ items }) {
  return (
    <div className="card">
      <div className="result-bar">
        <div className="result-count">Showing <strong>{items.length}</strong> of <strong>12,824</strong> items</div>
        <div className="sort-by">
          <span>Sort by</span>
          <select>
            <option>Most viewed</option>
            <option>Newest first</option>
            <option>Oldest first</option>
            <option>Most discussed</option>
            <option>Editor's picks</option>
          </select>
        </div>
      </div>
      <div className="chips">
        <span className="chip">Player: David Wright <span className="x">×</span></span>
        <span className="chip">Era: 2000-19 <span className="x">×</span></span>
        <span className="chip">Tag: walk-off <span className="x">×</span></span>
      </div>
      <div className="grid">
        {items.map(it => <Item key={it.id} item={it} />)}
      </div>
      <button className="load-more">Load 24 more</button>
    </div>
  );
}

function CollectionsCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Featured Collections</div>
        <div className="card-action">Browse all 47 →</div>
      </div>
      {COLLECTIONS.map(c => (
        <div key={c.id} className="collection">
          <div className={'col-thumb ' + c.cls}>
            {c.title.includes('1973')?'73': c.title.includes('Wright')?'5': c.title.includes('1986')?'86': '24'}
          </div>
          <div className="col-info">
            <div className="col-title">{c.title}</div>
            <div className="col-meta">{c.meta}</div>
            <div className="col-desc">{c.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendingCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Trending This Week</div>
        <div className="card-action">All time →</div>
      </div>
      {TRENDING.map(t => (
        <div key={t.rank} className="trend-item">
          <div className="trend-rank">{t.rank}</div>
          <div className="trend-body">
            <div className="trend-title">{t.title}</div>
            <div className="trend-meta">{t.meta}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PeopleCard() {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">Most Documented</div>
        <div className="card-action">Search all →</div>
      </div>
      {RELATED_PEOPLE.map(p => (
        <a href="/players" key={p.name} className="linkable" style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid var(--border)', textDecoration:'none', color:'inherit', fontSize:13}}>
          <span style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{width:30, height:30, borderRadius:'50%', background:'var(--mets-orange)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:11, flexShrink:0}}>
              {p.name.split(' ').map(s=>s[0]).join('')}
            </span>
            <span style={{fontWeight:500}}>{p.name}</span>
          </span>
          <span style={{fontFamily:'var(--num-font)', color:'var(--text-muted)', fontSize:12, fontWeight:600}}>{p.items}</span>
        </a>
      ))}
    </div>
  );
}

function SubmitCard() {
  return (
    <div className="card" style={{background:'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)', borderColor:'#FED7AA'}}>
      <div style={{fontSize:13.5, fontWeight:700, color:'var(--mets-orange)', marginBottom:6}}>📤  Got media to share?</div>
      <div style={{fontSize:12, color:'var(--text-muted)', lineHeight:1.5, marginBottom:12}}>Submit photos, videos, or memories. Approved submissions are credited to your account.</div>
      <button style={{background:'var(--mets-orange)', color:'white', padding:'8px 14px', borderRadius:6, fontSize:12.5, fontWeight:600, width:'100%'}}>Submit media →</button>
    </div>
  );
}

export default function MediaPage() {
  const [activeType, setActiveType] = useState('all');
  const [filters, setFilters] = useState({
    era: 'All eras', season: 'All seasons', player: 'All players',
    source: 'All sources', view: 'grid'
  });

  const change = (k, v) => setFilters(f => ({...f, [k]: v}));
  const clear = () => setFilters({era:'All eras', season:'All seasons', player:'All players', source:'All sources', view: filters.view});

  const items = useMemo(() => {
    if (activeType === 'all') return ITEMS;
    return ITEMS.filter(i => i.type === activeType);
  }, [activeType]);

  return (
    <>
      <PageHeader activeType={activeType} onType={setActiveType} />
      <Filters filters={filters} onChange={change} onClear={clear} />
      <main className="main">
        <div>
          <Featured />
          <ResultsGrid items={items} />
        </div>
        <aside>
          <CollectionsCard />
          <TrendingCard />
          <PeopleCard />
          <SubmitCard />
        </aside>
      </main>
    </>
  );
}
