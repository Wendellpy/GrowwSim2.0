// app.js - single module handling state, UI, charts
import { TIMEFRAMES, stocks, funds, latestPriceTF, rupee, pct, randomWalkUpdate, sensexSeries } from './data.js';

// ------- State -------
const DEFAULT_BALANCE = 100000; // ₹1,00,000
const STORAGE_KEY = 'growwSimStateV1';
const AUTH_KEY = 'growwSimAuthV1';
const USERS_KEY = 'growwSimUsersV1';
const AUTH_USER_KEY = 'growwSimAuthUserV1';

const State = {
  balance: DEFAULT_BALANCE,
  holdings: { /* stockId: { qty, avg } */ },
  mfHoldings: { /* fundId: { units, avg } */ },
  sips: [ /* { id, fundId, amount, startedAt } */ ],
  transactions: [ /* { ts, type, assetType, id, name, qty, units, price, nav, amount } */ ],
  watchlist: [],
  stockTF: '1D',
  liveEnabled: false,
  finnhubKey: '',
};

function getCurrentUser(){ return localStorage.getItem(AUTH_USER_KEY) || ''; }
function setCurrentUser(u){ if(u){ localStorage.setItem(AUTH_USER_KEY, u); } else { localStorage.removeItem(AUTH_USER_KEY); } }
function getStorageKey(){ const u = getCurrentUser(); return u ? `${STORAGE_KEY}:${u}` : STORAGE_KEY; }

function loadState(){
  const raw = localStorage.getItem(getStorageKey());
  if(!raw){
    saveState();
    return {...State};
  }
  try { return JSON.parse(raw); } catch(e){ return {...State}; }
}

function renderWatchlist(){
  const listEl = document.getElementById('watchlistList');
  const emptyEl = document.getElementById('watchlistEmpty');
  if(!listEl) return;
  listEl.innerHTML = '';
  const ids = State.watchlist || [];
  if(emptyEl) emptyEl.classList.toggle('hidden', ids.length>0);
  const labels = Array.from({length: 30}, (_,i)=> i+1);
  for(const id of ids){
    const s = stocks.find(x=>x.id===id);
    if(!s) continue;
    const card = document.createElement('div');
    card.className = 'card p-4 hover:shadow-md transition';
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold">${s.name}</div>
          <div class="text-sm text-neutral-500">${s.id}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold" id="price-watch-${s.id}">${rupee(latestPriceTF(s, State.stockTF))}</div>
          <div class="text-xs ${s.change>=0?'up':'down'}" id="chg-watch-${s.id}">${pct(s.change)}</div>
        </div>
      </div>
      <div class="h-20 mt-3"><canvas id="chart-watch-${s.id}"></canvas></div>
      <div class="mt-3 flex gap-2">
        <button class="btn btn-ghost" data-star="${s.id}">★</button>
        <button class="btn btn-primary" data-act="buy" data-id="${s.id}"><i class="fa-solid fa-plus"></i> Buy</button>
        <button class="btn btn-ghost" data-act="sell" data-id="${s.id}"><i class="fa-solid fa-minus"></i> Sell</button>
      </div>
    `;
    listEl.appendChild(card);
    const ctx = card.querySelector('canvas').getContext('2d');
    const key = `watch-${s.id}`;
    charts.get(key)?.destroy();
    charts.set(key, makeLineChart(ctx, labels, s.tf[State.stockTF]));
    card.querySelectorAll('button[data-act]')
      .forEach(btn => btn.addEventListener('click', () => onStockAction(btn.dataset.act, s.id)));
    const star = card.querySelector('button[data-star]');
    if(star){
      star.textContent = '★';
      star.classList.add('up');
      star.addEventListener('click', () => {
        const set = new Set(State.watchlist||[]);
        set.delete(s.id);
        State.watchlist = Array.from(set);
        saveState();
        renderWatchlist();
        renderStocks();
        showToast('Removed from Watchlist');
      });
    }
  }
}
function saveState(){ localStorage.setItem(getStorageKey(), JSON.stringify(State)); }

Object.assign(State, loadState());

// ------- Utils -------
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const round3 = (x) => Math.round((x + Number.EPSILON) * 1000) / 1000;
const MF_DUST = 0.01; // hide and auto-clear tiny residual MF units
const isLoggedIn = () => !!localStorage.getItem(AUTH_KEY);
const setLoggedIn = (val) => { if(val){ localStorage.setItem(AUTH_KEY, '1'); } else { localStorage.removeItem(AUTH_KEY); } };
function syncAuthUI(){
  const appShell = document.getElementById('appShell');
  const loginSection = document.getElementById('loginSection');
  const showApp = isLoggedIn();
  if(appShell) appShell.classList.toggle('hidden', !showApp);
  if(loginSection) loginSection.classList.toggle('hidden', showApp);
}
function loadUsers(){
  try{ const arr = JSON.parse(localStorage.getItem(USERS_KEY)||'[]'); return Array.isArray(arr)?arr:[]; }catch(e){ return []; }
}
function saveUsers(list){ localStorage.setItem(USERS_KEY, JSON.stringify(list)); }
function findUser(username){ const list = loadUsers(); return list.find(u=>u.username===username); }
function addUser(username, password){ const list = loadUsers(); if(list.some(u=>u.username===username)) return false; list.push({ username, password }); saveUsers(list); return true; }
const timeAgoShort = (t) => {
  if(!t) return '';
  const s = Math.max(0, Math.floor((Date.now()-t)/1000));
  if(s<2) return 'just now';
  if(s<60) return `${s}s ago`;
  const m = Math.floor(s/60);
  return `${m}m ago`;
};

function setText(id, txt){ const el = typeof id === 'string' ? document.getElementById(id) : id; if(el) el.textContent = txt; }

// ------- Tabs -------
function setupTabs(){
  const tabs = $$('#nav-tabs .tab');
  const mobileWrap = $('#mobile-tabs');
  tabs.forEach(t => {
    const clone = t.cloneNode(true);
    clone.classList.remove('tab-active');
    mobileWrap.appendChild(clone);
  });
  const allTabs = [...tabs, ...$$('#mobile-tabs .tab')];
  allTabs.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.target)));
}

function switchTab(id){
  $$('#nav-tabs .tab, #mobile-tabs .tab').forEach(b => b.classList.toggle('tab-active', b.dataset.target === id));
  $$('main > section').forEach(sec => sec.classList.toggle('hidden', sec.id !== id));
}

$('#mobileMenuBtn')?.addEventListener('click', () => {
  $('#mobileMenu')?.classList.toggle('hidden');
});

const liveBtn = document.getElementById('liveToggle');
const keyInput = document.getElementById('finnhubKey');
if(liveBtn){
  const syncLiveUI = () => {
    liveBtn.classList.toggle('tab-active', !!State.liveEnabled);
    if(keyInput) keyInput.value = State.finnhubKey || '';
  };
  liveBtn.addEventListener('click', () => { State.liveEnabled = !State.liveEnabled; saveState(); syncLiveUI(); });
  if(keyInput){ keyInput.addEventListener('change', () => { State.finnhubKey = keyInput.value.trim(); saveState(); }); }
  syncLiveUI();
}

const resetBtn = document.getElementById('resetBtn');
if(resetBtn){
  resetBtn.addEventListener('click', () => {
    openModal({
      title: 'Reset Data',
      bodyHTML: '<div class="text-sm">This will clear your balance, holdings, SIPs, and live settings. Continue?</div>',
      onConfirm: () => {
        localStorage.removeItem(getStorageKey());
        State.balance = DEFAULT_BALANCE;
        State.holdings = {};
        State.mfHoldings = {};
        State.sips = [];
        State.transactions = [];
        State.watchlist = [];
        State.stockTF = '1D';
        State.liveEnabled = false;
        State.finnhubKey = '';
        saveState();
        renderAll();
        showToast('Data reset', 'success');
      }
    });
  });
}

// ------- UI helpers: modal & toast -------
const modalEl = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const modalConfirm = document.getElementById('modalConfirm');
function openModal({ title, bodyHTML, onConfirm, onOpen }){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML || '';
  modalEl.classList.remove('hidden');
  modalEl.classList.add('flex');
  const closeBtns = modalEl.querySelectorAll('[data-close]');
  const close = () => { modalEl.classList.add('hidden'); modalEl.classList.remove('flex'); };
  closeBtns.forEach(b => b.onclick = close);
  try { onOpen?.(); } catch(e){}
  modalConfirm.onclick = async () => {
    try{
      const res = await onConfirm?.();
      if(res === false) return;
      close();
    } catch(e){ close(); }
  };
}
function showToast(msg, type='info'){
  const wrap = document.getElementById('toasts');
  const d = document.createElement('div');
  d.className = `card px-3 py-2 text-sm ${type==='error' ? 'down' : type==='success' ? 'up' : ''}`;
  d.textContent = msg;
  wrap.appendChild(d);
  setTimeout(()=>{ d.remove(); }, 3000);
}

// ------- Charts registry -------
const charts = new Map();
function makeLineChart(ctx, labels, data, color='rgb(16 185 129)'){
  const c = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: [{ data, borderColor: color, backgroundColor: 'rgba(16,185,129,0.12)', fill: true, tension: 0.35, pointRadius: 0 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: { duration: 200 },
      scales: { x: { display:false }, y: { display:false } },
      plugins: { legend:{display:false}, tooltip:{enabled:true} }
    }
  });
  return c;
}

// ------- Rendering -------
function refreshTopline(){
  setText('balanceDisplay', rupee(State.balance));
  setText('cashBalance', rupee(State.balance));
  const { value, invested } = computePortfolio();
  setText('portfolioValue', rupee(value + State.balance));
  setText('totalInvested', rupee(invested));
  const pl = value - invested;
  const el = document.getElementById('portfolioPL');
  if(el){
    el.textContent = `${pl>=0?'+':''}${rupee(Math.abs(pl))}`;
    el.className = `mt-2 text-sm ${pl>=0? 'up':'down'}`;
  }
}

function computePortfolio(){
  // stocks
  let invested = 0; let value = 0;
  for(const [id, pos] of Object.entries(State.holdings)){
    invested += pos.qty * pos.avg;
    const s = stocks.find(x => x.id===id);
    if(s) value += pos.qty * latestPriceTF(s, State.stockTF);
  }
  // funds
  for(const [id, pos] of Object.entries(State.mfHoldings)){
    invested += pos.units * pos.avg;
    const f = funds.find(x => x.id===id);
    if(f) value += pos.units * latestPriceTF(f, '1D');
  }
  return { invested, value };
}

function renderTxHistory(){
  const list = document.getElementById('txList');
  const empty = document.getElementById('txEmpty');
  if(!list) return;
  list.innerHTML = '';
  const arr = (State.transactions || []).slice().sort((a,b)=> b.ts - a.ts);
  if(empty) empty.classList.toggle('hidden', arr.length>0);
  for(const t of arr){
    const d = document.createElement('div');
    d.className = 'card p-3 flex items-center justify-between';
    const when = new Date(t.ts).toLocaleString('en-IN', { hour12:false });
    let left = '';
    if(t.assetType==='stock'){
      if(t.type==='buy' || t.type==='sell'){
        left = `${t.type.toUpperCase()} • ${t.name} (${t.id}) · Qty ${t.qty} @ ${rupee(t.price)}`;
      }
    } else if(t.assetType==='fund'){
      if(t.type==='invest'){
        left = `INVEST • ${t.name} · ${rupee(t.amount)} @ NAV ${rupee(t.nav)}`;
      } else if(t.type==='redeem'){
        left = `REDEEM • ${t.name} · ${rupee(t.amount)} (${(t.units||0).toFixed(3)} units)`;
      } else if(t.type==='sip_start'){
        left = `SIP START • ${t.name} · ${rupee(t.amount)}/mo`;
      }
    }
    const amt = t.amount ?? 0;
    const right = `<div class="text-right">
      <div class="${amt>=0?'up':'down'} font-medium">${amt>=0?'+':''}${rupee(Math.abs(amt))}</div>
      <div class="text-[10px] text-neutral-500">${when}</div>
    </div>`;
    d.innerHTML = `<div class="text-sm">${left}</div>${right}`;
    list.appendChild(d);
  }
}

function logTx(tx){
  if(!State.transactions) State.transactions = [];
  State.transactions.push({ ts: Date.now(), ...tx });
  saveState();
  renderTxHistory();
}

function updateChartsOnly(){
  const tf = State.stockTF;
  const mkSeriesFull = sensexSeries(tf);
  const mkSeries = mkSeriesFull.slice(-30);
  const len = mkSeries.length;
  const labelsDash = Array.from({length: len}, (_,i)=> i+1);
  const dash = charts.get('market');
  if(dash){ dash.data.labels = labelsDash; dash.data.datasets[0].data = mkSeries; dash.update('none'); }

  for(const s of stocks){
    const series = s.tf[tf].slice(-30);
    const labels = Array.from({length: series.length}, (_,i)=> i+1);
    const key = `stock-${s.id}`;
    const c = charts.get(key);
    if(c){ c.data.labels = labels; c.data.datasets[0].data = series; c.update('none'); }
    const p = document.getElementById(`price-${s.id}`);
    const ch = document.getElementById(`chg-${s.id}`);
    if(p) p.textContent = rupee(latestPriceTF(s, tf));
    if(ch){ ch.textContent = pct(s.change); ch.classList.toggle('up', s.change>=0); ch.classList.toggle('down', s.change<0); }
    const u = document.getElementById(`upd-${s.id}`);
    if(u){
      const t = liveStamp.get(s.id);
      u.textContent = State.liveEnabled && t ? `Live · ${timeAgoShort(t)}` : 'Simulated';
    }
  }

  // watchlist updates
  const wl = State.watchlist || [];
  for(const id of wl){
    const s = stocks.find(x=>x.id===id);
    if(!s) continue;
    const series = s.tf[tf].slice(-30);
    const labels = Array.from({length: series.length}, (_,i)=> i+1);
    const key = `watch-${s.id}`;
    const c = charts.get(key);
    if(c){ c.data.labels = labels; c.data.datasets[0].data = series; c.update('none'); }
    const p = document.getElementById(`price-watch-${s.id}`);
    const ch = document.getElementById(`chg-watch-${s.id}`);
    if(p) p.textContent = rupee(latestPriceTF(s, tf));
    if(ch){ ch.textContent = pct(s.change); ch.classList.toggle('up', s.change>=0); ch.classList.toggle('down', s.change<0); }
  }

  for(const f of funds){
    const series = f.tf['1D'].slice(-30);
    const labels = Array.from({length: series.length}, (_,i)=> i+1);
    const key = `fund-${f.id}`;
    const c = charts.get(key);
    const nav = latestPriceTF(f,'1D');
    if(c){ c.data.labels = labels; c.data.datasets[0].data = series; c.update('none'); }
    const n = document.getElementById(`nav-${f.id}`);
    if(n) n.textContent = rupee(nav);
  }
}

function renderDashboard(){
  // Market chart (use average of some stocks)
  const labels = Array.from({length: 30}, (_,i)=> i+1);
  const series = sensexSeries(State.stockTF).slice(-30);
  const ctx = document.getElementById('marketChart').getContext('2d');
  if(charts.get('market')){
    const c = charts.get('market');
    c.data.labels = labels;
    c.data.datasets[0].data = series;
    c.update('none');
  } else {
    charts.set('market', makeLineChart(ctx, labels, series));
  }
  const grp = document.getElementById('dashTfGroup');
  if(grp){
    grp.querySelectorAll('button').forEach(b => {
      b.classList.toggle('tab-active', b.dataset.tf === State.stockTF);
      if(!b._bound){
        b._bound = true;
        b.addEventListener('click', () => { State.stockTF = b.dataset.tf; saveState(); renderAll(); });
      }
    });
  }
}

function renderStocks(){
  const wrap = document.getElementById('stocksList');
  wrap.innerHTML = '';
  const labels = Array.from({length: 30}, (_,i)=> i+1);
  const q = ($('#stockSearch')?.value || '').trim().toLowerCase();
  const list = q ? stocks.filter(s => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)) : stocks;
  for(const s of list){
    const card = document.createElement('div');
    card.className = 'card p-4 hover:shadow-md transition';
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold">${s.name}</div>
          <div class="text-sm text-neutral-500">${s.id}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold" id="price-${s.id}">${rupee(latestPriceTF(s, State.stockTF))}</div>
          <div class="text-xs ${s.change>=0?'up':'down'}" id="chg-${s.id}">${pct(s.change)}</div>
          <div class="text-[10px] text-neutral-500" id="upd-${s.id}"></div>
        </div>
      </div>
      <div class="h-20 mt-3"><canvas id="chart-${s.id}"></canvas></div>
      <div class="mt-3 flex gap-2">
        <button class="btn btn-ghost" data-star="${s.id}">★</button>
        <button class="btn btn-primary" data-act="buy" data-id="${s.id}"><i class="fa-solid fa-plus"></i> Buy</button>
        <button class="btn btn-ghost" data-act="sell" data-id="${s.id}"><i class="fa-solid fa-minus"></i> Sell</button>
      </div>
    `;
    wrap.appendChild(card);

    // chart
    const ctx = card.querySelector('canvas').getContext('2d');
    const key = `stock-${s.id}`;
    charts.get(key)?.destroy();
    charts.set(key, makeLineChart(ctx, labels, s.tf[State.stockTF]));

    // buttons
    card.querySelectorAll('button[data-act]')
      .forEach(btn => btn.addEventListener('click', () => onStockAction(btn.dataset.act, s.id)));
    const star = card.querySelector('button[data-star]');
    if(star){
      const inWL = (State.watchlist||[]).includes(s.id);
      star.textContent = inWL ? '★' : '☆';
      star.classList.toggle('up', inWL);
      star.addEventListener('click', () => {
        const set = new Set(State.watchlist||[]);
        if(set.has(s.id)) set.delete(s.id); else set.add(s.id);
        State.watchlist = Array.from(set);
        saveState();
        renderStocks();
        renderWatchlist();
        showToast(inWL ? 'Removed from Watchlist' : 'Added to Watchlist');
      });
    }
  }
  // timeframe header buttons
  $('#stockTfGroup')?.querySelectorAll('button').forEach(b => {
    b.classList.toggle('tab-active', b.dataset.tf === State.stockTF);
    b.onclick = () => { State.stockTF = b.dataset.tf; saveState(); renderAll(); };
  });
  const search = document.getElementById('stockSearch');
  if(search && !search._bound){
    search._bound = true;
    search.addEventListener('input', () => renderStocks());
  }
}

function onStockAction(act, id){
  const s = stocks.find(x=>x.id===id);
  if(!s) return;
  if(act==='buy'){
    openModal({
      title: `Buy ${s.name}`,
      bodyHTML: `<label class="text-sm">Quantity</label><input id="qtyInput" type="number" class="mt-1 w-full card px-3 py-2" value="1" min="1" />` ,
      onConfirm: () => {
        const qty = parseInt(document.getElementById('qtyInput').value);
        if(!qty || qty<=0) return false;
        const price = latestPriceTF(s, State.stockTF);
        const cost = price * qty;
        if(cost > State.balance){ showToast('Not enough balance', 'error'); return false; }
        const pos = State.holdings[id] || { qty:0, avg: 0 };
        const newQty = pos.qty + qty;
        const newAvg = (pos.qty*pos.avg + cost)/newQty;
        State.holdings[id] = { qty: newQty, avg: newAvg };
        State.balance -= cost;
        logTx({ type:'buy', assetType:'stock', id, name:s.name, qty, price, amount: -cost });
        saveState(); refreshTopline(); renderPortfolio(); renderStocks();
        showToast('Order executed', 'success');
      }
    });
  } else {
    const pos = State.holdings[id];
    if(!pos || pos.qty<=0){ showToast('No holdings to sell', 'error'); return; }
    openModal({
      title: `Sell ${s.name}`,
      bodyHTML: `<label class="text-sm">Quantity (max ${pos.qty})</label><input id="qtyInput" type="number" class="mt-1 w-full card px-3 py-2" value="${pos.qty}" min="1" max="${pos.qty}" />` ,
      onConfirm: () => {
        const qty = parseInt(document.getElementById('qtyInput').value);
        if(!qty || qty<=0 || qty>pos.qty) return false;
        const price = latestPriceTF(s, State.stockTF);
        const value = price * qty;
        pos.qty -= qty;
        if(pos.qty <= 1e-6) delete State.holdings[id];
        State.balance += value;
        logTx({ type:'sell', assetType:'stock', id, name:s.name, qty, price, amount: value });
        saveState(); refreshTopline(); renderPortfolio(); renderStocks();
        showToast('Sold successfully', 'success');
      }
    });
  }
}

function renderFunds(){
  const wrap = document.getElementById('fundsList');
  wrap.innerHTML = '';
  const labels = Array.from({length: 30}, (_,i)=> i+1);
  for(const f of funds){
    const card = document.createElement('div');
    card.className = 'card p-4 hover:shadow-md transition';
    const held = State.mfHoldings[f.id];
    const heldUnits = held && held.units >= MF_DUST ? held.units : 0;
    card.innerHTML = `
      <div class="flex items-start justify-between">
        <div>
          <div class="font-semibold">${f.name}</div>
          <div class="text-sm text-neutral-500">NAV <span id="nav-${f.id}">${rupee(latestPriceTF(f,'1D'))}</span>${heldUnits>0 ? ` · Units: ${heldUnits.toFixed(3)}` : ''}</div>
        </div>
        <div class="text-right">
          <div class="font-semibold"></div>
          <div class="text-xs up">1Y ${pct(f.oneY)}</div>
        </div>
      </div>
      <div class="h-20 mt-3"><canvas id="chart-${f.id}"></canvas></div>
      <div class="mt-3 flex gap-2">
        <button class="btn btn-primary" data-act="invest" data-id="${f.id}">Invest Now</button>
        <button class="btn btn-ghost" data-act="sip" data-id="${f.id}">Start SIP</button>
        ${heldUnits>0 ? `<button class="btn btn-ghost" data-act="redeem" data-id="${f.id}">Redeem</button>` : ''}
      </div>
    `;
    wrap.appendChild(card);

    const ctx = card.querySelector('canvas').getContext('2d');
    const key = `fund-${f.id}`;
    charts.get(key)?.destroy();
    charts.set(key, makeLineChart(ctx, labels, f.tf['1D'], 'rgb(59 130 246)'));

    card.querySelectorAll('button[data-act]')
      .forEach(btn => btn.addEventListener('click', () => onFundAction(btn.dataset.act, f.id)));
  }
  renderMySips();
}

function onFundAction(act, id){
  const f = funds.find(x=>x.id===id);
  if(!f) return;
  if(act==='invest'){
    openModal({
      title: `Invest in ${f.name}`,
      bodyHTML: `<label class="text-sm">Amount (₹)</label><input id="amtInput" type="number" class="mt-1 w-full card px-3 py-2" value="1000" min="1" />` ,
      onConfirm: () => {
        const amt = parseInt(document.getElementById('amtInput').value);
        if(!amt || amt<=0) return false;
        if(amt > State.balance){ showToast('Not enough balance', 'error'); return false; }
        const nav = latestPriceTF(f,'1D');
        const units = amt / nav;
        const pos = State.mfHoldings[id] || { units:0, avg:0 };
        const newUnits = round3(pos.units + units);
        const newAvg = (pos.units*pos.avg + amt)/newUnits;
        State.mfHoldings[id] = { units: newUnits, avg: newAvg };
        State.balance -= amt;
        logTx({ type:'invest', assetType:'fund', id, name:f.name, nav, amount: -amt, units });
        saveState(); refreshTopline(); renderFunds(); renderPortfolio();
        showToast('Invested successfully', 'success');
      }
    });
  } else if(act==='sip'){
    openModal({
      title: `Start SIP - ${f.name}`,
      bodyHTML: `<label class="text-sm">Monthly Amount (₹)</label><input id="amtInput" type="number" class="mt-1 w-full card px-3 py-2" value="2000" min="1" />` ,
      onConfirm: () => {
        const amt = parseInt(document.getElementById('amtInput').value);
        if(!amt || amt<=0) return false;
        const sip = { id: `SIP-${Date.now()}`, fundId: id, amount: amt, startedAt: new Date().toISOString() };
        State.sips.push(sip);
        logTx({ type:'sip_start', assetType:'fund', id, name:f.name, amount: amt });
        saveState(); renderFunds(); showToast('SIP started', 'success');
      }
    });
  } else if(act==='redeem'){
    const pos = State.mfHoldings[id];
    if(!pos || pos.units < MF_DUST){ showToast('No holdings to redeem', 'error'); return; }
    const nav = latestPriceTF(f,'1D');
    const maxAmount = Math.floor(pos.units * nav);
    openModal({
      title: `Redeem ${f.name}`,
      bodyHTML: `
        <div class="text-xs text-neutral-500">Available units: ${pos.units.toFixed(3)} (≈ ${rupee(maxAmount)})</div>
        <div class="mt-2 flex gap-2 text-xs">
          <button class="chip btn-ghost" id="modeAmount">By Amount (₹)</button>
          <button class="chip btn-ghost" id="modeUnits">By Units</button>
        </div>
        <div class="mt-2" id="redeemFields"></div>
      `,
      onOpen: () => {
        const fields = document.getElementById('redeemFields');
        const btnAmt = document.getElementById('modeAmount');
        const btnUnits = document.getElementById('modeUnits');
        let mode = 'amount';
        const renderFields = () => {
          btnAmt.classList.toggle('tab-active', mode==='amount');
          btnUnits.classList.toggle('tab-active', mode==='units');
          if(mode==='amount'){
            fields.innerHTML = `
              <label class="text-sm">Amount (₹)</label>
              <div class="flex gap-2 mt-1">
                <input id="amtInput" type="number" class="w-full card px-3 py-2" value="${Math.min(1000, maxAmount)}" min="1" max="${maxAmount}" />
                <button id="maxAmt" class="btn btn-ghost">Max</button>
              </div>`;
            document.getElementById('maxAmt').onclick = () => { const a=document.getElementById('amtInput'); a.value = String(maxAmount); };
          } else {
            fields.innerHTML = `
              <label class="text-sm">Units</label>
              <div class="flex gap-2 mt-1">
                <input id="unitInput" type="number" step="0.001" class="w-full card px-3 py-2" value="${Math.min(pos.units, 1).toFixed(3)}" min="0.001" max="${pos.units.toFixed(3)}" />
                <button id="maxUnits" class="btn btn-ghost">Max</button>
              </div>
              <div class="text-xs text-neutral-500 mt-1">Value is computed at current NAV</div>`;
            document.getElementById('maxUnits').onclick = () => { const u=document.getElementById('unitInput'); u.value = String(pos.units.toFixed(3)); };
          }
        };
        btnAmt.onclick = () => { mode='amount'; renderFields(); };
        btnUnits.onclick = () => { mode='units'; renderFields(); };
        renderFields();
        modalConfirm._redeemMode = () => mode;
      },
      onConfirm: () => {
        const mode = modalConfirm._redeemMode ? modalConfirm._redeemMode() : 'amount';
        if(mode==='amount'){
          const amt = parseInt(document.getElementById('amtInput').value);
          if(!amt || amt<=0) return false;
          if(amt > maxAmount){ showToast('Exceeds redeemable amount', 'error'); return false; }
          const units = Math.min(pos.units, round3(amt / nav));
          const newUnits = round3(pos.units - units);
          if(newUnits < MF_DUST){ delete State.mfHoldings[id]; } else { pos.units = newUnits; }
          State.balance += amt;
          logTx({ type:'redeem', assetType:'fund', id, name:f.name, nav, amount: amt, units });
        } else {
          const units = round3(parseFloat(document.getElementById('unitInput').value));
          if(!units || units<=0) return false;
          if(units > pos.units + 1e-9){ showToast('Exceeds available units', 'error'); return false; }
          const amt = units * nav;
          const newUnits = round3(pos.units - units);
          if(newUnits < MF_DUST){ delete State.mfHoldings[id]; } else { pos.units = newUnits; }
          State.balance += amt;
          logTx({ type:'redeem', assetType:'fund', id, name:f.name, nav, amount: amt, units });
        }
        saveState(); refreshTopline(); renderPortfolio(); renderFunds();
        showToast('Redeemed successfully', 'success');
      }
    });
  }
}

function renderMySips(){
  const wrap = document.getElementById('mySips');
  wrap.innerHTML = '';
  for(const s of State.sips){
    const f = funds.find(x=>x.id===s.fundId);
    const card = document.createElement('div');
    card.className = 'card p-4 flex flex-col gap-2';
    card.innerHTML = `
      <div class="font-medium">${f?.name ?? s.fundId}</div>
      <div class="text-sm text-neutral-500">₹${s.amount.toLocaleString('en-IN')} / month</div>
      <button class="btn btn-ghost text-rose-600" data-id="${s.id}"><i class="fa-solid fa-trash"></i> Stop SIP</button>
    `;
    card.querySelector('button')?.addEventListener('click', () => {
      const idx = State.sips.findIndex(x=>x.id===s.id);
      if(idx>=0) State.sips.splice(idx,1);
      saveState();
      renderMySips();
    });
    wrap.appendChild(card);
  }
}

function renderSipCalculator(){
  $('#calcSipBtn')?.addEventListener('click', calcSip);
  const amt = document.getElementById('sipAmount');
  const rate = document.getElementById('sipRate');
  const years = document.getElementById('sipYears');
  const amtVal = document.getElementById('sipAmountVal');
  const rateVal = document.getElementById('sipRateVal');
  const yearsVal = document.getElementById('sipYearsVal');
  const onChange = () => {
    if(amtVal && amt) amtVal.textContent = rupee(Number(amt.value||0));
    if(rateVal && rate) rateVal.textContent = `${Number(rate.value||0)}%`;
    if(yearsVal && years) yearsVal.textContent = `${Number(years.value||0)}y`;
    calcSip();
  };
  amt?.addEventListener('input', onChange);
  rate?.addEventListener('input', onChange);
  years?.addEventListener('input', onChange);
  onChange();
}

function calcSip(){
  const P = Number($('#sipAmount').value || 0);
  const r = Number($('#sipRate').value || 0)/100;
  const y = Number($('#sipYears').value || 0);
  const n = 12 * y;
  const i = r/12;
  const invested = P * n;
  const fv = i === 0 ? invested : P * ((Math.pow(1+i, n)-1)/i) * (1+i);

  setText('sipInvested', rupee(invested));
  setText('sipExpected', rupee(fv));
  setText('sipGain', rupee(fv - invested));

  // growth per month
  const labels = Array.from({length: n}, (_,k)=> k+1);
  const values = labels.map(m => i === 0 ? P*m : P * ((Math.pow(1+i, m)-1)/i) * (1+i));
  const ctx = document.getElementById('sipChart').getContext('2d');

  const key = 'sip';
  const existing = charts.get(key);
  if(existing){
    existing.data.labels = labels;
    existing.data.datasets[0].data = values;
    existing.update('none');
  } else {
    charts.set(key, makeLineChart(ctx, labels, values, 'rgb(99 102 241)'));
  }
}

function renderPortfolio(){
  const sum = computePortfolio();
  setText('pfInvested', rupee(sum.invested));
  setText('pfValue', rupee(sum.value));
  const pfpl = document.getElementById('pfPL');
  if(pfpl){
    const pl = sum.value - sum.invested;
    pfpl.textContent = rupee(pl);
    pfpl.classList.toggle('up', pl>=0);
    pfpl.classList.toggle('down', pl<0);
  }

  const swrap = document.getElementById('portfolioStocks');
  const sempty = document.getElementById('portfolioStocksEmpty');
  if(swrap){ swrap.innerHTML = ''; }
  let scount = 0;
  for(const [id, pos] of Object.entries(State.holdings)){
    const s = stocks.find(x=>x.id===id);
    if(!s) continue;
    scount++;
    const price = latestPriceTF(s, State.stockTF);
    const value = pos.qty * price;
    const invested = pos.qty * pos.avg;
    const pl = value - invested;
    const card = document.createElement('div');
    card.className = 'card p-4';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="font-semibold">${s.name}</div>
          <div class="text-xs">Qty: ${pos.qty}</div>
        </div>
        <div class="text-right">
          <div class="text-sm">Value: ${rupee(value)}</div>
          <div class="text-xs ${pl>=0?'up':'down'}">P/L: ${rupee(pl)}</div>
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <button class="btn btn-ghost" data-sell="${id}">Sell</button>
      </div>`;
    swrap?.appendChild(card);
    const sellBtn = card.querySelector('button[data-sell]');
    if(sellBtn){ sellBtn.addEventListener('click', () => onStockAction('sell', id)); }
  }
  if(sempty){ sempty.classList.toggle('hidden', scount>0); }

  const fwrap = document.getElementById('portfolioFunds');
  const fempty = document.getElementById('portfolioFundsEmpty');
  if(fwrap){ fwrap.innerHTML = ''; }
  let fcount = 0;
  for(const [id, pos] of Object.entries(State.mfHoldings)){
    if(!pos || pos.units < MF_DUST) { continue; }
    const f = funds.find(x=>x.id===id);
    if(!f) continue;
    fcount++;
    const nav = latestPriceTF(f,'1D');
    const value = pos.units * nav;
    const invested = pos.units * pos.avg;
    const pl = value - invested;
    const card = document.createElement('div');
    card.className = 'card p-4';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <div class="font-semibold">${f.name}</div>
          <div class="text-xs">Units: ${pos.units.toFixed(3)}</div>
        </div>
        <div class="text-right">
          <div class="text-sm">Value: ${rupee(value)}</div>
          <div class="text-xs ${pl>=0?'up':'down'}">P/L: ${rupee(pl)}</div>
        </div>
      </div>
      <div class="mt-3 flex justify-end">
        <button class="btn btn-ghost" data-redeem="${id}">Redeem</button>
      </div>`;
    fwrap?.appendChild(card);
    const btn = card.querySelector('button[data-redeem]');
    if(btn){ btn.addEventListener('click', () => onFundAction('redeem', id)); }
  }
  if(fempty){ fempty.classList.toggle('hidden', fcount>0); }
}

const symbolMap = {
  'TCS': 'TCS.NS',
  'INFY': 'INFY.NS',
  'RELI': 'RELIANCE.NS',
  'HDFCB': 'HDFCBANK.NS',
  'ICICI': 'ICICIBANK.NS',
  'SBIN': 'SBIN.NS',
  'LT': 'LT.NS',
  'ITC': 'ITC.NS',
  'BHARTI': 'BHARTIARTL.NS',
  'HINDUNIL': 'HINDUNILVR.NS',
};
let liveIndex = 0;
let lastLiveAt = 0;
const liveStamp = new Map();
async function fetchLiveOnce(){
  if(!State.liveEnabled || !State.finnhubKey) return;
  const now = Date.now();
  if(now - lastLiveAt < 5000) return;
  lastLiveAt = now;
  const s = stocks[liveIndex % stocks.length];
  liveIndex++;
  const sym = symbolMap[s.id] || s.id;
  try{
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(State.finnhubKey)}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = data && typeof data.c !== 'undefined' ? Number(data.c) : NaN;
    if(!isNaN(price) && price > 0){
      const arr = s.tf['1D'];
      const last = arr[arr.length-1];
      arr.push(price);
      if(arr.length>40) arr.shift();
      s.price = price;
      s.change = last ? ((price-last)/last)*100 : 0;
      liveStamp.set(s.id, Date.now());
      updateChartsOnly();
      const liveBtn = document.getElementById('liveToggle');
      if(liveBtn){ const old = liveBtn.innerHTML; liveBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Live ✓'; setTimeout(()=>{ liveBtn.innerHTML = old; }, 800); }
    }
  }catch(e){}
}

function startTicker(){
  let lastDemoAt = 0;
  let lastFullRenderAt = 0;
  setInterval(() => {
    try{
      const now = Date.now();
      if(State.liveEnabled){
        if(now - lastDemoAt > 4000){ stocks.forEach(randomWalkUpdate); lastDemoAt = now; }
      } else {
        stocks.forEach(randomWalkUpdate);
      }
      funds.forEach(randomWalkUpdate);
      refreshTopline();
      updateChartsOnly();
      if(now - lastFullRenderAt > 10000){ renderStocks(); renderWatchlist(); renderFunds(); lastFullRenderAt = now; }
      renderPortfolio();
    } catch(e){ console && console.warn && console.warn('ticker error', e); }
  }, 1000);
  setInterval(() => { try{ fetchLiveOnce(); } catch(e){} }, 1000);
  const heartbeat = () => { try{ updateChartsOnly(); } finally { requestAnimationFrame(heartbeat); } };
  requestAnimationFrame(heartbeat);
}

// ------- Init -------
function renderAll(){
  refreshTopline();
  renderDashboard();
  renderStocks();
  renderWatchlist();
  renderFunds();
  renderSipCalculator();
  renderTxHistory();
  renderPortfolio();
}

let _appInited = false;
function initAppOnce(){
  if(_appInited) return;
  _appInited = true;
  setupTabs();
  renderAll();
  startTicker();
}

function setupAuth(){
  // Login
  const loginBtn = document.getElementById('loginBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const signupBtn = document.getElementById('signupBtn');
  const err = document.getElementById('loginError');
  if(loginBtn && !loginBtn._bound){
    loginBtn._bound = true;
    loginBtn.addEventListener('click', () => {
      const u = (document.getElementById('loginUsername')?.value || '').trim();
      const p = (document.getElementById('loginPassword')?.value || '').trim();
      let ok = (u === 'demo' && p === 'demo123');
      if(!ok){ const rec = findUser(u); ok = !!rec && rec.password === p; }
      if(ok){
        setLoggedIn(true);
        setCurrentUser(u);
        if(err) err.classList.add('hidden');
        syncAuthUI();
        Object.assign(State, loadState());
        initAppOnce();
        showToast('Logged in', 'success');
      } else {
        if(err) err.classList.remove('hidden');
      }
    });
  }
  if(signupBtn && !signupBtn._bound){
    signupBtn._bound = true;
    signupBtn.addEventListener('click', () => {
      const u = (document.getElementById('loginUsername')?.value || '').trim();
      const p = (document.getElementById('loginPassword')?.value || '').trim();
      if(u.length < 3 || p.length < 3){ showToast('Use at least 3 characters', 'error'); return; }
      if(findUser(u)){ showToast('Username already exists', 'error'); return; }
      const ok = addUser(u, p);
      if(!ok){ showToast('Could not sign up', 'error'); return; }
      setCurrentUser(u);
      setLoggedIn(true);
      if(err) err.classList.add('hidden');
      Object.assign(State, loadState());
      syncAuthUI();
      initAppOnce();
      showToast('Account created', 'success');
    });
  }
  if(logoutBtn && !logoutBtn._bound){
    logoutBtn._bound = true;
    logoutBtn.addEventListener('click', () => {
      setLoggedIn(false);
      setCurrentUser('');
      // simplest: reload to stop timers and reset UI
      location.reload();
    });
  }
}

// Bootstrap
syncAuthUI();
setupAuth();
if(isLoggedIn()){
  initAppOnce();
}
