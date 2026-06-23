function esc(v) {
  return v ? String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') : '';
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function search(notes, q) {
  if (!q) return notes;
  const lq = q.toLowerCase();
  return notes.filter(n =>
    n.content.toLowerCase().includes(lq) ||
    (n.tags || []).some(t => t.toLowerCase().includes(lq))
  );
}

export async function mount(container, db, navigate, showSheet, hideSheet) {
  let notes = await db.getNotes();
  let filtered = notes;

  function renderList() {
    if (!filtered.length) {
      return '<p class="empty-state">No notes yet.<br>Tap + to add your first note.</p>';
    }
    return filtered.map(n => `
      <div class="note-card" data-id="${n.id}">
        <p class="note-content">${esc(n.content.slice(0, 200))}${n.content.length > 200 ? '…' : ''}</p>
        <div class="note-meta">
          <span class="note-date">${formatDate(n.updatedAt || n.createdAt)}</span>
          ${(n.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  container.innerHTML = `
    <div class="search-bar-wrap">
      <div class="search-bar">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="search" id="notes-search" placeholder="Search notes…" autocomplete="off">
      </div>
    </div>
    <div id="notes-list">${renderList()}</div>
    <button class="fab" id="add-note-btn" aria-label="Add note">+</button>
  `;

  // Search
  let debounce;
  container.querySelector('#notes-search').addEventListener('input', e => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      filtered = search(notes, e.target.value.trim());
      container.querySelector('#notes-list').innerHTML = renderList();
      wireCards();
    }, 200);
  });

  function openNoteSheet(note = null) {
    const isEdit = !!note;
    showSheet(`
      <div class="sheet-header">
        <h3>${isEdit ? 'Edit note' : 'New note'}</h3>
        <button class="icon-btn" data-close-sheet aria-label="Close">✕</button>
      </div>
      <div class="form-section">
        <textarea class="form-input form-textarea tall" id="note-content" placeholder="What do you want to remember…" autofocus>${esc(note?.content)}</textarea>
      </div>
      <div class="form-section">
        <label class="form-label">Tags (comma-separated)</label>
        <input class="form-input" id="note-tags" type="text" placeholder="food, birthday, important" value="${esc((note?.tags || []).join(', '))}">
      </div>
      <div class="form-actions">
        ${isEdit ? `<button class="btn-danger" id="delete-note-btn">Delete</button>` : ''}
        <button class="btn-primary" id="save-note-btn">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    `);

    document.getElementById('save-note-btn').addEventListener('click', async () => {
      const content = document.getElementById('note-content').value.trim();
      if (!content) return;
      const rawTags = document.getElementById('note-tags').value;
      const tags = rawTags.split(',').map(t => t.trim()).filter(Boolean);

      if (isEdit) {
        await db.updateNote(note.id, { content, tags });
        const idx = notes.findIndex(n => n.id === note.id);
        if (idx >= 0) Object.assign(notes[idx], { content, tags, updatedAt: Date.now() });
      } else {
        const newNote = await db.addNote({ content, tags });
        notes.unshift(newNote);
      }
      filtered = search(notes, container.querySelector('#notes-search').value.trim());
      hideSheet();
      container.querySelector('#notes-list').innerHTML = renderList();
      wireCards();
    });

    document.getElementById('delete-note-btn')?.addEventListener('click', async () => {
      await db.deleteNote(note.id);
      notes = notes.filter(n => n.id !== note.id);
      filtered = search(notes, container.querySelector('#notes-search').value.trim());
      hideSheet();
      container.querySelector('#notes-list').innerHTML = renderList();
      wireCards();
    });
  }

  function wireCards() {
    container.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const note = filtered.find(n => n.id === card.dataset.id);
        if (note) openNoteSheet(note);
      });
    });
  }

  container.querySelector('#add-note-btn').addEventListener('click', () => openNoteSheet());
  wireCards();
}
