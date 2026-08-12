import { FEATURE_CATALOG } from "@/data/featureCatalog";
import { MIBEBI_PRODUCT_CONTEXT } from "@/data/mibebiProductContext";

/**
 * Panggil edge function analysis-business-posisi (Gemini round-robin seperti scan menu AI).
 */
export async function analysisBusinessPosisi({
  restoName,
  ownerName,
  city,
  yesQuestions,
  sectionScores,
  submissionId,
  categoryTitle,
  categoryPrompt,
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
        category_title: categoryTitle || "",
        category_prompt: categoryPrompt || "",
        yes_questions: yesQuestions || [],
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
