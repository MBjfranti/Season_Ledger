<script setup>
import { computed, ref, nextTick, watch } from "vue";
import { state, toggleStar, toggleWatched, setFixtureNotes, addFixture,
         activeClubs, activeFixtures } from "../store.js";
import { fmtDayHead, timeSortKey, addDaysISO, todayISO, fixtureScore,
         fixtureReasons, matchupLabel, clubById } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import { compAbbr, compSlug } from "../data/competitions.js";

/* ── Filters ───────────────────────────────────────────── */
const clubFilter = ref(new Set());
const compFilter = ref("");

const allComps = computed(() => {
  const seen = new Set();
  for (const c of activeClubs.value) for (const comp of c.comps) seen.add(comp);
  return [...seen];
});

function toggleClubFilter(id) {
  const next = new Set(clubFilter.value);
  next.has(id) ? next.delete(id) : next.add(id);
  clubFilter.value = next;
}

const filtersActive = computed(() =>
  clubFilter.value.size > 0 || compFilter.value !== "");

function clearFilters() {
  clubFilter.value = new Set();
  compFilter.value = "";
}

function passesFilters(f) {
  if (clubFilter.value.size &&
      !clubFilter.value.has(f.clubId) &&
      !(f.opponentId && clubFilter.value.has(f.opponentId))) return false;
  if (compFilter.value && f.comp !== compFilter.value) return false;
  return true;
}

/* ── Each match DAY nominates its own Watch + Backups ──────
   Grouping by day (not week) so a busy stretch surfaces a pick
   every matchday instead of one lone pick for the whole week. */
const days = computed(() => {
  const dated = activeFixtures.value.filter(f => f.date && passesFilters(f))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byDay = new Map();
  for (const f of dated) {
    if (!byDay.has(f.date)) byDay.set(f.date, []);
    byDay.get(f.date).push(f);
  }
  const now = todayISO();
  return [...byDay.entries()].map(([date, fs]) => {
    const ranked = [...fs].sort((a, b) => fixtureScore(b) - fixtureScore(a) || a.date.localeCompare(b.date));
    return { date, past: date < now, count: fs.length, ranked, fixtures: fs };
  });
});

function tagFor(day, f) {
  if (f.date < todayISO()) return "awaiting";
  const rank = day.ranked.indexOf(f);
  if (rank === 0) return "watch";      // the day's top pick
  if (rank <= 2) return "backup";      // up to two alternates that day
  return null;
}

const tagMap = computed(() => {
  const m = new Map();
  for (const d of days.value) for (const f of d.fixtures) m.set(f.id, tagFor(d, f));
  return m;
});

function displayReasons(f) {
  return fixtureReasons(f).filter(r => r !== "Marked must-watch");
}

/* ── Months + the selected month's matchdays ───────────── */
const monthsList = computed(() => {
  const out = [];
  for (const d of days.value) for (const f of d.fixtures) {
    const key = f.date.slice(0, 7);
    if (!out.some(x => x.key === key)) {
      const d = new Date(f.date + "T12:00:00");
      out.push({ key, label: `${d.toLocaleDateString(undefined, { month: "short" })} '${String(d.getFullYear()).slice(2)}` });
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
});

const upcomingMonth = computed(() => {
  const t = todayISO().slice(0, 7);
  return monthsList.value.find(m => m.key >= t)?.key || monthsList.value[0]?.key || t;
});

const selectedMonth = ref(upcomingMonth.value);
const today = todayISO();

// Week starts Monday by default (European); toggle to Sunday for the US week.
const weekStartSun = ref(localStorage.getItem("weekStartSun") === "1");
watch(weekStartSun, v => localStorage.setItem("weekStartSun", v ? "1" : "0"));
const DOW = computed(() => weekStartSun.value
  ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

function rowStart(dayISO) {
  const dow = new Date(dayISO + "T12:00:00").getDay(); // 0 Sun … 6 Sat
  const start = weekStartSun.value ? 0 : 1;
  return addDaysISO(dayISO, -((dow - start + 7) % 7));
}

// The month laid out as week rows (Mon–Sun or Sun–Sat), 7 day cells each.
const monthWeeks = computed(() => {
  const key = selectedMonth.value;
  if (!key) return [];
  const y = +key.slice(0, 4), mo = +key.slice(5, 7);
  const lastDay = new Date(y, mo, 0).getDate();
  const byDate = new Map();
  for (const d of days.value) for (const f of d.fixtures) {
    if (f.date.slice(0, 7) !== key) continue;
    if (!byDate.has(f.date)) byDate.set(f.date, []);
    byDate.get(f.date).push(f);
  }
  const rows = [];
  let cur = rowStart(`${key}-01`);
  const end = rowStart(`${key}-${String(lastDay).padStart(2, "0")}`);
  while (cur <= end) {
    const cells = [];
    for (let i = 0; i < 7; i++) {
      const day = addDaysISO(cur, i);
      const fx = byDate.get(day) || [];
      const fixtures = [...fx].sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time) || fixtureScore(b) - fixtureScore(a));
      const ranked = [...fx].sort((a, b) => fixtureScore(b) - fixtureScore(a));
      const kits = [...new Set(fx.flatMap(f => f.opponentId ? [f.clubId, f.opponentId] : [f.clubId]))];
      cells.push({ day, inMonth: day.slice(0, 7) === key, fixtures, count: fixtures.length, top: ranked[0], kits, past: day < today });
    }
    rows.push({ wk: cur, cells });
    cur = addDaysISO(cur, 7);
  }
  return rows;
});

/* ── Day drawer ────────────────────────────────────────── */
const selectedDay = ref(null);
const selectedDayData = computed(() => {
  for (const r of monthWeeks.value) for (const c of r.cells) if (c.day === selectedDay.value) return c;
  return null;
});
watch(selectedMonth, () => { selectedDay.value = null; });

// Busy days shrink their cards so the whole slate stays on screen with less
// scrolling — comfortable by default, tighter as the count climbs.
const drawerDensity = computed(() => {
  const n = selectedDayData.value?.fixtures.length || 0;
  return n >= 8 ? "packed" : n >= 5 ? "dense" : "";
});

function dnum(day) { return new Date(day + "T12:00:00").getDate(); }

const openNotesFor = ref(null);
const noteDraft = ref("");
function openNotes(f) {
  if (openNotesFor.value === f.id) { openNotesFor.value = null; return; }
  openNotesFor.value = f.id;
  noteDraft.value = f.notes || "";
  nextTick(() => document.querySelector(".notes-form input")?.focus());
}
function saveNote(f) {
  setFixtureNotes(f.id, noteDraft.value);
  openNotesFor.value = null;
}

/* ── Add-fixture drawer ────────────────────────────────── */
const showAdd = ref(false);
const form = ref({ clubId: activeClubs.value[0]?.id || "", opponent: "", venue: "H",
                   comp: activeClubs.value[0]?.comps[0] || "", date: "", time: "", mustWatch: false });
const compOptions = computed(() => clubById(form.value.clubId)?.comps || []);
watch(() => form.value.clubId, () => { form.value.comp = compOptions.value[0]; });

function toCTLabel(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return "";
  let h = parseInt(m[1], 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m[2]} ${ampm} CT`;
}
function submitFixture() {
  const opponent = form.value.opponent.trim();
  if (!opponent) return;
  addFixture({ ...form.value, opponent, time: toCTLabel(form.value.time) });
  form.value.opponent = ""; form.value.date = ""; form.value.time = ""; form.value.mustWatch = false;
  showAdd.value = false;
}
</script>

<template>
  <div class="cal">
    <div class="cal-controls" role="group" aria-label="Filter fixtures">
      <button class="filter-chip toggle" :class="{ active: !clubFilter.size }"
              :aria-pressed="!clubFilter.size" @click="clubFilter = new Set()">
        <span class="fc-label">All</span>
      </button>
      <button v-for="c in activeClubs" :key="c.id" class="filter-chip"
              :class="{ active: clubFilter.has(c.id) }" :aria-pressed="clubFilter.has(c.id)"
              @click="toggleClubFilter(c.id)">
        <span class="kit" :class="`kit-${c.id}`"></span><span class="fc-label">{{ c.short }}</span>
      </button>
      <select v-model="compFilter" class="filter-select" aria-label="Filter by competition">
        <option value="">All competitions</option>
        <option v-for="comp in allComps" :key="comp" :value="comp">{{ comp }}</option>
      </select>
      <button v-if="filtersActive" class="btn" @click="clearFilters">Clear</button>
      <span class="cal-spacer"></span>
      <button class="btn" @click="showAdd = true">＋ Add fixture</button>
    </div>

    <div class="month-tabs">
      <span class="lbl">Month</span>
      <button v-for="m in monthsList" :key="m.key" class="btn month-tab"
              :class="{ active: selectedMonth === m.key }" @click="selectedMonth = m.key">{{ m.label }}</button>
      <span class="cal-spacer"></span>
      <button class="btn wk-toggle" :title="`Week starts ${weekStartSun ? 'Sunday' : 'Monday'} — click to switch`"
              @click="weekStartSun = !weekStartSun">{{ weekStartSun ? "Sun–Sat" : "Mon–Sun" }}</button>
    </div>

    <div v-if="!monthWeeks.length" class="empty">
      {{ filtersActive ? "No fixtures this month match these filters." : "No fixtures this month." }}
    </div>
    <div v-else class="month-cal">
      <div class="cal-dow-head"><span v-for="d in DOW" :key="d">{{ d }}</span></div>
      <div class="cal-weeks">
        <div v-for="row in monthWeeks" :key="row.wk" class="cal-week">
          <component :is="c.count ? 'button' : 'div'" v-for="c in row.cells" :key="c.day"
                     class="cal-cell"
                     :class="{ has: c.count, out: !c.inMonth, empty: c.inMonth && !c.count, past: c.past, picked: selectedDay === c.day, today: c.day === today }"
                     @click="c.count && (selectedDay = c.day)">
            <div class="cell-top">
              <span class="cell-num">{{ dnum(c.day) }}</span>
              <span v-if="c.count && tagMap.get(c.top.id) === 'watch'" class="tag watch cell-tag">Watch</span>
            </div>
            <template v-if="c.count">
              <div class="cell-match">{{ matchupLabel(c.top) }}</div>
              <div class="cell-time">
                {{ c.top.time || "Time TBD" }}
                <span class="cell-comp">{{ compAbbr(c.top.comp) }}</span>
              </div>
              <div class="cell-foot">
                <span class="dc-kits"><span v-for="k in c.kits.slice(0, 4)" :key="k" class="kit" :class="`kit-${k}`"></span></span>
                <span v-if="c.count > 1" class="dc-more">+{{ c.count - 1 }}</span>
              </div>
            </template>
          </component>
        </div>
      </div>
    </div>

    <!-- Day drawer -->
    <template v-if="selectedDay && selectedDayData">
      <div class="drawer-backdrop" @click="selectedDay = null"></div>
      <aside class="drawer" role="dialog" aria-label="Fixtures for the day">
        <header class="drawer-head">
          <div class="drawer-title">{{ fmtDayHead(selectedDay) }}</div>
          <button class="btn drawer-close" @click="selectedDay = null">Close ✕</button>
        </header>
        <div class="drawer-body" :class="drawerDensity">
          <div v-for="f in selectedDayData.fixtures" :key="f.id" class="fx-card"
               :class="{ 'is-watch': tagMap.get(f.id) === 'watch', 'is-watched': f.watched }">
            <div v-if="f.opponentId" class="kit-pair">
              <span class="kit" :class="`kit-${f.clubId}`"></span><span class="kit" :class="`kit-${f.opponentId}`"></span>
            </div>
            <div v-else class="kit" :class="`kit-${f.clubId}`"></div>
            <div class="fx-body">
              <div class="fx-top">
                <span v-if="tagMap.get(f.id) === 'awaiting'" class="tag awaiting">Awaiting result</span>
                <span v-else-if="tagMap.get(f.id) === 'watch'" class="tag watch">Watch</span>
                <span v-else-if="tagMap.get(f.id) === 'backup'" class="tag backup">Backup</span>
                <span class="fx-time">{{ f.time || "Time TBD" }}</span>
              </div>
              <div class="fx-match">{{ matchupLabel(f) }}</div>
              <div class="fx-meta">
                <router-link v-if="compSlug(f.comp)" class="fx-comp is-link"
                             :to="`/competition/${compSlug(f.comp)}`">{{ f.comp }} ↗</router-link>
                <span v-else class="fx-comp">{{ f.comp }}</span>
                <BcChip :comp="f.comp" />
              </div>
              <div v-if="displayReasons(f).length" class="reasons">{{ displayReasons(f).join(" · ") }}</div>
              <div v-if="f.notes" class="fx-note">“{{ f.notes }}”</div>
              <div class="fx-actions">
                <button class="btn star" :class="{ on: f.mustWatch }" :aria-pressed="f.mustWatch"
                        title="Toggle must-watch" @click="toggleStar(f.id)">{{ f.mustWatch ? "★" : "☆" }}</button>
                <button class="btn check" :class="{ on: f.watched }" :aria-pressed="f.watched"
                        title="Did you watch it?" @click="toggleWatched(f.id)">{{ f.watched ? "☑" : "☐" }} Watched</button>
                <button class="btn" title="Add a note" @click="openNotes(f)">✎ Note</button>
              </div>
              <form v-if="openNotesFor === f.id" class="notes-form" @submit.prevent="saveNote(f)">
                <input v-model="noteDraft" placeholder="Your notes on this one">
                <button class="btn primary" type="submit">Save note</button>
                <button class="btn" type="button" @click="openNotesFor = null">Cancel</button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </template>

    <!-- Add-fixture drawer -->
    <template v-if="showAdd">
      <div class="drawer-backdrop" @click="showAdd = false"></div>
      <aside class="drawer" role="dialog" aria-label="Add a fixture">
        <header class="drawer-head">
          <div class="drawer-title">Add fixture</div>
          <button class="btn drawer-close" @click="showAdd = false">Close ✕</button>
        </header>
        <div class="drawer-body">
          <form class="add-form add-form-stack" @submit.prevent="submitFixture">
            <div class="field"><label for="fxClub">Club</label>
              <select id="fxClub" v-model="form.clubId">
                <option v-for="c in activeClubs" :key="c.id" :value="c.id">{{ c.short }}</option>
              </select></div>
            <div class="field"><label for="fxOpp">Opponent</label>
              <input id="fxOpp" v-model="form.opponent" required placeholder="e.g. Aston Villa"></div>
            <div class="field"><label for="fxVenue">Venue</label>
              <select id="fxVenue" v-model="form.venue">
                <option value="H">Home</option><option value="A">Away</option><option value="N">Neutral</option>
              </select></div>
            <div class="field"><label for="fxComp">Competition</label>
              <select id="fxComp" v-model="form.comp">
                <option v-for="c in compOptions" :key="c">{{ c }}</option>
              </select></div>
            <div class="field"><label for="fxDate">Date</label>
              <input id="fxDate" v-model="form.date" type="date" required></div>
            <div class="field"><label for="fxTime">Kickoff (Central, optional)</label>
              <input id="fxTime" v-model="form.time" type="time"></div>
            <div class="field field-check"><label for="fxStar">Must-watch ★</label>
              <input id="fxStar" v-model="form.mustWatch" type="checkbox"></div>
            <div class="field"><button class="btn primary" type="submit">Add fixture</button></div>
          </form>
        </div>
      </aside>
    </template>
  </div>
</template>
