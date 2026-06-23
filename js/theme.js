const KEY = 'ln-theme';

export function getTheme() {
  return localStorage.getItem(KEY) || 'system';
}

export function setTheme(mode) {
  if (mode === 'system') {
    localStorage.removeItem(KEY);
    document.documentElement.removeAttribute('data-theme');
  } else {
    localStorage.setItem(KEY, mode);
    document.documentElement.setAttribute('data-theme', mode);
  }
}

export function initTheme() {
  const saved = localStorage.getItem(KEY);
  if (saved) document.documentElement.setAttribute('data-theme', saved);
}
