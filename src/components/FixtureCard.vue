<script setup>
// One match in a drawer — fixture or result, with the annotations you can put
// on it. Shared by the calendar's day drawer and the club page's season wall so
// a game offers the same three buttons wherever you reach it from.
import { ref, nextTick } from "vue";
import { toggleStar, toggleWatched, setFixtureNotes,
         toggleMatchStar, toggleMatchWatched, setMatchNotes } from "../store.js";
import { fixtureReasons, matchupLabel, resultLetter } from "../utils.js";
import { compSlug } from "../data/competitions.js";
import BcChip from "./BcChip.vue";

const props = defineProps({
  fixture: { type: Object, required: true },
  // "watch" / "backup" / "awaiting" from the calendar's day ranking; a club
  // page has no day to rank against and passes nothing.
  tag: { type: String, default: null },
});

const resOf = x => resultLetter(x.gf, x.ga);
const scoreOf = x => `${resultLetter(x.gf, x.ga)} ${x.gf}–${x.ga}`;

// The star sitting directly below says this already.
const displayReasons = x => fixtureReasons(x).filter(r => r !== "Marked must-watch");

/* A played match lives in the match log rather than the fixture list, so every
   write picks its store from that. Both are keyed the same way from here. */
function onStar() {
  const f = props.fixture;
  f.played ? toggleMatchStar(f.clubId, f.matchId) : toggleStar(f.id);
}
function onWatched() {
  const f = props.fixture;
  f.played ? toggleMatchWatched(f.clubId, f.matchId) : toggleWatched(f.id);
}

const editing = ref(false);
const draft = ref("");
const noteInput = ref(null);

function openNotes() {
  if (editing.value) { editing.value = false; return; }
  draft.value = props.fixture.notes || "";
  editing.value = true;
  nextTick(() => noteInput.value?.focus());
}

function saveNote() {
  const f = props.fixture;
  if (f.played) setMatchNotes(f.clubId, f.matchId, draft.value);
  else setFixtureNotes(f.id, draft.value);
  editing.value = false;
}
</script>

<template>
  <div class="fx-card"
       :class="{ 'is-watch': tag === 'watch', 'is-watched': fixture.watched,
                 'is-played': fixture.played }">
    <div v-if="fixture.opponentId" class="kit-pair">
      <span class="kit" :class="`kit-${fixture.clubId}`"></span><span class="kit" :class="`kit-${fixture.opponentId}`"></span>
    </div>
    <div v-else class="kit" :class="`kit-${fixture.clubId}`"></div>
    <div class="fx-body">
      <div class="fx-top">
        <span v-if="fixture.played" class="tag result" :class="`res-${resOf(fixture)}`">{{ scoreOf(fixture) }}</span>
        <span v-else-if="tag === 'awaiting'" class="tag awaiting">Awaiting result</span>
        <span v-else-if="tag === 'watch'" class="tag watch">Watch</span>
        <span v-else-if="tag === 'backup'" class="tag backup">Backup</span>
        <span class="fx-time">{{ fixture.time || (fixture.played ? "Played" : "Time TBD") }}</span>
      </div>
      <div class="fx-match">{{ matchupLabel(fixture) }}</div>
      <div class="fx-meta">
        <router-link v-if="compSlug(fixture.comp)" class="fx-comp is-link"
                     :to="`/competition/${compSlug(fixture.comp)}`">{{ fixture.comp }} ↗</router-link>
        <span v-else class="fx-comp">{{ fixture.comp }}</span>
        <!-- Where to watch is spent information once the game is gone. -->
        <BcChip v-if="!fixture.played" :comp="fixture.comp" />
      </div>
      <div v-if="displayReasons(fixture).length" class="reasons">{{ displayReasons(fixture).join(" · ") }}</div>
      <div v-if="fixture.notes" class="fx-note">“{{ fixture.notes }}”</div>
      <div class="fx-actions">
        <button class="btn star" :class="{ on: fixture.mustWatch }" :aria-pressed="fixture.mustWatch"
                title="Toggle must-watch" @click="onStar">{{ fixture.mustWatch ? "★" : "☆" }}</button>
        <button class="btn check" :class="{ on: fixture.watched }" :aria-pressed="fixture.watched"
                title="Did you watch it?" @click="onWatched">{{ fixture.watched ? "☑" : "☐" }} Watched</button>
        <button class="btn" title="Add a note" @click="openNotes">✎ Note</button>
      </div>
      <form v-if="editing" class="notes-form" @submit.prevent="saveNote">
        <input ref="noteInput" v-model="draft" placeholder="Your notes on this one">
        <button class="btn primary" type="submit">Save note</button>
        <button class="btn" type="button" @click="editing = false">Cancel</button>
      </form>
    </div>
  </div>
</template>
