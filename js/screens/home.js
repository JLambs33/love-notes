import { generateTips, daysUntil } from '../tips-engine.js';

function search(items, query, keys) {
  if (!query) return items;
  const q = query.toLowerCase();
  return items
    .map(item => ({
      item,
      score: keys.reduce((s, k) => {
        const v = (item[k] || '').toLowerCase();
        if (v === q) return s + 10;
        if (v.startsWith(q)) return s + 5;
        if (v.includes(q)) return s + 2;
        return s;
      }, 0),
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.item);
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function mount(container, db, navigate, showSheet, hideSheet) {
  const [profile, preferences, notes, dates] = await Promise.all([
    db.getProfile(),
    db.getPreferences(),
    db.getNotes(),
    db.getDates(),
  ]);

  const name = profile?.name || null;
  const tips = generateTips({ profile, preferences, dates });
  const urgentTip = tips.find(t => t.urgency >= 1) || tips[0];

  const upcoming = dates
    .map(d => ({ ...d, days: daysUntil(d.date, d.recurring) }))
    .filter(d => d.days >= 0 && d.days <= 30)
    .sort((a, b) => a.days - b.days)
    .slice(0, 3);

  container.innerHTML = `
    <div class="home">
      ${name ? `
        <div class="home-greeting">
          <h2>Everything about ${name}</h2>
          <button class="link-btn" id="edit-profile-btn">Edit profile</button>
        </div>
      ` : `
        <div class="card onboarding">
          <p class="onboarding-label">Get started</p>
          <h3>Who are you in love with?</h3>
          <p class="text-secondary">Set up your partner's profile to unlock personalized tips.</p>
          <button class="btn-primary" id="setup-profile-btn">Set up profile</button>
        </div>
      `}

      <div class="search-bar-wrap">
        <div class="search-bar">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="search" id="global-search" placeholder="Search everything…" autocomplete="off">
        </div>
      </div>

      <div id="search-results" class="hidden"></div>

      ${upcoming.length ? `
        <section class="home-section">
          <h3 class="section-title">Upcoming</h3>
          ${upcoming.map(d => `
            <div class="date-row clickable" data-dateid="${d.id}">
              <span class="date-label">${d.title}</span>
              <span class="date-countdown ${d.days <= 7 ? 'urgent' : ''}">${d.days === 0 ? 'Today!' : d.days === 1 ? 'Tomorrow' : `${d.days} days`}</span>
            </div>
          `).join('')}
        </section>
      ` : ''}

      ${urgentTip ? `
        <section class="home-section">
          <h3 class="section-title">Today's tip</h3>
          <div class="tip-card ${urgentTip.type}">
            <div class="tip-icon">${urgentTip.icon}</div>
            <div class="tip-body">
              <div class="tip-title">${urgentTip.title}</div>
              ${urgentTip.lines.map(l => `<p class="tip-line">${l}</p>`).join('')}
            </div>
          </div>
        </section>
      ` : ''}

      <section class="home-section">
        <h3 class="section-title">Quick stats</h3>
        <div class="stats-row">
          <div class="stat-card clickable" data-route="preferences">
            <div class="stat-num">${preferences.filter(p => p.sentiment === 'love').length}</div>
            <div class="stat-label">Loves</div>
          </div>
          <div class="stat-card clickable" data-route="preferences">
            <div class="stat-num">${preferences.filter(p => p.sentiment === 'hate').length}</div>
            <div class="stat-label">Dislikes</div>
          </div>
          <div class="stat-card clickable" data-route="notes">
            <div class="stat-num">${notes.length}</div>
            <div class="stat-label">Notes</div>
          </div>
          <div class="stat-card clickable" data-route="dates">
            <div class="stat-num">${dates.length}</div>
            <div class="stat-label">Dates</div>
          </div>
        </div>
      </section>
    </div>
  `;

  // Profile links
  container.querySelector('#edit-profile-btn')?.addEventListener('click', () => navigate('profile'));
  container.querySelector('#setup-profile-btn')?.addEventListener('click', () => navigate('profile'));

  // Stat cards
  container.querySelectorAll('[data-route]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.route));
  });

  // Upcoming dates
  container.querySelectorAll('[data-dateid]').forEach(el => {
    el.addEventListener('click', () => navigate('dates'));
  });

  // Global search
  const searchInput = container.querySelector('#global-search');
  const resultsEl = container.querySelector('#search-results');
  let debounce;

  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = searchInput.value.trim();
    if (!q) {
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
      return;
    }
    debounce = setTimeout(() => {
      const prefResults = search(preferences, q, ['item', 'notes', 'category']);
      const noteResults = search(notes, q, ['content', 'tags']);
      const dateResults = search(dates, q, ['title', 'notes']);

      if (!prefResults.length && !noteResults.length && !dateResults.length) {
        resultsEl.innerHTML = '<p class="empty-search">No results found.</p>';
        resultsEl.classList.remove('hidden');
        return;
      }

      let html = '';
      if (prefResults.length) {
        html += `<p class="results-label">Preferences</p>`;
        html += prefResults.slice(0, 5).map(p => `
          <div class="result-row">
            <span class="sentiment-dot ${p.sentiment}"></span>
            <span>${p.item}</span>
            <span class="result-cat">${p.category}</span>
          </div>
        `).join('');
      }
      if (noteResults.length) {
        html += `<p class="results-label">Notes</p>`;
        html += noteResults.slice(0, 3).map(n => `
          <div class="result-row note-result" data-noteid="${n.id}">
            <span class="result-excerpt">${n.content.slice(0, 80)}${n.content.length > 80 ? '…' : ''}</span>
          </div>
        `).join('');
      }
      if (dateResults.length) {
        html += `<p class="results-label">Dates</p>`;
        html += dateResults.slice(0, 3).map(d => `
          <div class="result-row">
            <span>${d.title}</span>
            <span class="result-cat">${d.date}</span>
          </div>
        `).join('');
      }

      resultsEl.innerHTML = html;
      resultsEl.classList.remove('hidden');
    }, 200);
  });
}
