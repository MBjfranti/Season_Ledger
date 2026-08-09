<script setup>
import { computed, ref, watch, onMounted, onUnmounted, nextTick } from "vue";
import { LEAGUES, CLUB_IMAGES, CLUB_SITES, STADIUMS, CLUB_COLORS } from "../data/data.js";
import { state, recordFor, setPosition } from "../store.js";
import { fmtDate, todayISO, timeSortKey, resultLetter, matchupLabel, getOrdinal, clubById } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import ClubStrip from "../components/ClubStrip.vue";
import FormChips from "../components/FormChips.vue";

const props = defineProps({ id: { type: String, required: true } });

// Tint the pitch to this club's colour while its page is open, keyed off the
// route param (props.id). --grass is a plain :root token the clock engine never
// touches, so an inline override on <html> is safe. The attribute holds the
// active club id; on teardown we only clear if a newer page hasn't taken over
// (routing recreates this component, so old-unmount can fire after new-setup).
function paintPitch(id) {
  const el = document.documentElement, c = CLUB_COLORS[id];
  if (c) { el.style.setProperty("--club", c); el.setAttribute("data-club-theme", id); }
  else { el.style.removeProperty("--club"); el.removeAttribute("data-club-theme"); }
}
watch(() => props.id, paintPitch, { immediate: true });
onUnmounted(() => {
  const el = document.documentElement;
  if (el.getAttribute("data-club-theme") === props.id) {
    el.style.removeProperty("--club"); el.removeAttribute("data-club-theme");
  }
});

const club = computed(() => clubById(props.id));
const league = computed(() => LEAGUES[club.value.league]);
const images = computed(() => CLUB_IMAGES[props.id]);
const stadium = computed(() => STADIUMS[props.id]);
const site = computed(() => CLUB_SITES[props.id]);
const record = computed(() => recordFor(props.id));
const pos = computed(() => state.positions[props.id]);

// Clubs without a stadium photo wash the banner in their kit colour instead of
// resolving url('undefined').
const heroStyle = computed(() => {
  const scrim = "linear-gradient(180deg, rgba(18,24,31,0.25) 0%, rgba(18,24,31,0.55) 55%, rgba(18,24,31,0.9) 100%)";
  const hero = images.value?.hero;
  if (!hero) {
    const tint = CLUB_COLORS[props.id] || "#1b2530";
    return { backgroundImage: `${scrim}, linear-gradient(160deg, ${tint} 0%, #12181f 90%)` };
  }
  return {
    backgroundImage: `${scrim}, url('${hero}')`,
    backgroundPosition: images.value.heroPos || "center 35%",
  };
});

// Results and fixtures are one thing — the season — so they share one wall of
// cards in date order: everything played, then everything still to come.
const timeline = computed(() => {
  const rows = [];
  for (const m of (state.matches[props.id] || [])) {
    rows.push({
      key: "m" + m.id, kind: "result", date: m.date, time: m.time || "", comp: m.comp,
      label: matchupLabel({ clubId: props.id, opponent: m.opponent, venue: m.venue }),
      gf: m.gf, ga: m.ga, res: resultLetter(m.gf, m.ga),
      notes: m.notes, watched: m.watched,
    });
  }
  for (const f of state.fixtures) {
    if (!f.date || (f.clubId !== props.id && f.opponentId !== props.id)) continue;
    rows.push({
      key: "f" + f.id, kind: "fixture", date: f.date, time: f.time, comp: f.comp,
      label: matchupLabel(f), notes: f.notes,
    });
  }
  return rows.sort((a, b) =>
    a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time));
});

const played = computed(() => timeline.value.filter(r => r.kind === "result").length);

// The card the wall opens on: the first fixture still to come.
const nextIdx = computed(() => {
  const t = todayISO();
  return timeline.value.findIndex(r => r.kind === "fixture" && r.date >= t);
});

const nextFixture = computed(() => state.fixtures
  .filter(f => (f.clubId === props.id || f.opponentId === props.id) && f.date && f.date >= todayISO())
  .sort((a, b) => a.date.localeCompare(b.date) || timeSortKey(a.time) - timeSortKey(b.time))[0]);

// Venue from *this* club's side of the tie — a stored fixture is written from
// f.clubId's perspective, so it flips when we're the opponent.
const nextVenue = computed(() => {
  const f = nextFixture.value;
  if (!f || !f.venue) return "";
  const v = f.clubId === props.id ? f.venue : f.venue === "H" ? "A" : f.venue === "A" ? "H" : f.venue;
  return { H: "Home", A: "Away", N: "Neutral" }[v] || "";
});

const nextCountdown = computed(() => {
  const f = nextFixture.value;
  if (!f) return "";
  const days = Math.round(
    (new Date(f.date + "T12:00:00") - new Date(todayISO() + "T12:00:00")) / 86400e3);
  return days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
});

// Park the wall on the row holding the next fixture — the season so far stays
// one scroll up, the run of games to come reads down from here.
const wall = ref(null);
function scrollToNext() {
  const el = wall.value;
  if (!el) return;
  const card = el.querySelector(".tl-card.is-next");
  el.scrollTop = card ? Math.max(0, card.offsetTop - 6) : el.scrollHeight;
}
onMounted(() => nextTick(scrollToNext));
watch(() => props.id, () => nextTick(scrollToNext));

// Forecast band: one segment per league place, highlighting the forecast range.
const bandSegs = computed(() => {
  const fc = club.value?.forecast;
  if (!fc) return []; // catalog club carrying no personal forecast
  const segs = [];
  for (let i = 1; i <= league.value.size; i++) {
    segs.push({
      pos: i,
      inBand: i >= fc.low && i <= fc.high,
      current: i === pos.value,
    });
  }
  return segs;
});
</script>

<template>
  <div class="sheet">
  <div v-if="!club" class="empty">Unknown club.</div>
  <template v-else>
    <ClubStrip :active-id="id" />
    <router-link class="backlink" to="/">← All clubs</router-link>

    <div class="club-hero">
      <div class="hero-main">
        <div class="kit" :class="`kit-${club.id}`"></div>
        <div class="hero-body has-photo" :style="heroStyle">
        <div class="hero-title">
          <img class="hero-crest" :src="images.crest" alt="" @error="e => e.target.remove()">
          <div class="hero-title-copy" :style="{ '--name-len': club.name.length }">
            <h2>{{ club.name }}</h2>
            <div class="sub">{{ league.name }} · {{ league.country }} · {{ club.manager }}</div>
            <div class="sub stadium-line">{{ stadium.name }} · {{ stadium.capacity.toLocaleString() }} capacity<template v-if="stadium.note"> ({{ stadium.note }})</template></div>
            <a class="site-link" :href="site" target="_blank" rel="noopener">Official site ↗</a>
          </div>
        </div>
        <div class="bigrecord">
          <div class="r">{{ record.w }}-{{ record.d }}-{{ record.l }}</div>
          <div class="l">{{ record.p }} played · {{ record.pts }} league pts</div>
        </div>
        </div>
      </div>
    </div>

    <div class="two-col">
      <div>
        <div class="stat-grid">
          <div class="stat"><div class="num">{{ record.p }}</div><div class="lbl">Played</div></div>
          <div class="stat"><div class="num">{{ record.gf }}:{{ record.ga }}</div><div class="lbl">Goals</div></div>
          <div class="stat"><div class="num"><FormChips :form="record.form" /></div><div class="lbl">Form (last 5)</div></div>
        </div>

        <template v-if="club.preview && club.preview.length">
          <h2 class="section-label">
            Season preview
            <span v-if="club.previewBy === 'app'" class="by-tag">written for the app</span>
          </h2>
          <details class="preview">
            <summary>Read the full preview</summary>
            <div class="prose"><p v-for="(p, i) in club.preview" :key="i">{{ p }}</p></div>
          </details>
        </template>

        <h2 class="section-label">The season</h2>
        <template v-if="timeline.length">
          <div class="wall-bar">
            <span>{{ played }} played · {{ timeline.length - played }} to come</span>
            <button class="btn" type="button" @click="scrollToNext">Next fixture ↓</button>
          </div>
          <div ref="wall" class="tl-wall">
            <article v-for="(r, i) in timeline" :key="r.key" class="tl-card"
                     :class="[r.kind === 'result' ? `is-result res-${r.res}` : 'is-fixture',
                              { 'is-next': i === nextIdx }]">
              <span v-if="i === nextIdx" class="tl-flag">Next</span>
              <div class="tl-when">{{ fmtDate(r.date) }}<template v-if="r.time"> · {{ r.time }}</template></div>
              <div class="tl-match">{{ r.label }}</div>
              <div v-if="r.kind === 'result'" class="tl-score" :class="`res-${r.res}`">{{ r.res }} {{ r.gf }}–{{ r.ga }}</div>
              <div class="tl-comp">{{ r.comp }}</div>
              <div v-if="r.notes || r.watched" class="tl-note">
                <span v-if="r.watched" class="watched-mark">watched</span> {{ r.notes }}
              </div>
              <div v-if="r.kind === 'fixture'" class="tl-bc"><BcChip :comp="r.comp" /></div>
            </article>
          </div>
        </template>
        <div v-else class="empty">Nothing on the ledger yet — fixtures arrive with the <router-link to="/calendar">calendar</router-link>, results with the periodic pulls.</div>
      </div>

      <div>
        <div v-if="nextFixture" class="next-card" :class="{ 'has-art': images && images.action }">
          <div v-if="images && images.action" class="nc-art"
               :style="{ backgroundImage: `url('${images.action}')` }"
               role="img" :aria-label="`${club.name} illustration`"></div>
          <div class="nc-eyebrow">Next fixture <span class="nc-count">{{ nextCountdown }}</span></div>
          <div class="nc-match">{{ matchupLabel(nextFixture) }}</div>
          <div class="nc-when">{{ fmtDate(nextFixture.date) }}<template v-if="nextFixture.time"> · {{ nextFixture.time }}</template></div>
          <div class="nc-meta">{{ nextFixture.comp }}<template v-if="nextVenue"> · {{ nextVenue }}</template></div>
          <div class="nc-bc"><BcChip :comp="nextFixture.comp" /></div>
        </div>

        <div class="band-wrap">
          <h2 v-if="club.forecast" class="section-label" style="margin:0 0 4px">Forecast: {{ club.forecast.low }}{{ getOrdinal(club.forecast.low) }}–{{ club.forecast.high }}{{ getOrdinal(club.forecast.high) }}</h2>
          <h2 v-else class="section-label" style="margin:0 0 4px">League position</h2>
          <template v-if="club.forecast">
            <div class="band-row">
              <div v-for="s in bandSegs" :key="s.pos" class="band-seg"
                   :class="{ 'in-band': s.inBand, current: s.current }"
                   :title="`${s.pos}${getOrdinal(s.pos)}`"></div>
            </div>
            <div class="band-legend"><span>1st</span><span>{{ league.size }}{{ getOrdinal(league.size) }}</span></div>
          </template>
          <div class="band-current">Currently: {{ pos ? pos + getOrdinal(pos) : "not set" }}</div>
          <div class="pos-controls">
            <label for="posInput">Current position</label>
            <input id="posInput" type="number" min="1" :max="league.size" :value="pos || ''"
                   placeholder="—" @change="e => setPosition(id, e.target.value)">
          </div>
          <div v-if="club.forecast" class="band-note">{{ club.forecast.extra }}</div>
        </div>

        <template v-if="club.keyFixtures && club.keyFixtures.length">
          <h2 class="section-label">Key dates</h2>
          <ul class="fixtures">
            <li v-for="(k, i) in club.keyFixtures" :key="i"><span class="when">{{ k.when }}</span><span>{{ k.label }}</span></li>
          </ul>
        </template>
      </div>
    </div>
  </template>
  </div>
</template>
