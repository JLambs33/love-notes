import { getTheme, setTheme } from '../theme.js';

export async function mount(container, db, navigate, showSheet, hideSheet) {
  const [profile, preferences, notes, dates] = await Promise.all([
    db.getProfile(),
    db.getPreferences(),
    db.getNotes(),
    db.getDates(),
  ]);

  const theme = getTheme();

  container.innerHTML = `
    <div class="settings-page">
      <div class="settings-section">
        <h3 class="settings-section-title">Appearance</h3>
        <div class="settings-group">
          <div class="settings-row-static">
            <span class="settings-row-label">Theme</span>
            <div class="theme-toggle" id="theme-toggle">
              <button class="theme-btn ${theme === 'system' ? 'active' : ''}" data-val="system">System</button>
              <button class="theme-btn ${theme === 'light'  ? 'active' : ''}" data-val="light">Light</button>
              <button class="theme-btn ${theme === 'dark'   ? 'active' : ''}" data-val="dark">Dark</button>
            </div>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Data</h3>
        <div class="settings-group">
          <div class="settings-stat">
            <span>${profile ? '1' : '0'} profile</span>
            <span>${preferences.length} preferences</span>
            <span>${notes.length} notes</span>
            <span>${dates.length} dates</span>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Backup</h3>
        <div class="settings-group">
          <button class="settings-row-btn" id="export-btn">
            <div class="settings-row-info">
              <span class="settings-row-label">Export data</span>
              <span class="settings-row-desc">Download all data as a JSON file</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <button class="settings-row-btn" id="import-btn">
            <div class="settings-row-info">
              <span class="settings-row-label">Import data</span>
              <span class="settings-row-desc">Restore from a JSON backup file</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </button>
          <input type="file" id="import-file" accept=".json" class="hidden">
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">Danger zone</h3>
        <div class="settings-group">
          <button class="settings-row-btn danger" id="clear-btn">
            <div class="settings-row-info">
              <span class="settings-row-label">Clear all data</span>
              <span class="settings-row-desc">Permanently delete everything</span>
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="settings-section">
        <h3 class="settings-section-title">About</h3>
        <div class="settings-group">
          <div class="settings-about">
            <p>Love Notes — a private, local-first app for remembering everything about the one you love.</p>
            <p>All data is stored on this device only. No accounts. No cloud. No egress.</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Theme toggle
  container.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTheme(btn.dataset.val);
      container.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  });

  // Export
  container.querySelector('#export-btn').addEventListener('click', async () => {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `love-notes-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import
  container.querySelector('#import-btn').addEventListener('click', () => {
    container.querySelector('#import-file').click();
  });

  container.querySelector('#import-file').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    let data;
    try { data = JSON.parse(text); } catch {
      alert('Invalid JSON file.');
      return;
    }
    if (!confirm('This will replace all current data with the imported data. Continue?')) return;
    await db.importAll(data);
    alert('Import complete!');
    navigate('home');
  });

  // Clear
  container.querySelector('#clear-btn').addEventListener('click', async () => {
    if (!confirm('This will permanently delete all data. Are you sure?')) return;
    if (!confirm('Really? This cannot be undone.')) return;
    await db.clearAll();
    navigate('home');
  });
}
