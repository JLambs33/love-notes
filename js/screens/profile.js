const LOVE_LANGUAGES = [
  'Words of Affirmation',
  'Acts of Service',
  'Receiving Gifts',
  'Quality Time',
  'Physical Touch',
];

export async function mount(container, db, navigate, showSheet, hideSheet) {
  const profile = await db.getProfile() || {};

  function render() {
    container.innerHTML = `
      <form id="profile-form" class="form-page">
        <div class="form-section">
          <label class="form-label">Name</label>
          <input class="form-input" name="name" type="text" placeholder="Her name" value="${esc(profile.name)}">
        </div>
        <div class="form-section">
          <label class="form-label">Nickname</label>
          <input class="form-input" name="nickname" type="text" placeholder="What you call her" value="${esc(profile.nickname)}">
        </div>
        <div class="form-section">
          <label class="form-label">Birthday</label>
          <input class="form-input" name="birthday" type="date" value="${esc(profile.birthday)}">
        </div>
        <div class="form-section">
          <label class="form-label">Anniversary</label>
          <input class="form-input" name="anniversary" type="date" value="${esc(profile.anniversary)}">
        </div>
        <div class="form-section">
          <label class="form-label">First date</label>
          <input class="form-input" name="firstDate" type="date" value="${esc(profile.firstDate)}">
        </div>
        <div class="form-section">
          <label class="form-label">Love language</label>
          <select class="form-input form-select" name="loveLanguage">
            <option value="">Not sure yet</option>
            ${LOVE_LANGUAGES.map(l => `<option value="${l}" ${profile.loveLanguage === l ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div class="form-section">
          <label class="form-label">How you met</label>
          <textarea class="form-input form-textarea" name="howWeMet" placeholder="The story…">${esc(profile.howWeMet)}</textarea>
        </div>
        <div class="form-section">
          <label class="form-label">General notes</label>
          <textarea class="form-input form-textarea tall" name="profileNotes" placeholder="Anything else worth remembering…">${esc(profile.profileNotes)}</textarea>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn-primary">Save profile</button>
        </div>
      </form>
    `;

    container.querySelector('#profile-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      await db.saveProfile(data);
      await syncProfileDates(db, data);
      navigate('home');
    });
  }

  render();
}

function esc(v) {
  return v ? String(v).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;') : '';
}

const PROFILE_DATE_SOURCES = {
  birthday:    { source: 'profile-birthday',    type: 'birthday',    title: name => `${name || 'Her'} birthday` },
  anniversary: { source: 'profile-anniversary', type: 'anniversary', title: name => 'Anniversary' },
};

async function syncProfileDates(db, profile) {
  const allDates = await db.getDates();

  for (const [field, meta] of Object.entries(PROFILE_DATE_SOURCES)) {
    const dateVal = profile[field];
    const existing = allDates.find(d => d.source === meta.source);

    if (dateVal) {
      const payload = {
        title: meta.title(profile.name),
        type: meta.type,
        date: dateVal,
        recurring: true,
        leadTimeDays: 14,
        source: meta.source,
      };
      if (existing) {
        await db.updateDate(existing.id, payload);
      } else {
        await db.addDate(payload);
      }
    } else if (existing) {
      await db.deleteDate(existing.id);
    }
  }
}
