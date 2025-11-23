const defaultGoals = {
  calories: 2000,
  protein: 130,
  carbs: 210,
  fats: 70,
  water: 2500,
};

const storageKeys = {
  entries: 'diet-tracker-entries',
  goals: 'diet-tracker-goals',
};

const entryForm = document.getElementById('entryForm');
const goalsForm = document.getElementById('goalsForm');
const summaryEl = document.getElementById('summary');
const historyEl = document.getElementById('history');
const entryTable = document.getElementById('entryTable');
const filterDate = document.getElementById('filterDate');
const clearDayButton = document.getElementById('clearDay');
const heroSummary = document.getElementById('heroSummary');
const focusLog = document.getElementById('focusLog');
const focusGoals = document.getElementById('focusGoals');
const goalsSection = document.getElementById('goalsSection');

let state = {
  entries: load(storageKeys.entries) || [],
  goals: load(storageKeys.goals) || defaultGoals,
};

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Could not read data from local storage', error);
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Could not save data to local storage', error);
  }
}

function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function init() {
  filterDate.value = todayISO();
  populateGoalsForm();
  render();
}

function populateGoalsForm() {
  Object.entries(state.goals).forEach(([key, value]) => {
    const field = goalsForm.elements.namedItem(key);
    if (field) {
      field.value = value;
    }
  });
}

function handleGoalSubmit(event) {
  event.preventDefault();
  const formData = new FormData(goalsForm);
  const newGoals = Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [key, Number(value) || 0])
  );
  state = { ...state, goals: newGoals };
  save(storageKeys.goals, newGoals);
  render();
}

function handleEntrySubmit(event) {
  event.preventDefault();
  const formData = new FormData(entryForm);
  const entry = {
    id: crypto.randomUUID(),
    date: filterDate.value || todayISO(),
    name: formData.get('name').trim(),
    calories: Number(formData.get('calories')) || 0,
    protein: Number(formData.get('protein')) || 0,
    carbs: Number(formData.get('carbs')) || 0,
    fats: Number(formData.get('fats')) || 0,
    water: Number(formData.get('water')) || 0,
    notes: formData.get('notes').trim(),
  };
  state = { ...state, entries: [...state.entries, entry] };
  save(storageKeys.entries, state.entries);
  entryForm.reset();
  render();
}

function deleteEntry(id) {
  state = { ...state, entries: state.entries.filter((entry) => entry.id !== id) };
  save(storageKeys.entries, state.entries);
  render();
}

function clearDay() {
  const date = filterDate.value;
  if (!date) return;
  state = {
    ...state,
    entries: state.entries.filter((entry) => entry.date !== date),
  };
  save(storageKeys.entries, state.entries);
  render();
}

function groupEntriesByDate(entries) {
  return entries.reduce((acc, entry) => {
    acc[entry.date] = acc[entry.date] || [];
    acc[entry.date].push(entry);
    return acc;
  }, {});
}

function calculateTotals(entries) {
  return entries.reduce(
    (totals, entry) => ({
      calories: totals.calories + entry.calories,
      protein: totals.protein + entry.protein,
      carbs: totals.carbs + entry.carbs,
      fats: totals.fats + entry.fats,
      water: totals.water + entry.water,
    }),
    { calories: 0, protein: 0, carbs: 0, fats: 0, water: 0 }
  );
}

function percent(part, total) {
  if (!total) return 0;
  return Math.min(999, Math.round((part / total) * 100));
}

function renderSummaryCards(totals) {
  const goal = state.goals;
  const cards = [
    {
      title: 'Calories',
      value: `${totals.calories.toFixed(0)} / ${goal.calories} kcal`,
      pct: percent(totals.calories, goal.calories),
    },
    {
      title: 'Protein',
      value: `${totals.protein.toFixed(0)} g`,
      pct: percent(totals.protein, goal.protein),
    },
    {
      title: 'Carbs',
      value: `${totals.carbs.toFixed(0)} g`,
      pct: percent(totals.carbs, goal.carbs),
    },
    {
      title: 'Fats',
      value: `${totals.fats.toFixed(0)} g`,
      pct: percent(totals.fats, goal.fats),
    },
    {
      title: 'Hydration',
      value: `${totals.water.toFixed(0)} / ${goal.water} ml`,
      pct: percent(totals.water, goal.water),
    },
  ];

  summaryEl.innerHTML = cards
    .map(
      (card) => `
      <div class="tile">
        <h3>${card.title}</h3>
        <div class="value">${card.value}</div>
        <div class="progress"><div class="progress-bar" style="width:${card.pct}%"></div></div>
      </div>`
    )
    .join('');
}

function renderHeroSummary() {
  const cards = [
    { label: 'Calories', value: `${state.goals.calories} kcal` },
    { label: 'Protein', value: `${state.goals.protein} g` },
    { label: 'Carbs', value: `${state.goals.carbs} g` },
    { label: 'Fats', value: `${state.goals.fats} g` },
  ];
  heroSummary.innerHTML = cards
    .map(
      (card) => `
        <div class="tile">
          <p class="muted">${card.label}</p>
          <div class="value">${card.value}</div>
        </div>`
    )
    .join('');
}

function renderTable(entries) {
  if (!entries.length) {
    entryTable.innerHTML = `<tr><td colspan="8" class="empty">No entries yet for this day.</td></tr>`;
    return;
  }
  entryTable.innerHTML = entries
    .map(
      (entry) => `
      <tr>
        <td><strong>${entry.name}</strong><br><span class="muted tiny">${entry.date}</span></td>
        <td>${entry.calories.toFixed(0)}</td>
        <td>${entry.protein.toFixed(1)} g</td>
        <td>${entry.carbs.toFixed(1)} g</td>
        <td>${entry.fats.toFixed(1)} g</td>
        <td>${entry.water ? `${entry.water.toFixed(0)} ml` : '—'}</td>
        <td>${entry.notes || ''}</td>
        <td><button class="ghost" aria-label="Delete" onclick="deleteEntry('${entry.id}')">✕</button></td>
      </tr>`
    )
    .join('');
}

function renderHistory() {
  const grouped = groupEntriesByDate(state.entries);
  const dates = Object.keys(grouped)
    .sort((a, b) => new Date(b) - new Date(a))
    .slice(0, 7);

  if (!dates.length) {
    historyEl.innerHTML = '<p class="empty">Add a few meals to see your weekly overview.</p>';
    return;
  }

  historyEl.innerHTML = dates
    .map((date) => {
      const totals = calculateTotals(grouped[date]);
      return `
        <div class="history-card">
          <h4>${new Date(date).toLocaleDateString()}</h4>
          <p class="muted">${totals.calories.toFixed(0)} kcal • ${totals.protein.toFixed(0)}g protein</p>
          <div class="progress" aria-hidden="true"><div class="progress-bar" style="width:${percent(
            totals.calories,
            state.goals.calories
          )}%"></div></div>
        </div>`;
    })
    .join('');
}

function render() {
  const entriesForDay = state.entries.filter((entry) => entry.date === filterDate.value);
  const totals = calculateTotals(entriesForDay);
  renderSummaryCards(totals);
  renderHeroSummary();
  renderTable(entriesForDay);
  renderHistory();
}

function attachListeners() {
  goalsForm.addEventListener('submit', handleGoalSubmit);
  entryForm.addEventListener('submit', handleEntrySubmit);
  filterDate.addEventListener('change', render);
  clearDayButton.addEventListener('click', clearDay);
  focusLog.addEventListener('click', () => entryForm.scrollIntoView({ behavior: 'smooth' }));
  focusGoals.addEventListener('click', () => goalsSection.scrollIntoView({ behavior: 'smooth' }));
}

attachListeners();
init();
