// data.js - dummy market data and helpers
export const TIMEFRAMES = ['1D','1W','1M','1Y'];

function genSeries(points, start = 100, vol = 1.2) {
  const arr = [start];
  for (let i = 1; i < points; i++) {
    const drift = 0.02;
    const change = (Math.random() - 0.5) * vol + drift;
    arr.push(Math.max(1, parseFloat((arr[i-1] * (1 + change/100)).toFixed(2))));
  }
  return arr;
}

function makeTF(start){
  return {
    '1D': genSeries(30, start, 0.8),
    '1W': genSeries(30, start, 1.2),
    '1M': genSeries(30, start, 1.5),
    '1Y': genSeries(30, start, 2.0),
  }
}

export const stocks = [
  { id: 'TCS', name: 'TCS', price: 3850, change: 0.6 },
  { id: 'INFY', name: 'Infosys', price: 1620, change: -0.3 },
  { id: 'RELI', name: 'Reliance', price: 2520, change: 0.9 },
  { id: 'HDFCB', name: 'HDFC Bank', price: 1530, change: -0.2 },
  { id: 'ICICI', name: 'ICICI Bank', price: 980, change: 0.4 },
  { id: 'SBIN', name: 'SBI', price: 710, change: 1.1 },
  { id: 'LT', name: 'Larsen & Toubro', price: 3520, change: -0.5 },
  { id: 'ITC', name: 'ITC', price: 460, change: 0.2 },
  { id: 'BHARTI', name: 'Bharti Airtel', price: 1210, change: -0.4 },
  { id: 'HINDUNIL', name: 'HUL', price: 2490, change: 0.1 },
  { id: 'MARUTI', name: 'Maruti Suzuki', price: 10950, change: 0.3 },
  { id: 'BAJFIN', name: 'Bajaj Finance', price: 7250, change: -0.6 },
  { id: 'ADANIENT', name: 'Adani Enterprises', price: 2740, change: 0.8 },
  { id: 'WIPRO', name: 'Wipro', price: 455, change: 0.2 },
  { id: 'TECHM', name: 'Tech Mahindra', price: 1340, change: -0.1 },
  { id: 'ULTRACEM', name: 'UltraTech Cement', price: 9800, change: 0.5 },
  { id: 'KOTAK', name: 'Kotak Mahindra Bank', price: 1770, change: 0.2 },
  { id: 'TATAMOT', name: 'Tata Motors', price: 860, change: 1.0 },
  { id: 'JSWSTEEL', name: 'JSW Steel', price: 875, change: -0.3 },
  { id: 'HCLTECH', name: 'HCL Technologies', price: 1505, change: 0.4 },
  { id: 'TATASTEEL', name: 'Tata Steel', price: 145, change: 0.3 },
  { id: 'COAL', name: 'Coal India', price: 420, change: -0.2 },
  { id: 'POWERGRID', name: 'Power Grid', price: 255, change: 0.1 },
  { id: 'NTPC', name: 'NTPC', price: 330, change: 0.2 },
  { id: 'ONGC', name: 'ONGC', price: 205, change: -0.1 },
  { id: 'BPCL', name: 'BPCL', price: 610, change: 0.3 },
  { id: 'HDFCLIFE', name: 'HDFC Life', price: 640, change: 0.2 },
  { id: 'SBILIFE', name: 'SBI Life', price: 1420, change: -0.1 },
  { id: 'BAJAJ-AUTO', name: 'Bajaj Auto', price: 8940, change: 0.5 },
  { id: 'EICHER', name: 'Eicher Motors', price: 4130, change: 0.3 },
  { id: 'HEROMOTO', name: 'Hero MotoCorp', price: 4100, change: -0.2 },
  { id: 'TATAPOWER', name: 'Tata Power', price: 390, change: 0.4 },
  { id: 'M_M', name: 'Mahindra & Mahindra', price: 1725, change: 0.2 },
  { id: 'SUNPHARMA', name: 'Sun Pharma', price: 1390, change: 0.3 },
  { id: 'DRREDDY', name: 
    "Dr. Reddy's", price: 12450, change: -0.1 },
  { id: 'CIPLA', name: 'Cipla', price: 1260, change: 0.2 },
  { id: 'DIVIS', name: "Divi's Labs", price: 4270, change: 0.2 },
  { id: 'APOLLOHOSP', name: 'Apollo Hospitals', price: 6350, change: 0.4 },
  { id: 'BRITANNIA', name: 'Britannia', price: 5180, change: 0.1 },
  { id: 'DABUR', name: 'Dabur', price: 550, change: -0.1 },
  { id: 'NESTLE', name: 'Nestle India', price: 24300, change: 0.2 },
  { id: 'PIDILITE', name: 'Pidilite', price: 2900, change: 0.3 },
  { id: 'ASIANPAINT', name: 'Asian Paints', price: 3180, change: -0.2 },
  { id: 'GRASIM', name: 'Grasim', price: 2190, change: 0.2 },
  { id: 'ADANIPORTS', name: 'Adani Ports', price: 1240, change: 0.4 },
  { id: 'ADANIGREEN', name: 'Adani Green', price: 980, change: -0.3 },
  { id: 'ADANITRANS', name: 'Adani Energy', price: 920, change: 0.5 },
  { id: 'INDUSIND', name: 'IndusInd Bank', price: 1420, change: 0.1 },
  { id: 'BANDHAN', name: 'Bandhan Bank', price: 206, change: -0.2 },
  { id: 'ZOMATO', name: 'Zomato', price: 160, change: 0.8 },
  { id: 'NYKAA', name: 'FSN E-Com (Nykaa)', price: 175, change: -0.5 },
  { id: 'PAYTM', name: 'Paytm', price: 460, change: 0.6 },
  { id: 'DMART', name: 'Avenue Supermarts', price: 3920, change: 0.2 },
  { id: 'IRCTC', name: 'IRCTC', price: 910, change: 0.1 },
  { id: 'POLYCAB', name: 'Polycab', price: 5900, change: 0.4 },
  { id: 'TATACHEM', name: 'Tata Chemicals', price: 1120, change: -0.2 },
  { id: 'HAVELLS', name: 'Havells', price: 1550, change: 0.3 },
  { id: 'ABB', name: 'ABB India', price: 6400, change: 0.2 },
  { id: 'LTIM', name: 'LTIMindtree', price: 5450, change: 0.3 },
].map(s => ({...s, tf: makeTF(s.price)}));

// Build a synthetic Sensex-like index from large-cap constituents
export function sensexSeries(tf='1D', base=65000){
  const universe = stocks.filter(s => [
    'RELI','HDFCB','ICICI','SBIN','TCS','INFY','ITC','KOTAK','HCLTECH','LT','BHARTI','HINDUNIL','TATASTEEL','SUNPHARMA','NTPC','ONGC','POWERGRID','BAJAJ-AUTO','M_M','ASIANPAINT'
  ].includes(s.id));
  if(universe.length === 0) return Array.from({length:30}, (_,i)=> base);
  const arrs = universe.map(s => s.tf[tf]);
  const len = Math.min(...arrs.map(a => a.length));
  const series = [];
  for(let i=0;i<len;i++){
    let avgRel = 0;
    for(const a of arrs){ const start = a[a.length-len]; const val = a[a.length-len+i]; avgRel += (val/start) - 1; }
    avgRel /= arrs.length;
    series.push(Math.round(base * (1 + avgRel)));
  }
  return series;
}

export const funds = [
  { id: 'NIP-ELSS', name: 'Nippon India Tax Saver', nav: 145.3, oneY: 18.4 },
  { id: 'PARAG-FLEXI', name: 'Parag Parikh Flexi Cap', nav: 79.6, oneY: 21.1 },
  { id: 'MIRA-LARGE', name: 'Mirae Asset Large Cap', nav: 102.1, oneY: 16.9 },
  { id: 'AXIS-SML', name: 'Axis Small Cap', nav: 64.5, oneY: 28.6 },
  { id: 'HDFC-MID', name: 'HDFC Mid-Cap Opp.', nav: 132.7, oneY: 23.2 },
  { id: 'SBI-BLUE', name: 'SBI Bluechip', nav: 74.2, oneY: 15.8 },
  { id: 'ICICI-VAL', name: 'ICICI Pru Value Discovery', nav: 225.4, oneY: 19.5 },
  { id: 'UTI-NIFTY', name: 'UTI Nifty 50 Index', nav: 205.8, oneY: 17.2 },
  { id: 'KOTAK-EMERGE', name: 'Kotak Emerging Equity', nav: 84.6, oneY: 26.7 },
  { id: 'QUANT-SML', name: 'Quant Small Cap', nav: 120.3, oneY: 31.4 },
].map(f => ({...f, tf: makeTF(f.nav)}));

export function latestPriceTF(item, tf='1D'){
  const arr = item.tf[tf];
  return arr[arr.length-1];
}

export function rupee(n){
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n); } catch(e){ return `₹${Math.round(n).toLocaleString('en-IN')}`; }
}

export function pct(n){ return `${n>=0?'+':''}${n.toFixed(2)}%`; }

let SIM_TICK = 0;
export function randomWalkUpdate(item){
  SIM_TICK++;
  const step = (tf, every, vol) => {
    const arr = item.tf[tf];
    if(!arr || !arr.length) return;
    if(tf !== '1D' && (SIM_TICK % every) !== 0) return;
    const last = arr[arr.length-1];
    const change = (Math.random()-0.5) * vol;
    const next = Math.max(1, parseFloat((last * (1 + change/100)).toFixed(2)));
    arr.push(next);
    if(arr.length > 40) arr.shift();
  };
  step('1D', 1, 0.9);
  step('1W', 5, 0.25);
  step('1M', 15, 0.08);
  step('1Y', 60, 0.02);
  const d1 = item.tf['1D'];
  const next = d1[d1.length-1];
  item.price = next;
  const prev = d1[d1.length-2] ?? next;
  item.change = ((next - prev)/prev)*100;
}
