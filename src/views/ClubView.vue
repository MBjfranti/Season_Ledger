<script setup>
import { computed } from "vue";
import { LEAGUES, CLUB_IMAGES, CLUB_SITES, STADIUMS } from "../data/data.js";
import { state, recordFor, setPosition } from "../store.js";
import { fmtDate, todayISO, resultLetter, matchupLabel, getOrdinal, clubById } from "../utils.js";
import BcChip from "../components/BcChip.vue";
import ClubStrip from "../components/ClubStrip.vue";
import FormChips from "../components/FormChips.vue";

const props = defineProps({ id: { type: String, required: true } });

const club = computed(() => clubById(props.id));
const league = computed(() => LEAGUES[club.value.league]);
const images = computed(() => CLUB_IMAGES[props.id]);
const stadium = computed(() => STADIUMS[props.id]);
const site = computed(() => CLUB_SITES[props.id]);
const record = computed(() => recordFor(props.id));
const pos = computed(() => state.positions[props.id]);

const heroStyle = computed(() => ({
  backgroundImage: `linear-gradient(180deg, rgba(18,24,31,0.25) 0%, rgba(18,24,31,0.55) 55%, rgba(18,24,31,0.9) 100%), url('${images.value.hero}')`,
  backgroundPosition: images.value.heroPos || "center 35%",
}));

const matches = computed(() =>
  [...(state.matches[props.id] || [])].sort((a, b) => b.date.localeCompare(a.date)));

const upcoming = computed(() => state.fixtures
  .filter(f => f.clubId === props.id || f.opponentId === props.id)
  .filter(f => f.date && f.date >= todayISO())
  .sort((a, b) => a.date.localeCompare(b.date))
  .slice(0, 8));

// Forecast band: one segment per league place, highlighting the forecast range.
const bandSegs = computed(() => {
  const segs = [];
  for (let i = 1; i <= league.value.size; i++) {
    segs.push({
      pos: i,
      inBand: i >= club.value.forecast.low && i <= club.value.forecast.high,
      current: i === pos.value,
    });
  }
  return segs;
});
</script>

<template>
  <div v-if="!club" class="empty">Unknown club.</div>
  <template v-else>
    <ClubStrip :active-id="id" />
    <router-link class="backlink" to="/">← All clubs</router-link>

    <div class="club-hero">
      <div class="kit" :class="`kit-${club.id}`"></div>
      <div class="hero-body has-photo" :style="heroStyle">
        <div class="hero-title">
          <img class="hero-crest" :src="images.crest" alt="" @error="e => e.target.remove()">
          <div>
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

    <div class="two-col">
      <div>
        <div class="stat-grid">
          <div class="stat"><div class="num">{{ record.p }}</div><div class="lbl">Played</div></div>
          <div class="stat"><div class="num">{{ record.gf }}:{{ record.ga }}</div><div class="lbl">Goals</div></div>
          <div class="stat"><div class="num"><FormChips :form="record.form" /></div><div class="lbl">Form (last 5)</div></div>
        </div>

        <h2 class="section-label">Season preview</h2>
        <details class="preview">
          <summary>Read the full preview</summary>
          <div class="prose"><p v-for="(p, i) in club.preview" :key="i">{{ p }}</p></div>
        </details>

        <h2 class="section-label">Results</h2>
        <div v-if="matches.length" class="log-scroll">
          <table class="log-table">
            <thead><tr><th>Date</th><th>Comp</th><th>Opponent</th><th>Result</th><th>Notes</th></tr></thead>
            <tbody>
              <tr v-for="m in matches" :key="m.id">
                <td>{{ fmtDate(m.date) }}</td>
                <td>{{ m.comp }}</td>
                <td>{{ m.opponent }} ({{ m.venue }})</td>
                <td class="score" :class="`res-${resultLetter(m.gf, m.ga)}`">{{ resultLetter(m.gf, m.ga) }} {{ m.gf }}–{{ m.ga }}</td>
                <td class="notes"><span v-if="m.watched" class="watched-mark">watched</span> {{ m.notes || "" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty">No results yet — they arrive with the periodic result pulls once the season starts.</div>
      </div>

      <div>
        <div class="band-wrap">
          <h2 class="section-label" style="margin:0 0 4px">Forecast: {{ club.forecast.low }}{{ getOrdinal(club.forecast.low) }}–{{ club.forecast.high }}{{ getOrdinal(club.forecast.high) }}</h2>
          <div class="band-row">
            <div v-for="s in bandSegs" :key="s.pos" class="band-seg"
                 :class="{ 'in-band': s.inBand, current: s.current }"
                 :title="`${s.pos}${getOrdinal(s.pos)}`"></div>
          </div>
          <div class="band-legend"><span>1st</span><span>{{ league.size }}{{ getOrdinal(league.size) }}</span></div>
          <div class="band-current">Currently: {{ pos ? pos + getOrdinal(pos) : "not set" }}</div>
          <div class="pos-controls">
            <label for="posInput">Current position</label>
            <input id="posInput" type="number" min="1" :max="league.size" :value="pos || ''"
                   placeholder="—" @change="e => setPosition(id, e.target.value)">
          </div>
          <div class="band-note">{{ club.forecast.extra }}</div>
        </div>

        <h2 class="section-label">Next up</h2>
        <ul v-if="upcoming.length" class="fixtures">
          <li v-for="f in upcoming" :key="f.id">
            <span class="when">{{ fmtDate(f.date) }}<template v-if="f.time"> · {{ f.time }}</template></span>
            <span class="fx-line">{{ matchupLabel(f) }} · {{ f.comp }} <BcChip :comp="f.comp" /></span>
          </li>
        </ul>
        <div v-else class="empty">No upcoming fixtures on the <router-link to="/calendar">calendar</router-link>.</div>

        <h2 class="section-label">Key dates</h2>
        <ul class="fixtures">
          <li v-for="(k, i) in club.keyFixtures" :key="i"><span class="when">{{ k.when }}</span><span>{{ k.label }}</span></li>
        </ul>
      </div>
    </div>
  </template>
</template>
