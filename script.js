const STORAGE_KEY = 'touch-fish-wellness';
let state = loadState();
let chart;

const weightForm = document.getElementById('weight-form');
const calorieForm = document.getElementById('calorie-form');
const waterForm = document.getElementById('water-form');
const quickAddBtn = document.getElementById('quick-add');
const scrollToFormsBtn = document.getElementById('scroll-to-forms');
const rangeButtons = document.querySelectorAll('.chip');

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
const baseState = stored ? JSON.parse(stored) : { weights: [], calories: [], water: [] };
  return migrateState(baseState);
}

function migrateState(data) {
  const migrated = { weights: data.weights || [], water: data.water || [] };
  migrated.calories = (data.calories || []).map((entry) => {
    if (entry.items) {
      const items = entry.items.map((item) => ({
        name: item.name || item.label || 'Entry',
        calories: Number(item.calories ?? item.value ?? 0),
      }));
      const total = entry.total ?? items.reduce((sum, item) => sum + item.calories, 0);
      return { date: entry.date, items, total };
    }
    return {
      date: entry.date,
      items: [{ name: entry.label || 'Entry', calories: Number(entry.value || 0) }],
      total: Number(entry.value || 0),
    };
  });
  return migrated;
  if (stored) return JSON.parse(stored);
  return { weights: [], calories: [], water: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00');
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addEntry(type, entry) {
  state[type] = state[type].filter((item) => item.date !== entry.date).concat(entry);
  state[type].sort((a, b) => formatDate(a.date) - formatDate(b.date));
  saveState();
}

function addCalorieItem(date, name, calories) {
  const existing = state.calories.find((entry) => entry.date === date);
  const item = { name: name || 'Entry', calories: Number(calories) };
  if (existing) {
    existing.items.push(item);
    existing.total = existing.items.reduce((sum, food) => sum + food.calories, 0);
  } else {
    state.calories.push({ date, items: [item], total: item.calories });
  }
  state.calories.sort((a, b) => formatDate(a.date) - formatDate(b.date));
  saveState();
}

function summarizeChange(entries) {
  if (entries.length < 2) return 'Add more data to see change';
  const latest = entries[entries.length - 1].value;
  const previous = entries[entries.length - 2].value;
  const diff = latest - previous;
  const direction = diff === 0 ? 'No change from last entry' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} lb since last entry`;
  const direction = diff === 0 ? 'No change from last entry' : `${diff > 0 ? '+' : ''}${diff.toFixed(1)} kg since last entry`;
  return direction;
}

function setDefaultDates() {
  ['weight-date', 'calorie-date', 'water-date'].forEach((id) => {
    const input = document.getElementById(id);
    input.value = todayISO();
  });
}

function getCalorieTotal(entry) {
  return entry.total ?? entry.value ?? 0;
}

function hydrateStats() {
  const latestWeight = state.weights[state.weights.length - 1];
  document.getElementById('latest-weight').textContent = latestWeight ? `${latestWeight.value.toFixed(1)} lb` : '--';
function hydrateStats() {
  const latestWeight = state.weights[state.weights.length - 1];
  document.getElementById('latest-weight').textContent = latestWeight ? `${latestWeight.value.toFixed(1)} kg` : '--';
  document.getElementById('weight-change').textContent = summarizeChange(state.weights);

  const today = todayISO();
  const todayCalories = state.calories.find((c) => c.date === today);
const todayCalorieTotal = todayCalories ? getCalorieTotal(todayCalories) : 0;
  document.getElementById('today-calories').textContent = `${todayCalorieTotal} kcal`;
  document.getElementById('today-calories').textContent = `${todayCalories?.value || 0} kcal`;

  const todayWater = state.water.find((w) => w.date === today);
  document.getElementById('today-water').textContent = `${todayWater?.value || 0} L`;
}

function renderWeightList() {
  const list = document.getElementById('weight-list');
  list.innerHTML = '';
  const items = [...state.weights].slice(-8).reverse();
  items.forEach((entry) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${entry.date}</span><strong>${entry.value.toFixed(1)} lb</strong>`;
    li.innerHTML = `<span>${entry.date}</span><strong>${entry.value.toFixed(1)} kg</strong>`;
    list.appendChild(li);
  });
}

function renderWeightHighlights() {
  const container = document.getElementById('weight-highlights');
  container.innerHTML = '';
  const entries = state.weights;
  if (!entries.length) return;

  const min = entries.reduce((a, b) => (a.value < b.value ? a : b));
  const max = entries.reduce((a, b) => (a.value > b.value ? a : b));
  const latest = entries[entries.length - 1];
  const first = entries[0];
  const change = latest.value - first.value;

  const metrics = [
    { label: 'Lowest weight', value: `${min.value.toFixed(1)} lb (${min.date})` },
    { label: 'Highest weight', value: `${max.value.toFixed(1)} lb (${max.date})` },
    { label: 'Change since first entry', value: `${change > 0 ? '+' : ''}${change.toFixed(1)} lb` },
    { label: 'Lowest weight', value: `${min.value.toFixed(1)} kg (${min.date})` },
    { label: 'Highest weight', value: `${max.value.toFixed(1)} kg (${max.date})` },
    { label: 'Change since first entry', value: `${change > 0 ? '+' : ''}${change.toFixed(1)} kg` },
  ];

  metrics.forEach((metric) => {
    const li = document.createElement('li');
    li.innerHTML = `<p class="label">${metric.label}</p><p class="value">${metric.value}</p>`;
    container.appendChild(li);
  });
}

function filterByDays(entries, days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return entries.filter((entry) => formatDate(entry.date) >= cutoff);
}

function renderChart(range = 30) {
  const ctx = document.getElementById('weightChart');
  const filtered = filterByDays(state.weights, range);
  const labels = filtered.map((e) => e.date);
  const data = filtered.map((e) => e.value);

  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Weight (lb)',
          label: 'Weight (kg)',
          data,
          borderColor: 'rgba(124, 58, 237, 0.9)',
          backgroundColor: 'rgba(124, 58, 237, 0.2)',
          tension: 0.25,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    },
    options: {
      scales: {
        x: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
        y: {
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.04)' },
        },
      },
      plugins: {
        legend: { labels: { color: '#cbd5e1' } },
      },
    },
  });
}

function summarizeIntake(entries, label) {
  if (!entries.length) return `<div class="stat-tile"><h4>${label}</h4><p>No data yet</p></div>`;
  const today = todayISO();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const todayEntry = entries.find((e) => e.date === today);
  const lastWeek = entries.filter((e) => formatDate(e.date) >= weekAgo);
  const avg = lastWeek.reduce((sum, e) => sum + getCalorieTotal(e), 0) / lastWeek.length || 0;
  const avg = lastWeek.reduce((sum, e) => sum + e.value, 0) / lastWeek.length || 0;

  return `
    <div class="stat-tile">
      <h4>Today</h4>
      <p>${todayEntry ? getCalorieTotal(todayEntry) : 0} ${label === 'Calories' ? 'kcal' : 'L'}</p>
      <p>${todayEntry ? todayEntry.value : 0} ${label === 'Calories' ? 'kcal' : 'L'}</p>
    </div>
    <div class="stat-tile">
      <h4>7-day average</h4>
      <p>${avg.toFixed(1)} ${label === 'Calories' ? 'kcal' : 'L'}</p>
    </div>
    <div class="stat-tile">
      <h4>Entries</h4>
      <p>${entries.length} logged</p>
    </div>
  `;
}

function renderIntake() {
  document.getElementById('calorie-stats').innerHTML = summarizeIntake(state.calories, 'Calories');
  document.getElementById('water-stats').innerHTML = summarizeIntake(state.water, 'Water');
}

function renderFoodList() {
  const list = document.getElementById('food-list');
  if (!list) return;
  list.innerHTML = '';
  const flattened = [];
  state.calories.forEach((entry) => {
    entry.items?.forEach((item) => {
      flattened.push({ date: entry.date, name: item.name, calories: item.calories });
    });
  });
  const recent = flattened.slice(-10).reverse();
  if (!recent.length) {
    const li = document.createElement('li');
    li.classList.add('muted');
    li.textContent = 'No foods logged yet';
    list.appendChild(li);
    return;
  }

  recent.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${item.date}</span><strong>${item.name} — ${item.calories} kcal</strong>`;
    list.appendChild(li);
  });
}

function quickAdd() {
  const date = todayISO();
  const weightValue = prompt('Enter today\'s weight (lb)');
  if (weightValue) {
    addEntry('weights', { date, value: Number(weightValue) });
  }
  const foodName = prompt('Enter a food item to log (cancel to skip)');
  if (foodName !== null && foodName.trim() !== '') {
    const caloriesValue = prompt('Calories for that item');
    if (caloriesValue) {
      addCalorieItem(date, foodName.trim(), Number(caloriesValue));
    }
function quickAdd() {
  const date = todayISO();
  const weightValue = prompt('Enter today\'s weight (kg)');
  if (weightValue) {
    addEntry('weights', { date, value: Number(weightValue) });
  }
  const caloriesValue = prompt('Enter today\'s calorie total');
  if (caloriesValue) {
    addEntry('calories', { date, value: Number(caloriesValue) });
  }
  const waterValue = prompt('Enter today\'s water intake (L)');
  if (waterValue) {
    addEntry('water', { date, value: Number(waterValue) });
  }
  hydrateUI();
}

function hydrateUI(range = 30) {
  hydrateStats();
  renderWeightList();
  renderWeightHighlights();
  renderChart(range);
  renderIntake();
  renderFoodList();
}

weightForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('weight-date').value;
  const value = Number(document.getElementById('weight-value').value);
  addEntry('weights', { date, value });
  hydrateUI();
  weightForm.reset();
  setDefaultDates();
});

calorieForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('calorie-date').value;
  const name = document.getElementById('calorie-item').value.trim();
  const value = Number(document.getElementById('calorie-value').value);
  addCalorieItem(date, name, value);
  const value = Number(document.getElementById('calorie-value').value);
  addEntry('calories', { date, value });
  hydrateUI();
  calorieForm.reset();
  setDefaultDates();
});

waterForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const date = document.getElementById('water-date').value;
  const value = Number(document.getElementById('water-value').value);
  addEntry('water', { date, value });
  hydrateUI();
  waterForm.reset();
  setDefaultDates();
});

rangeButtons.forEach((btn) =>
  btn.addEventListener('click', () => {
    rangeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const range = Number(btn.dataset.range);
    hydrateUI(range);
  })
);

quickAddBtn.addEventListener('click', quickAdd);
scrollToFormsBtn.addEventListener('click', () => {
  document.getElementById('forms').scrollIntoView({ behavior: 'smooth' });
});

setDefaultDates();
hydrateUI();
