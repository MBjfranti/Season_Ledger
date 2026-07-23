<script setup>
import { computed, ref, nextTick, watch, onMounted } from "vue";
import { CLUBS } from "../data/data.js";
import { state, toggleStar, toggleWatched, setFixtureNotes, addFixture } from "../store.js";
import { fmtDate, fmtDayHead, timeSortKey, weekStart, todayISO, fixtureScore,
         fixtureReasons, matchupLabel, clubById, broadcastFor } from "../utils.js";
import BcChip from "../components/BcChip.vue";

const openNotesFor = ref(null); // fixture id with the inline notes form expanded
const noteDraft = ref("");
const expandedPast = ref(new Set()); // past week keys the user opened

/* ── Filters ───────────────────────────────────────────── */

const clubFilter = ref(new Set()); // empty = all clubs
const compFilter = ref("");        // "" = all competitions
const watchableOnly = ref(false);  // only comps with a green (have) service

const allComps = computed(() => {
  const seen = new Set();
  for (const c of CLUBS) for (const comp of c.comps) seen.add(comp);
  return [...seen];
});

function toggleClubFilter(id) {
  const next = new Set(clubFilter.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  clubFilter.value = next;
}

const filtersActive = computed(() =>
  clubFilter.value.size > 0 || compFilter.value !== "" || watchableOnly.value);

function clearFilters() {
  clubFilter.value = new Set();
  compFilter.value = "";
  watchableOnly.value = false;
}

function passesFilters(f) {
  if (clubFilter.value.size &&
      !clubFilter.value.has(f.clubId) &&
      !(f.opponentId && clubFilter.value.has(f.opponentId))) return false;
  if (compFilter.value && f.comp !== compFilter.value) return false;
  if (watchableOnly.value && !broadcastFor(f.comp).some(b => b.have)) return false;
  return true;
}

/* ── Weeks ─────────────────────────────────────────────── */

const weeks = computed(() => {
  const dated = state.fixtures.filter(f => f.date && passesFilters(f))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byWeek = new Map();
  for (const f of dated) {
    const wk = weekStart(f.date);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk).push(f);
  }
  const thisWeek = weekStart(todayISO());
  return [...byWeek.entries()].map(([wk, fs]) => {
    const ranked = [...fs].sort((a, b) => fixtureScore(b) - fixtureScore(a) || a.date.localeCompare(b.date));
    const days = new Map();
    for (const f of fs) {
      if (!days.has(f.date)) days.set(f.date, []);
      days.get(f.date).push(f);
    }
    const dayBlocks = [...days.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, dfs]) => ({
        day,
        fixtures: dfs.sort((a, b) => timeSortKey(a.time) - timeSortKey(b.time) || fixtureScore(b) - fixtureScore(a)),
      }));
    return { wk, past: wk < thisWeek, count: fs.length, ranked, days: dayBlocks };
  });
});

// Month jump bar + upcoming anchor.
const months = computed(() => {
  const out = [];
  for (const { wk } of weeks.value) {
    const m = wk.slice(0, 7);
    if (!out.some(x => x.key === m)) {
      const d = new Date(wk + "T12:00:00");
      const mon = d.toLocaleDateString(undefined, { month: "short" });
      out.push({ key: m, wk, label: `${mon} '${String(d.getFullYear()).slice(2)}` });
    }
  }
  return out;
});

const upcomingWk = computed(() => {
  const thisWeek = weekStart(todayISO());
  return weeks.value.find(w => w.wk >= thisWeek)?.wk || null;
});

// Each week gets one Watch pick and up to two Backups, ranked by fixtureScore.
function tagFor(week, f) {
  if (f.date < todayISO()) return "awaiting";
  if (week.count > 1 || fixtureScore(f) > 30) {
    const rank = week.ranked.indexOf(f);
    if (rank === 0) return "watch";
    if (rank <= 2) return "backup";
  }
  return null;
}

// Cards for the ranked picks and starred fixtures; compact rows for the rest.
function isCard(week, f) {
  const tag = tagFor(week, f);
  return tag === "watch" || tag === "backup" || f.mustWatch;
}

function displayReasons(f) {
  return fixtureReasons(f).filter(r => r !== "Marked must-watch");
}

function jumpTo(wk, smooth = false) {
  document.getElementById("wk-" + wk)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
}

function togglePastWeek(wk) {
  const next = new Set(expandedPast.value);
  if (next.has(wk)) next.delete(wk);
  else next.add(wk);
  expandedPast.value = next;
}

// Open at "now", not at last August.
onMounted(() => {
  if (upcomingWk.value && upcomingWk.value !== weeks.value[0]?.wk) {
    nextTick(() => jumpTo(upcomingWk.value));
  }
});

function openNotes(f) {
  if (openNotesFor.value === f.id) {
    openNotesFor.value = null;
    return;
  }
  openNotesFor.value = f.id;
  noteDraft.value = f.notes || "";
  nextTick(() => document.querySelector(".notes-form input")?.focus());
}

function saveNote(f) {
  setFixtureNotes(f.id, noteDraft.value);
  openNotesFor.value = null;
}

/* ── Add-fixture form ──────────────────────────────────── */

const form = ref({
  clubId: CLUBS[0].id,
  opponent: "",
  venue: "H",
  comp: CLUBS[0].comps[0],
  date: "",
  time: "",
  mustWatch: false,
});

const compOptions = computed(() => clubById(form.value.clubId)?.comps || []);

// Repopulate the competition choice when the selected club changes.
watch(() => form.value.clubId, () => {
  form.value.comp = compOptions.value[0];
});

// "14:05" from the time input -> "2:05 PM CT" as stored on fixtures.
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
  form.value.opponent = "";
  form.value.date = "";
  form.value.time = "";
  form.value.mustWatch = false;
}
</script>

<template>
  <div class="filter-bar" role="group" aria-label="Filter fixtures">
    <button class="filter-chip" :class="{ active: !clubFilter.size }"
            :aria-pressed="!clubFilter.size" @click="clubFilter = new Set()">
      <span class="fc-label">All clubs</span>
    </button>
    <button v-for="c in CLUBS" :key="c.id" class="filter-chip"
            :class="{ active: clubFilter.has(c.id) }" :aria-pressed="clubFilter.has(c.id)"
            @click="toggleClubFilter(c.id)">
      <span class="kit" :class="`kit-${c.id}`"></span><span class="fc-label">{{ c.short }}</span>
    </button>
    <select v-model="compFilter" class="filter-select" aria-label="Filter by competition">
      <option value="">All competitions</option>
      <option v-for="comp in allComps" :key="comp" :value="comp">{{ comp }}</option>
    </select>
    <button class="filter-chip toggle" :class="{ active: watchableOnly }"
            :aria-pressed="watchableOnly" @click="watchableOnly = !watchableOnly">
      <span class="fc-label">✓ Watchable now</span>
    </button>
    <button v-if="filtersActive" class="btn" @click="clearFilters">Clear</button>
  </div>

  <div class="month-nav">
    <span class="lbl">Jump to</span>
    <button v-if="upcomingWk" class="btn" @click="jumpTo(upcomingWk)">Upcoming</button>
    <button v-for="m in months" :key="m.key" class="btn" @click="jumpTo(m.wk)">{{ m.label }}</button>
  </div>

  <p class="explain" style="margin-top:12px">Each week gets one <span class="tag watch">Watch</span> pick and up to two
    <span class="tag backup">Backup</span>s — ranked by matchups between your own clubs, derbies,
    big-name opponents, European nights and cup ties. Star (★) a fixture to force it up the order.
    Broadcast chips: <span class="bc have">✓ green</span> is a service you have,
    <span class="bc need">+ amber</span> one you don't (yet). Mark what you saw with ☑ Watched and jot
    notes (✎); scores arrive in periodic result pulls, so past fixtures read
    <span class="tag awaiting">Awaiting result</span> until then. Times are US Central.</p>

  <div v-if="!weeks.length" class="empty">
    {{ filtersActive ? "No fixtures match these filters." : "No fixtures yet. Add the ones you care about below." }}
  </div>

  <div v-for="week in weeks" :key="week.wk" class="week" :class="{ past: week.past }" :id="`wk-${week.wk}`">
    <template v-if="week.past && !expandedPast.has(week.wk)">
      <button class="week-collapsed" @click="togglePastWeek(week.wk)">
        <span class="wc-head">Week of {{ fmtDate(week.wk) }}</span>
        <span class="wc-sum">{{ week.count }} fixture{{ week.count === 1 ? "" : "s" }} awaiting results</span>
        <span class="wc-expand" aria-hidden="true">▸</span>
      </button>
    </template>
    <template v-else>
      <h2 class="week-head">
        Week of {{ fmtDate(week.wk) }}
        <button v-if="week.past" class="btn wc-collapse" @click="togglePastWeek(week.wk)">Collapse ▴</button>
      </h2>
      <div v-for="block in week.days" :key="block.day" class="day-block">
        <h3 class="day-head">{{ fmtDayHead(block.day) }}</h3>
        <div class="day-cards">
          <template v-for="f in block.fixtures" :key="f.id">
            <div v-if="isCard(week, f)" class="fx-card"
                 :class="{ 'is-watch': tagFor(week, f) === 'watch', 'is-watched': f.watched }">
              <div v-if="f.opponentId" class="kit-pair">
                <span class="kit" :class="`kit-${f.clubId}`"></span><span class="kit" :class="`kit-${f.opponentId}`"></span>
              </div>
              <div v-else class="kit" :class="`kit-${f.clubId}`"></div>
              <div class="fx-body">
                <div class="fx-top">
                  <span v-if="tagFor(week, f) === 'awaiting'" class="tag awaiting">Awaiting result</span>
                  <span v-else-if="tagFor(week, f) === 'watch'" class="tag watch">Watch</span>
                  <span v-else-if="tagFor(week, f) === 'backup'" class="tag backup">Backup</span>
                  <span class="fx-time">{{ f.time || "Time TBD" }}</span>
                </div>
                <div class="fx-match">{{ matchupLabel(f) }}</div>
                <div class="fx-meta"><span class="fx-comp">{{ f.comp }}</span> <BcChip :comp="f.comp" /></div>
                <div v-if="displayReasons(f).length" class="reasons">{{ displayReasons(f).join(" · ") }}</div>
                <div v-if="f.notes" class="fx-note">“{{ f.notes }}”</div>
                <div class="fx-actions">
                  <button class="btn star" :class="{ on: f.mustWatch }" :aria-pressed="f.mustWatch"
                          :aria-label="`Must-watch: ${matchupLabel(f)}`" title="Toggle must-watch"
                          @click="toggleStar(f.id)">{{ f.mustWatch ? "★" : "☆" }}</button>
                  <button class="btn check" :class="{ on: f.watched }" :aria-pressed="f.watched"
                          :aria-label="`Watched: ${matchupLabel(f)}`" title="Did you watch it?"
                          @click="toggleWatched(f.id)">{{ f.watched ? "☑" : "☐" }} Watched</button>
                  <button class="btn" :aria-label="`Note on ${matchupLabel(f)}`" title="Add a note"
                          @click="openNotes(f)">✎ Note</button>
                </div>
                <form v-if="openNotesFor === f.id" class="notes-form" @submit.prevent="saveNote(f)">
                  <input v-model="noteDraft" placeholder="Your notes on this one">
                  <button class="btn primary" type="submit">Save note</button>
                  <button class="btn" type="button" @click="openNotesFor = null">Cancel</button>
                </form>
              </div>
            </div>
            <div v-else class="fx-row" :class="{ 'is-watched': f.watched }">
              <span class="kit" :class="`kit-${f.clubId}`"></span>
              <span class="fxr-time">{{ f.time || "TBD" }}</span>
              <span class="fxr-match">{{ matchupLabel(f) }}</span>
              <span class="fx-comp">{{ f.comp }}</span>
              <BcChip :comp="f.comp" />
              <span v-if="tagFor(week, f) === 'awaiting'" class="tag awaiting">Awaiting result</span>
              <span v-if="f.notes" class="fxr-note" :title="f.notes">✎ “{{ f.notes }}”</span>
              <span class="fxr-actions">
                <button class="btn star" :class="{ on: f.mustWatch }" :aria-pressed="f.mustWatch"
                        :aria-label="`Must-watch: ${matchupLabel(f)}`" title="Toggle must-watch"
                        @click="toggleStar(f.id)">{{ f.mustWatch ? "★" : "☆" }}</button>
                <button class="btn check" :class="{ on: f.watched }" :aria-pressed="f.watched"
                        :aria-label="`Watched: ${matchupLabel(f)}`" title="Did you watch it?"
                        @click="toggleWatched(f.id)">{{ f.watched ? "☑" : "☐" }}</button>
                <button class="btn" :aria-label="`Note on ${matchupLabel(f)}`" title="Add a note"
                        @click="openNotes(f)">✎</button>
              </span>
              <form v-if="openNotesFor === f.id" class="notes-form" @submit.prevent="saveNote(f)">
                <input v-model="noteDraft" placeholder="Your notes on this one">
                <button class="btn primary" type="submit">Save note</button>
                <button class="btn" type="button" @click="openNotesFor = null">Cancel</button>
              </form>
            </div>
          </template>
        </div>
      </div>
    </template>
  </div>

  <h2 class="section-label">Add a fixture</h2>
  <form class="add-form" @submit.prevent="submitFixture">
    <div class="field"><label for="fxClub">Club</label>
      <select id="fxClub" v-model="form.clubId">
        <option v-for="c in CLUBS" :key="c.id" :value="c.id">{{ c.short }}</option>
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
    <div class="field"><label for="fxTime">Kickoff (Central Time, optional)</label>
      <input id="fxTime" v-model="form.time" type="time"></div>
    <div class="field field-check"><label for="fxStar">Must-watch ★</label>
      <input id="fxStar" v-model="form.mustWatch" type="checkbox"></div>
    <div class="field"><button class="btn primary" type="submit">Add fixture</button></div>
  </form>
</template>
