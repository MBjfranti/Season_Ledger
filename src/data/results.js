// Periodic results drop. When results are pulled in, entries are added here and
// the app merges them on next load: the matching fixture (by clubId + date)
// becomes a logged match, keeping any watched flag and notes. Entries whose
// result is already logged are ignored, so this list only ever grows.
//
// Shape: { clubId, date: "YYYY-MM-DD", gf, ga }  — gf/ga from that club's view.
// Optional (only needed if no fixture exists for that date):
//   opponent, comp, venue ("H"/"A"/"N")

export const RESULTS = [];
