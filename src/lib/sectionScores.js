import { SECTIONS } from "@/data/questions";

/** Hitung skor YA per section dari map jawaban { "1": "yes"|"no" }. */
export function buildSectionScores(answers) {
  const scores = {};

  for (const section of SECTIONS) {
    let yes = 0;
    for (const question of section.questions) {
      if (answers[String(question.id)] === "yes" || answers[question.id] === "yes") {
        yes += 1;
      }
    }
    scores[section.key] = {
      title: section.title,
      yes,
      total: section.questions.length,
    };
  }

  return scores;
}
