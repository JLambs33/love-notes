import { daysUntil } from '../tips-engine.js';

const DATE_TYPES = ['birthday', 'anniversary', 'first-date', 'family', 'other'];
const DATE_TYPE_LABELS = {
  'birthday': '🎂 Birthday',
  'anniversary': '💑 Anniversary',
  'first-date': '💕 First Date',
  'family': '👨‍👩‍👧 Family',
  'other': '📅 Other',
};

function esc(v) {
  return v ? String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') : '';
}

function formatFullDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export async function mount(container, db, navigate, showSheet, hideSheet) {
  let dates = await db.getDates();

  function enriched() {
    return dates
      .map(d => ({ ...d, days: daysUntil(d.date, d.recurring) }))
      .sort((a, b) => {
        const da = a.days >= 0 ? a.days : 9999 + Math.abs(a.days);
        const db2 = b.days >= 0 ? b.days : 9999 + Math.abs(b.days);
        return da - db2;
      });
  }

  function renderList() {
    const sorted = enriched();
    if (!sorted.length) {
      return '<p class="empty-state">No dates saved yet.<br>Tap + to add a birthday, anniversary, or any important date.</p>';
    }
    return sorted.map(d => {
      const upcoming = d.days >= 0 && d.days <= 30;
      const past = d.days < 0;
      const countdownText = d.days === 0 ? 'Today!' :
        d.days === 1 ? 'Tomorrow' :
        d.days > 0 ? `In ${d.days} days` :
        `${Math.abs(d.days)} days ago`;
      return `
        <div class="date-item ${upcoming ? 'upcoming' : ''}" data-id="${d.id}">
          <div class="date-item-left">
            <div class="date-type-label">${DATE_TYPE_LABELS[d.type] || DATE_TYPE_LABELS.other}</div>
            <div class="date-title">${esc(d.title)}</div>
            <div class="date-full">${formatFullDate(d.date)}${d.recurring ? ' · repeats yearly' : ''}</div>
            ${d.notes ? `<div class="date-notes">${esc(d.notes)}</div>` : ''}
          </div>
          <div class="date-item-right">
            <span class="date-countdown-badge ${d.days >= 0 && d.days <= 7 ? 'urgent' : d.days >= 0 ? 'soon' : 'past'}">${countdownText}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div id="dates-list">${renderList()}</div>
    <button class="fab" id="add-date-btn" aria-label="Add date">+</button>
  `;

  function openDateSheet(date = null) {
    const isEdit = !!date;
    showSheet(`
      <div class="sheet-header">
        <h3>${isEdit ? 'Edit date' : 'Add date'}</h3>
        <button class="icon-btn" data-close-sheet aria-label="Close">✕</button>
      </div>
      <div class="form-section">
        <label class="form-label">Title</label>
        <input class="form-input" id="date-title" type="text" placeholder="e.g. Her birthday" value="${esc(date?.title)}" autofocus>
      </div>
      <div class="form-section">
        <label class="form-label">Type</label>
        <select class="form-input form-select" id="date-type">
          ${DATE_TYPES.map(t => `<option value="${t}" ${date?.type === t ? 'selected' : ''}>${DATE_TYPE_LABELS[t]}</option>`).join('')}
        </select>
      </div>
      <div class="form-section">
        <label class="form-label">Date</label>
        <input class="form-input" id="date-date" type="date" value="${esc(date?.date)}">
      </div>
      <div class="form-section form-row">
        <label class="form-label">Repeats yearly</label>
        <label class="toggle">
          <input type="checkbox" id="date-recurring" ${date?.recurring !== false ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="form-section">
        <label class="form-label">Remind me (days before)</label>
        <input class="form-input" id="date-lead" type="number" min="0" max="90" value="${date?.leadTimeDays ?? 14}">
      </div>
      <div class="form-section">
        <label class="form-label">Notes (optional)</label>
        <input class="form-input" id="date-notes" type="text" placeholder="Any context…" value="${esc(date?.notes)}">
      </div>
      <div class="form-actions">
        ${isEdit ? `<button class="btn-danger" id="delete-date-btn">Delete</button>` : ''}
        <button class="btn-primary" id="save-date-btn">${isEdit ? 'Save' : 'Add'}</button>
      </div>
    `);

    document.getElementById('save-date-btn').addEventListener('click', async () => {
      const title = document.getElementById('date-title').value.trim();
      const dateVal = document.getElementById('date-date').value;
      if (!title || !dateVal) return;

      const payload = {
        title,
        type: document.getElementById('date-type').value,
        date: dateVal,
        recurring: document.getElementById('date-recurring').checked,
        leadTimeDays: parseInt(document.getElementById('date-lead').value) || 14,
        notes: document.getElementById('date-notes').value.trim(),
      };

      if (isEdit) {
        await db.updateDate(date.id, payload);
        const idx = dates.findIndex(d => d.id === date.id);
        if (idx >= 0) Object.assign(dates[idx], payload);
      } else {
        const newDate = await db.addDate(payload);
        dates.push(newDate);
      }
      hideSheet();
      container.querySelector('#dates-list').innerHTML = renderList();
      wireItems();
    });

    document.getElementById('delete-date-btn')?.addEventListener('click', async () => {
      await db.deleteDate(date.id);
      dates = dates.filter(d => d.id !== date.id);
      hideSheet();
      container.querySelector('#dates-list').innerHTML = renderList();
      wireItems();
    });
  }

  function wireItems() {
    container.querySelectorAll('.date-item').forEach(item => {
      item.addEventListener('click', () => {
        const date = dates.find(d => d.id === item.dataset.id);
        if (date) openDateSheet(date);
      });
    });
  }

  container.querySelector('#add-date-btn').addEventListener('click', () => openDateSheet());
  wireItems();
}
