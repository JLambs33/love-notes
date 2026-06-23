export function daysUntil(dateStr, recurring = false) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let target = new Date(dateStr + 'T00:00:00');
  if (recurring) {
    const thisYear = new Date(today.getFullYear(), target.getMonth(), target.getDate());
    target = thisYear >= today ? thisYear : new Date(today.getFullYear() + 1, target.getMonth(), target.getDate());
  }
  return Math.round((target - today) / 86400000);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    acc[k] = acc[k] || [];
    acc[k].push(item);
    return acc;
  }, {});
}

const LOVE_LANGUAGE_BIRTHDAY = {
  'Words of Affirmation': 'Write her a heartfelt birthday letter — she values your words deeply.',
  'Acts of Service': 'Plan and handle everything for her birthday so she can just relax and enjoy.',
  'Receiving Gifts': 'Put extra thought into a personal, meaningful gift she will cherish.',
  'Quality Time': 'Plan a full day of her favorite activities — phones away.',
  'Physical Touch': 'Make physical connection a priority — greet her with a long hug and stay close.',
};

const LOVE_LANGUAGE_ANNIVERSARY = {
  'Words of Affirmation': 'Write about your favorite memories together and what she means to you.',
  'Acts of Service': 'Handle all the planning so she can be fully present in the moment.',
  'Receiving Gifts': 'A gift tied to a shared memory or inside joke will land especially well.',
  'Quality Time': 'A full day together doing things you both love — no distractions.',
  'Physical Touch': 'Physical closeness and affection will mean more than any gift.',
};

function dateSuggestions(date, { profile, preferences }) {
  const name = profile?.name || 'her';
  const loved = preferences.filter(p => p.sentiment === 'love');
  const lines = [];
  const isB = date.type === 'birthday' || date.title.toLowerCase().includes('birthday');
  const isA = date.type === 'anniversary' || date.title.toLowerCase().includes('anniversary');

  if (isB) {
    lines.push(`🎂 ${name}'s birthday is coming up — here are some ideas:`);
    const food = loved.filter(p => p.category === 'food').slice(0, 2);
    if (food.length) lines.push(`🍽️ Take her somewhere that serves ${food.map(f => f.item).join(' or ')}`);
    const activity = loved.filter(p => p.category === 'activities')[0];
    if (activity) lines.push(`🎯 Plan something around her love of ${activity.item}`);
    const place = loved.filter(p => p.category === 'places')[0];
    if (place) lines.push(`📍 She'd love something connected to ${place.item}`);
    const color = loved.filter(p => p.category === 'colors')[0];
    if (color) lines.push(`🎨 Keep ${color.item} in mind for gifts and wrapping`);
    if (profile?.loveLanguage && LOVE_LANGUAGE_BIRTHDAY[profile.loveLanguage]) {
      lines.push(`💝 Love language tip: ${LOVE_LANGUAGE_BIRTHDAY[profile.loveLanguage]}`);
    }
  } else if (isA) {
    lines.push(`💑 Your anniversary is coming up — make it special:`);
    const food = loved.filter(p => p.category === 'food')[0];
    if (food) lines.push(`🍽️ Book a special dinner — she loves ${food.item}`);
    const place = loved.filter(p => p.category === 'places')[0];
    if (place) lines.push(`📍 Something connected to ${place.item} could be perfect`);
    const activity = loved.filter(p => p.category === 'activities')[0];
    if (activity) lines.push(`🎯 Plan an activity around her love of ${activity.item}`);
    if (profile?.loveLanguage && LOVE_LANGUAGE_ANNIVERSARY[profile.loveLanguage]) {
      lines.push(`💝 Love language tip: ${LOVE_LANGUAGE_ANNIVERSARY[profile.loveLanguage]}`);
    }
  } else {
    lines.push(`📅 ${date.title} is coming up.`);
    if (date.notes) lines.push(date.notes);
  }

  return lines;
}

function randomFact(profile, preferences) {
  if (!preferences.length) return null;
  const name = profile?.name || 'her';
  const p = pick(preferences);
  const verb = p.sentiment === 'love' ? 'loves' : p.sentiment === 'hate' ? 'dislikes' : 'is neutral on';
  const body = `${name} ${verb} ${p.item}${p.notes ? ` — ${p.notes}` : ''}.`;
  return { type: 'fact', icon: '💬', title: 'Quick reminder', lines: [body], urgency: 0 };
}

function patterns(profile, preferences) {
  const name = profile?.name || 'her';
  const loved = preferences.filter(p => p.sentiment === 'love');
  if (loved.length < 3) return [];
  const byCategory = groupBy(loved, 'category');
  const LABELS = {
    food: 'food', drinks: 'drinks', entertainment: 'movies & TV', music: 'music',
    books: 'books', places: 'places', activities: 'activities', colors: 'colors',
    scents: 'scents', gifts: 'gifts',
  };
  return Object.entries(byCategory)
    .filter(([, items]) => items.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 2)
    .map(([cat, items]) => ({
      type: 'insight',
      icon: '🔍',
      title: 'Pattern detected',
      lines: [
        `${name} has ${items.length} favorites in ${LABELS[cat] || cat} — this is clearly important to her.`,
        `Top picks: ${items.slice(0, 3).map(i => i.item).join(', ')}`,
      ],
      urgency: 0,
    }));
}

export function generateTips({ profile, preferences, dates }) {
  const tips = [];

  // Upcoming date tips (sorted by urgency)
  const upcoming = dates
    .map(d => ({ ...d, days: daysUntil(d.date, d.recurring) }))
    .filter(d => d.days >= 0 && d.days <= 30)
    .sort((a, b) => a.days - b.days);

  for (const date of upcoming) {
    const urgency = date.days <= 3 ? 3 : date.days <= 7 ? 2 : date.days <= 14 ? 1 : 0;
    const label = date.days === 0 ? 'Today!' : date.days === 1 ? 'Tomorrow' : `In ${date.days} days`;
    tips.push({
      type: 'date',
      icon: date.days <= 7 ? '🚨' : '📅',
      title: `${date.title} — ${label}`,
      lines: dateSuggestions(date, { profile: profile || {}, preferences }),
      urgency,
      dateId: date.id,
    });
  }

  // Pattern insights
  const insightTips = patterns(profile || {}, preferences);
  tips.push(...insightTips);

  // Random fact (always last)
  const fact = randomFact(profile || {}, preferences);
  if (fact) tips.push(fact);

  return tips;
}
