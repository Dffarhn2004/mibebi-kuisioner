import { FEATURE_CATALOG } from "@/data/featureCatalog";

/**
 * Bangun skor sederhana untuk 1 kategori yang dipilih.
 * answers: { [questionId]: "yes"|"no"|string }
 */
export function buildCategoryScore({ category, questions, answers }) {
  const total = questions.length;
  let yes = 0;
  let answered = 0;

  for (const question of questions) {
    const value = answers[String(question.id)] ?? answers[question.id];
    if (value == null || value === "") continue;
    answered += 1;
    if (value === "yes") yes += 1;
  }

  return {
    [category.slug || category.id]: {
      title: category.title,
      yes,
      answered,
      total,
      answer_type: category.answer_type,
    },
  };
}

/** Siapkan payload pertanyaan untuk edge function analysis-business-posisi. */
export function buildYesQuestionsPayload({
  category,
  questions,
  answers,
}) {
  const answerType = category.answer_type || "yes_no";

  return questions
    .map((q) => {
      const value = answers[String(q.id)] ?? answers[q.id];
      if (value == null || value === "") return null;

      if (answerType === "yes_no" && value !== "yes") return null;

      const candidateFeatures = (Array.isArray(q.feature_keys) ? q.feature_keys : [])
        .map((key) => FEATURE_CATALOG.find((f) => f.key === key)?.name)
        .filter(Boolean);

      return {
        id: q.id,
        section: category.title,
        text: q.question_text,
        answer: value,
        candidate_features: candidateFeatures,
      };
    })
    .filter(Boolean);
}
