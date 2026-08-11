import { ALL_QUESTIONS, SECTIONS } from "@/data/questions";
import {
  FEATURE_CATALOG,
  QUESTION_FEATURE_MAP,
} from "@/data/featureCatalog";
import { MIBEBI_PRODUCT_CONTEXT } from "@/data/mibebiProductContext";

function buildYesQuestions(yesIds) {
  const byId = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

  return yesIds
    .map((id) => {
      const q = byId.get(id);
      if (!q) return null;
      const section = SECTIONS.find((s) =>
        s.questions.some((item) => item.id === id),
      );
      const sectionLabel =
        section?.key === "extra"
          ? section.title
          : `${section?.key}. ${section?.title}`;
      const candidateFeatures = (QUESTION_FEATURE_MAP[id] || [])
        .map((key) => FEATURE_CATALOG.find((f) => f.key === key)?.name)
        .filter(Boolean);

      return {
        id,
        section: sectionLabel,
        text: q.text,
        candidate_features: candidateFeatures,
      };
    })
    .filter(Boolean);
}

/**
 * Panggil edge function analysis-business-posisi (Gemini round-robin seperti scan menu AI).
 */
export async function analysisBusinessPosisi({
  restoName,
  ownerName,
  city,
  yesIds,
  sectionScores,
  submissionId,
}) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const key = serviceKey || anonKey;

  if (!supabaseUrl || !key) {
    throw new Error(
      "Supabase env belum lengkap untuk memanggil analysis-business-posisi.",
    );
  }

  const response = await fetch(
    `${supabaseUrl}/functions/v1/analysis-business-posisi`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
        apikey: key,
      },
      body: JSON.stringify({
        resto_name: restoName,
        owner_name: ownerName,
        city: city || "",
        submission_id: submissionId || null,
        yes_questions: buildYesQuestions(yesIds),
        section_scores: sectionScores,
        feature_catalog: FEATURE_CATALOG.map((f) => ({
          name: f.name,
          description: f.description,
        })),
        product_context: MIBEBI_PRODUCT_CONTEXT,
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(
      payload?.error ||
        `Edge function analysis-business-posisi gagal (HTTP ${response.status}).`,
    );
  }

  return {
    analysis: payload.data?.analysis || null,
    analysisText: payload.data?.analysis_text || "",
    keyId: payload.data?.key_id ?? null,
  };
}
