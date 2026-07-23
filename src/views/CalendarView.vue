<script setup>
import { computed, ref, nextTick, watch } from "vue";
import { CLUBS } from "../data/data.js";
import { state, toggleStar, toggleWatched, setFixtureNotes, addFixture } from "../store.js";
import { fmtDate, fmtDayHead, timeSortKey, weekStart, todayISO, fixtureScore, fixtureReasons, matchupLabel, clubById } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import ClubStrip from "../components/ClubStrip.vue";

const openNotesFor = ref(null); // fixture id with the inline notes form expanded
const noteDraft = ref("");

const weeks = computed(() => {
  const dated = [...state.fixtures].filter(f => f.date).sort((a, b) => a.date.localeCompare(b.date));
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
      out.push({ key: m, wk, label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }) });
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

function displayReasons(f) {
  return fixtureReasons(f).filter(r => r !== "Marked must-watch");
}

function jumpTo(wk) {
  document.getElementById("wk-" + wk)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  mustWatch: "",
});

const compOptions = computed(() => clubById(form.value.clubId)?.comps || []);

// Repopulate the competition choice when the selected club changes.
watch(() => form.value.clubId, () => {
  form.value.comp = compOptions.value[0];
});

function submitFixture() {
  const opponent = form.value.opponent.trim();
  if (!opponent) return;
  addFixture({ ...form.value, opponent, mustWatch: !!form.value.mustWatch });
  form.value.opponent = "";
  form.value.date = "";
  form.value.time = "";
  form.value.mustWatch = "";
}
</script>

<template>
  <ClubStrip />

  <div class="month-nav">
    <span class="lbl">Jump to</span>
    <button v-if="upcomingWk" class="btn" @click="jumpTo(upcomingWk)">Upcoming</button>
    <button v-for="m in months" :key="m.key" class="btn" @click="jumpTo(m.wk)">{{ m.label }}</button>
  </div>

  <p class="explain" style="margin-top:12px">Each week gets one <span class="tag watch">Watch</span> pick and up to two
    <span class="tag backup">Backup</span>s — ranked by matchups between your own clubs, derbies,
    big-name opponents, European nights and cup ties. Star (★) a fixture to force it up the order.
    Broadcast chips: <span class="bc have">green</span> is a service you have,
    <span class="bc need">amber</span> one you don't (yet). Mark what you saw with ☑ Watched and jot
    notes (✎); scores arrive in periodic result pulls, so past fixtures read
    <span class="tag awaiting">Awaiting result</span> until then. Times are US Central.</p>

  <div v-if="!weeks.length" class="empty">No fixtures yet. Add the ones you care about below.</div>

  <div v-for="week in weeks" :key="week.wk" class="week" :class="{ past: week.past }" :id="`wk-${week.wk}`">
    <div class="week-head">Week of {{ fmtDate(week.wk) }}</div>
    <div v-for="block in week.days" :key="block.day" class="day-block">
      <div class="day-head">{{ fmtDayHead(block.day) }}</div>
      <div class="day-cards">
        <div v-for="f in block.fixtures" :key="f.id" class="fx-card"
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
              <button class="btn star" :class="{ on: f.mustWatch }" title="Toggle must-watch"
                      @click="toggleStar(f.id)">{{ f.mustWatch ? "★" : "☆" }}</button>
              <button class="btn check" :class="{ on: f.watched }" title="Did you watch it?"
                      @click="toggleWatched(f.id)">{{ f.watched ? "☑" : "☐" }} Watched</button>
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
    </div>
  </div>

  <div class="section-label">Add a fixture</div>
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
      <input id="fxTime" v-model="form.time" placeholder="e.g. 9:00 AM CT"></div>
    <div class="field"><label for="fxStar">Must-watch</label>
      <select id="fxStar" v-model="form.mustWatch">
        <option value="">No</option><option value="1">Yes ★</option>
      </select></div>
    <div class="field"><button class="btn primary" type="submit">Add fixture</button></div>
  </form>
</template>
