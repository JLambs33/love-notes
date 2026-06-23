const CATEGORIES = [
  { id: 'food', label: 'Food', icon: '🍕', desc: 'Cuisines, dishes, restaurants' },
  { id: 'drinks', label: 'Drinks', icon: '☕', desc: 'Coffee order, wines, cocktails' },
  { id: 'entertainment', label: 'Movies & TV', icon: '🎬', desc: 'Films, shows, genres' },
  { id: 'music', label: 'Music', icon: '🎵', desc: 'Artists, songs, genres' },
  { id: 'books', label: 'Books', icon: '📚', desc: 'Books, authors, genres' },
  { id: 'places', label: 'Places', icon: '🌍', desc: 'Dream destinations, local favorites' },
  { id: 'activities', label: 'Activities', icon: '🎯', desc: 'Hobbies, sports, interests' },
  { id: 'colors', label: 'Colors', icon: '🎨', desc: 'Favorite and least favorite colors' },
  { id: 'scents', label: 'Scents', icon: '🌸', desc: 'Perfumes, candles, flowers' },
  { id: 'gifts', label: 'Gifts', icon: '🎁', desc: 'Loved gifts, wish list ideas' },
];

function esc(v) {
  return v ? String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') : '';
}

function sentimentLabel(s) {
  return s === 'love' ? '♥ Loves' : s === 'hate' ? '✕ Dislikes' : '· Neutral';
}

export async function mount(container, db, navigate, showSheet, hideSheet) {
  const allPrefs = await db.getPreferences();

  // Check if a subcategory is requested via hash
  const hash = location.hash.slice(1);
  const hashCat = hash.startsWith('categories/') ? hash.split('/')[1] : null;

  if (hashCat) {
    await mountCategory(container, db, navigate, showSheet, hideSheet, hashCat, allPrefs);
  } else {
    mountGrid(container, db, navigate, showSheet, hideSheet, allPrefs);
  }
}

function mountGrid(container, db, navigate, showSheet, hideSheet, allPrefs) {
  const counts = {};
  allPrefs.forEach(p => { counts[p.category] = (counts[p.category] || 0) + 1; });

  container.innerHTML = `
    <div class="cat-grid">
      ${CATEGORIES.map(cat => `
        <div class="cat-card" data-cat="${cat.id}">
          <div class="cat-icon">${cat.icon}</div>
          <div class="cat-info">
            <div class="cat-name">${cat.label}</div>
            <div class="cat-count">${counts[cat.id] || 0} items</div>
          </div>
          <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
      `).join('')}
    </div>
  `;

  container.querySelectorAll('.cat-card').forEach(card => {
    card.addEventListener('click', () => navigate(`categories/${card.dataset.cat}`));
  });
}

async function mountCategory(container, db, navigate, showSheet, hideSheet, catId, cachedPrefs) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat) { location.hash = 'categories'; return mountGrid(container, db, navigate, showSheet, hideSheet, cachedPrefs || []); }

  const prefs = await db.getPreferences(catId);
  const loves = prefs.filter(p => p.sentiment === 'love');
  const neutral = prefs.filter(p => p.sentiment === 'neutral');
  const hates = prefs.filter(p => p.sentiment === 'hate');
  const sorted = [...loves, ...neutral, ...hates];

  function renderList() {
    return sorted.length ? sorted.map(p => `
      <div class="pref-row" data-id="${p.id}">
        <span class="sentiment-badge ${p.sentiment}">${sentimentLabel(p.sentiment)}</span>
        <div class="pref-info">
          <span class="pref-item">${esc(p.item)}</span>
          ${p.notes ? `<span class="pref-notes">${esc(p.notes)}</span>` : ''}
        </div>
        <button class="icon-btn edit-pref-btn" data-id="${p.id}" aria-label="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
      </div>
    `).join('') : `<p class="empty-state">No ${cat.label.toLowerCase()} preferences yet.<br>Tap + to add one.</p>`;
  }

  container.innerHTML = `
    <div class="cat-detail">
      <button class="back-btn" id="back-to-cats">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        All categories
      </button>
      <div class="cat-header">
        <span class="cat-icon-lg">${cat.icon}</span>
        <div>
          <h2>${cat.label}</h2>
          <p class="text-secondary">${cat.desc}</p>
        </div>
      </div>
      <div id="pref-list">${renderList()}</div>
    </div>
    <button class="fab" id="add-pref-btn" aria-label="Add preference">+</button>
  `;

  container.querySelector('#back-to-cats').addEventListener('click', () => navigate('categories'));

  function openPrefSheet(pref = null) {
    const isEdit = !!pref;
    showSheet(`
      <div class="sheet-header">
        <h3>${isEdit ? 'Edit' : 'Add'} ${cat.label} preference</h3>
        <button class="icon-btn" data-close-sheet aria-label="Close">✕</button>
      </div>
      <div class="form-section">
        <label class="form-label">Item</label>
        <input class="form-input" id="pref-item" type="text" placeholder="e.g. Sushi" value="${esc(pref?.item)}" autofocus>
      </div>
      <div class="form-section">
        <label class="form-label">Sentiment</label>
        <div class="sentiment-toggle" id="sentiment-toggle">
          <button class="sentiment-btn ${!pref || pref.sentiment === 'love' ? 'active love' : ''}" data-val="love">♥ Loves</button>
          <button class="sentiment-btn ${pref?.sentiment === 'neutral' ? 'active neutral' : ''}" data-val="neutral">· Neutral</button>
          <button class="sentiment-btn ${pref?.sentiment === 'hate' ? 'active hate' : ''}" data-val="hate">✕ Dislikes</button>
        </div>
      </div>
      <div class="form-section">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="pref-notes" type="text" placeholder="Any context…" value="${esc(pref?.notes)}">
      </div>
      <div class="form-actions">
        ${isEdit ? `<button class="btn-danger" id="delete-pref-btn">Delete</button>` : ''}
        <button class="btn-primary" id="save-pref-btn">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    `);

    // Sentiment toggle
    let sentiment = pref?.sentiment || 'love';
    document.querySelectorAll('.sentiment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        sentiment = btn.dataset.val;
        document.querySelectorAll('.sentiment-btn').forEach(b => b.classList.remove('active', 'love', 'hate', 'neutral'));
        btn.classList.add('active', sentiment);
      });
    });

    document.getElementById('save-pref-btn').addEventListener('click', async () => {
      const item = document.getElementById('pref-item').value.trim();
      if (!item) return;
      const notes = document.getElementById('pref-notes').value.trim();
      if (isEdit) {
        await db.updatePreference(pref.id, { item, sentiment, notes, category: catId });
        const idx = sorted.findIndex(p => p.id === pref.id);
        if (idx >= 0) Object.assign(sorted[idx], { item, sentiment, notes });
      } else {
        const newPref = await db.addPreference({ item, sentiment, notes, category: catId });
        sorted.unshift(newPref);
      }
      hideSheet();
      document.getElementById('pref-list').innerHTML = renderList();
      wireEditBtns();
    });

    document.getElementById('delete-pref-btn')?.addEventListener('click', async () => {
      await db.deletePreference(pref.id);
      const idx = sorted.findIndex(p => p.id === pref.id);
      if (idx >= 0) sorted.splice(idx, 1);
      hideSheet();
      document.getElementById('pref-list').innerHTML = renderList();
      wireEditBtns();
    });
  }

  function wireEditBtns() {
    container.querySelectorAll('.edit-pref-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const pref = sorted.find(p => p.id === btn.dataset.id);
        if (pref) openPrefSheet(pref);
      });
    });
  }

  container.querySelector('#add-pref-btn').addEventListener('click', () => openPrefSheet());
  wireEditBtns();
}
