import * as db from './db.js';
import { initTheme } from './theme.js';

const main = document.getElementById('main');
const pageTitle = document.getElementById('page-title');
const overlay = document.getElementById('overlay');
const sheet = document.getElementById('sheet');
const sheetContent = document.getElementById('sheet-content');

// Sheet API
export function showSheet(html) {
  sheetContent.innerHTML = html;
  overlay.classList.remove('hidden');
  sheet.classList.remove('hidden');
  requestAnimationFrame(() => sheet.classList.add('open'));

  // Wire close targets
  sheetContent.querySelectorAll('[data-close-sheet]').forEach(el => {
    el.addEventListener('click', hideSheet);
  });
}

export function hideSheet() {
  sheet.classList.remove('open');
  setTimeout(() => {
    sheet.classList.add('hidden');
    overlay.classList.add('hidden');
    sheetContent.innerHTML = '';
  }, 300);
}

overlay.addEventListener('click', hideSheet);

// Router
const ROUTES = {
  home: () => import('./screens/home.js'),
  categories: () => import('./screens/categories.js'),
  notes: () => import('./screens/notes.js'),
  dates: () => import('./screens/dates.js'),
  tips: () => import('./screens/tips.js'),
  settings: () => import('./screens/settings.js'),
  profile: () => import('./screens/profile.js'),
};

const TITLES = {
  home: 'Love Notes',
  categories: 'Preferences',
  notes: 'Notes',
  dates: 'Dates',
  tips: 'Tips',
  settings: 'Settings',
  profile: 'Profile',
};

const NAV_ROUTES = new Set(['home', 'categories', 'notes', 'dates', 'tips']);

let currentRoute = null;

export async function navigate(route) {
  const [name] = route.split('/');
  if (!ROUTES[name]) return navigate('home');
  if (currentRoute === route) return;
  currentRoute = route;

  hideSheet();
  main.innerHTML = '<div class="loading">Loading…</div>';

  const mod = await ROUTES[name]();
  main.innerHTML = '';
  await mod.mount(main, db, navigate, showSheet, hideSheet);

  pageTitle.textContent = TITLES[name] || 'Love Notes';

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.route === name);
  });

  if (!NAV_ROUTES.has(name)) {
    location.hash = name;
  } else {
    location.hash = name;
  }
}

// Nav
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => navigate(btn.dataset.route));
});

document.getElementById('settings-btn').addEventListener('click', () => navigate('settings'));

// Handle back/forward
window.addEventListener('hashchange', () => {
  const hash = location.hash.slice(1) || 'home';
  if (hash !== currentRoute) navigate(hash);
});

// Boot
async function boot() {
  initTheme();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
  const hash = location.hash.slice(1) || 'home';
  await navigate(hash);
}

boot();
