import { NextResponse } from "next/server";
import { analysisBusinessPosisi } from "@/lib/analysisBusinessPosisi";
import { FEATURE_CATALOG } from "@/data/featureCatalog";
import { persistSuccessfulAnalysisPdf } from "@/lib/persistAnalysisPdf";
import { createServiceClient } from "@/lib/supabaseServer";

export const maxDuration = 60;

function buildYesQuestionsFromSnapshot(snapshot, categoryTitle) {
  if (!Array.isArray(snapshot) || snapshot.length === 0) return [];

  return snapshot
    .map((item) => {
      const answer = item?.answer;
      const answerType = item?.answer_type || "yes_no";
      if (answer == null || answer === "") return null;
      if (answerType === "yes_no" && answer !== "yes") return null;

      const candidateFeatures = (
        Array.isArray(item.feature_keys) ? item.feature_keys : []
      )
        .map((key) => FEATURE_CATALOG.find((f) => f.key === key)?.name)
        .filter(Boolean);

      return {
        id: item.id,
        section: item.category_title || categoryTitle || "-",
        text: item.question_text,
        answer,
        candidate_features: candidateFeatures,
      };
    })
    .filter(Boolean);
}

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
        "id, created_at, resto_name, owner_name, whatsapp, city, category_id, category_title_snapshot, answers, questions_snapshot, yes_ids, yes_count, total_questions, section_scores, status, metadata, analysis, analysis_text, analyzed_at, pdf_url, pdf_path, pdf_media_id",
      )
      .eq("id", submissionId)
      .single();

    if (error || !submission) {
      return NextResponse.json(
        { success: false, error: "Submission tidak ditemukan." },
        { status: 404 },
      );
    }

    let categoryTitle =
      submission.category_title_snapshot ||
      submission.metadata?.category_title ||
      "";
    let categoryPrompt = "";
    let yesQuestions = buildYesQuestionsFromSnapshot(
      submission.questions_snapshot,
      categoryTitle,
    );
    const sectionScores = submission.section_scores || {};

    if (submission.category_id) {
      const { data: category } = await supabase
        .from("kuisioner_categories")
        .select("id, title, slug, answer_type, analysis_prompt")
        .eq("id", submission.category_id)
        .maybeSingle();

      if (category) {
        categoryTitle = category.title || categoryTitle;
        categoryPrompt = category.analysis_prompt || "";
      }
    }

    if (!yesQuestions.length) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Snapshot jawaban kosong. Tidak bisa analisis ulang tanpa data soal.",
        },
        { status: 400 },
      );
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
      const analyzedAt = new Date().toISOString();

      let pdfFields = {
        pdf_url: submission.pdf_url || null,
        pdf_path: submission.pdf_path || null,
        pdf_media_id: submission.pdf_media_id || null,
      };
      let pdfMeta = {
        pdf_storage_backend: previousMeta.pdf_storage_backend || null,
        media_hub_error: null,
      };
      let pdfError = null;

      try {
        const persisted = await persistSuccessfulAnalysisPdf({
          submission: {
            ...submission,
            analyzed_at: analyzedAt,
            category_title_snapshot: categoryTitle,
          },
          analysis: result.analysis,
          categoryTitle,
        });
        pdfFields = {
          pdf_url: persisted.pdf_url,
          pdf_path: persisted.pdf_path,
          pdf_media_id: persisted.pdf_media_id,
        };
        pdfMeta = {
          pdf_storage_backend: persisted.storage_backend || null,
          media_hub_error: persisted.media_hub_error || null,
        };
      } catch (err) {
        pdfError = err.message || "Gagal menyimpan PDF.";
        console.error("persistSuccessfulAnalysisPdf (reanalyze) error:", err);
      }

      const { data: updated, error: updateError } = await supabase
        .from("business_health_check_submissions")
        .update({
          analysis: result.analysis,
          analysis_text: result.analysisText,
          status: "analyzed",
          analyzed_at: analyzedAt,
          ...pdfFields,
          metadata: {
            ...previousMeta,
            ai_provider: "gemini",
            ai_edge_function: "analysis-business-posisi",
            ai_key_id: result.keyId,
            analyze_error: null,
            pdf_error: pdfError,
            reanalyzed_at: analyzedAt,
            ...pdfMeta,
          },
        })
        .eq("id", submission.id)
        .select(
          "id, created_at, resto_name, owner_name, whatsapp, city, category_id, category_title_snapshot, yes_count, total_questions, status, analysis, analysis_text, analyzed_at, pdf_url, pdf_path, pdf_media_id",
        )
        .single();

      if (updateError) {
        throw updateError;
      }

      return NextResponse.json({
        success: true,
        data: updated,
        analyzed: true,
        pdfSaved: Boolean(updated?.pdf_url),
        pdfError,
      });
    } catch (aiError) {
      const analyzeError = aiError.message || "Gagal menganalisis dengan AI.";
      console.error("Re-analyze analysis-business-posisi error:", aiError);

      const previousMeta =
        submission.metadata && typeof submission.metadata === "object"
          ? submission.metadata
          : {};

      // Gagal analisis ulang: jangan hapus analysis/PDF lama yang sukses
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
          data: submission,
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
