import { generateTips } from '../tips-engine.js';

export async function mount(container, db, navigate, showSheet, hideSheet) {
  const [profile, preferences, notes, dates] = await Promise.all([
    db.getProfile(),
    db.getPreferences(),
    db.getNotes(),
    db.getDates(),
  ]);

  const tips = generateTips({ profile, preferences, notes, dates });
  const name = profile?.name || 'her';

  function renderTip(tip) {
    return `
      <div class="tip-card full ${tip.type} ${tip.urgency >= 2 ? 'urgent' : ''}">
        <div class="tip-card-top">
          <span class="tip-icon">${tip.icon}</span>
          <span class="tip-title">${tip.title}</span>
        </div>
        <div class="tip-lines">
          ${tip.lines.map(l => `<p class="tip-line">${l}</p>`).join('')}
        </div>
      </div>
    `;
  }

  const urgentTips = tips.filter(t => t.urgency >= 2);
  const upcomingTips = tips.filter(t => t.type === 'date' && t.urgency < 2);
  const insightTips = tips.filter(t => t.type === 'insight');
  const factTips = tips.filter(t => t.type === 'fact');

  let html = '';

  if (!tips.length) {
    html = `
      <div class="tips-empty">
        <div class="tips-empty-icon">💡</div>
        <h3>No tips yet</h3>
        <p>Add ${name}'s profile, preferences, and important dates to start getting personalized suggestions.</p>
        <button class="btn-primary" id="go-profile">Set up profile</button>
      </div>
    `;
  } else {
    if (urgentTips.length) {
      html += `<h3 class="tips-section-title">🚨 Coming up soon</h3>`;
      html += urgentTips.map(renderTip).join('');
    }
    if (upcomingTips.length) {
      html += `<h3 class="tips-section-title">📅 On the horizon</h3>`;
      html += upcomingTips.map(renderTip).join('');
    }
    if (insightTips.length) {
      html += `<h3 class="tips-section-title">🔍 Insights</h3>`;
      html += insightTips.map(renderTip).join('');
    }
    if (factTips.length) {
      html += `<h3 class="tips-section-title">💬 Quick reminders</h3>`;
      html += factTips.map(renderTip).join('');
    }
    html += `
      <p class="tips-footer">Tips are generated from the preferences and dates you've saved — add more to get richer suggestions.</p>
    `;
  }

  container.innerHTML = `<div class="tips-page">${html}</div>`;
  container.querySelector('#go-profile')?.addEventListener('click', () => navigate('profile'));
}
