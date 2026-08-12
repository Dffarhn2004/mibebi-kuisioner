import { NextResponse } from "next/server";
import { analysisBusinessPosisi } from "@/lib/analysisBusinessPosisi";
import { buildYesQuestionsPayload } from "@/lib/sectionScores";
import { createServiceClient } from "@/lib/supabaseServer";

export const maxDuration = 60;

export async function POST(_request, { params }) {
  try {
    const { id } = await params;
    const submissionId = String(id || "").trim();

    if (!submissionId) {
      return NextResponse.json(
        { success: false, error: "ID submission wajib diisi." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();
    const { data: submission, error } = await supabase
      .from("business_health_check_submissions")
      .select(
        "id, created_at, resto_name, owner_name, whatsapp, city, category_id, answers, yes_ids, yes_count, total_questions, section_scores, status, metadata, analysis, analysis_text, analyzed_at",
      )
      .eq("id", submissionId)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission tidak ditemukan." },
        { status: 404 },
      );
    }

    const answers = submission.answers || {};
    let yesQuestions = [];
    let sectionScores = submission.section_scores || {};
    let categoryTitle = submission.metadata?.category_title || "";
    let categoryPrompt = "";

    if (submission.category_id) {
      const { data: category } = await supabase
        .from("kuisioner_categories")
        .select("id, title, slug, answer_type, analysis_prompt")
        .eq("id", submission.category_id)
        .maybeSingle();

      const { data: questions } = await supabase
        .from("kuisioner_questions")
        .select("id, question_text, sort_order, feature_keys")
        .eq("category_id", submission.category_id)
        .order("sort_order", { ascending: true });

      if (category && questions?.length) {
        categoryTitle = category.title || categoryTitle;
        categoryPrompt = category.analysis_prompt || "";
        yesQuestions = buildYesQuestionsPayload({
          category,
          questions,
          answers,
        });
      }
    }

    try {
      const result = await analysisBusinessPosisi({
        restoName: submission.resto_name,
        ownerName: submission.owner_name,
        city: submission.city || "",
        yesQuestions,
        sectionScores,
        submissionId: submission.id,
        categoryTitle,
        categoryPrompt,
      });

      const previousMeta =
        submission.metadata && typeof submission.metadata === "object"
          ? submission.metadata
          : {};

      const { data: updated, error: updateError } = await supabase
        .from("business_health_check_submissions")
        .update({
          analysis: result.analysis,
          analysis_text: result.analysisText,
          status: "analyzed",
          analyzed_at: new Date().toISOString(),
          metadata: {
            ...previousMeta,
            ai_provider: "gemini",
            ai_edge_function: "analysis-business-posisi",
            ai_key_id: result.keyId,
            analyze_error: null,
            reanalyzed_at: new Date().toISOString(),
          },
        })
        .eq("id", submission.id)
        .select(
          "id, created_at, resto_name, owner_name, whatsapp, city, category_id, yes_count, total_questions, status, analysis, analysis_text, analyzed_at",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        data: updated,
        analyzed: true,
      });
    } catch (aiError) {
      const analyzeError = aiError.message || "Gagal menganalisis dengan AI.";
      console.error("Re-analyze analysis-business-posisi error:", aiError);

      const previousMeta =
        submission.metadata && typeof submission.metadata === "object"
          ? submission.metadata
          : {};

      await supabase
        .from("business_health_check_submissions")
        .update({
          metadata: {
            ...previousMeta,
            ai_provider: "gemini",
            ai_edge_function: "analysis-business-posisi",
            analyze_error: analyzeError,
            reanalyze_failed_at: new Date().toISOString(),
          },
        })
        .eq("id", submission.id);

      return NextResponse.json(
        {
          success: false,
          analyzed: false,
          analyzeError,
          error: analyzeError,
          data: {
            ...submission,
            analysis: null,
            analysis_text: null,
          },
        },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("POST /api/submissions/[id]/analyze error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
