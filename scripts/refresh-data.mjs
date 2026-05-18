// scripts/refresh-data.mjs
// Fetches current data from Supabase and bakes it into index.html
// so new visitors see actual content instantly (no JS fetch needed).

import { readFile, writeFile } from 'node:fs/promises';

const SUPABASE_URL = 'https://vgwdudjgvkmlnnfgonbk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnd2R1ZGpndmttbG5uZmdvbmJrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NjI2NDksImV4cCI6MjA5NDUzODY0OX0.I_ciFmhRcv2RdXZFaedlMki8c96zTvXkUyJxSVACbr4';

const TABLES = [
  'queue_items',
  'portfolio_categories',
  'portfolio_images',
  'prices',
  'calc_options',
  'debts',
  'links',
];

async function fetchTable(table) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&order=sort_order.asc`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) {
    console.warn(`[${table}] failed:`, res.status);
    return [];
  }
  return await res.json();
}

async function fetchSettings() {
  const url = `${SUPABASE_URL}/rest/v1/settings?select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return {};
  const rows = await res.json();
  const out = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

async function main() {
  console.log('Fetching data from Supabase...');
  const data = {};
  for (const t of TABLES) {
    data[t] = await fetchTable(t);
    console.log(`  ${t}: ${data[t].length} rows`);
  }
  const settings = await fetchSettings();
  console.log(`  settings: ${Object.keys(settings).length} keys`);

  const snapshot = `<script>window.__INITIAL_DATA = ${JSON.stringify(data)};window.__INITIAL_SETTINGS = ${JSON.stringify(settings)};</script>`;

  console.log('Reading index.html...');
  let html = await readFile('index.html', 'utf-8');

  // Replace existing snapshot or inject before closing </head>
  const re = /<script>window\.__INITIAL_DATA[\s\S]*?<\/script>/;
  if (re.test(html)) {
    html = html.replace(re, snapshot);
  } else {
    html = html.replace('</head>', snapshot + '</head>');
  }

  await writeFile('index.html', html);
  console.log('✓ index.html updated with fresh snapshot');
}

main().catch(err => { console.error(err); process.exit(1); });
