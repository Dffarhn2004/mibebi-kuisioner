import { NextResponse } from "next/server";
import { analysisBusinessPosisi } from "@/lib/analysisBusinessPosisi";
import {
  buildCategoryScore,
  buildYesQuestionsPayload,
} from "@/lib/sectionScores";
import { createServiceClient } from "@/lib/supabaseServer";

export const maxDuration = 60;

function isValidAnswer(answerType, value) {
  if (answerType === "yes_no") return value === "yes" || value === "no";
  if (answerType === "scale_1_5") {
    return ["1", "2", "3", "4", "5"].includes(String(value));
  }
  if (answerType === "text") {
    return typeof value === "string" && value.trim().length > 0;
  }
  return false;
}

function normalizeAnswers(rawAnswers, questions, answerType) {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    return null;
  }

  const answers = {};
  for (const question of questions) {
    const value = rawAnswers[String(question.id)] ?? rawAnswers[question.id];
    if (!isValidAnswer(answerType, value)) {
      return null;
    }
    answers[String(question.id)] =
      answerType === "text" ? String(value).trim() : String(value);
  }
  return answers;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const restoName = String(body?.restoName || "").trim();
    const ownerName = String(body?.ownerName || "").trim();
    const whatsapp = String(body?.whatsapp || "").trim();
    const city = String(body?.city || "").trim();
    const categoryId = String(body?.categoryId || "").trim();

    if (!restoName || !ownerName || !whatsapp) {
      return NextResponse.json(
        { success: false, error: "Nama resto, PIC, dan WhatsApp wajib diisi." },
        { status: 400 },
      );
    }

    if (!/^[0-9+\s()-]{8,20}$/.test(whatsapp)) {
      return NextResponse.json(
        { success: false, error: "Format nomor WhatsApp tidak valid." },
        { status: 400 },
      );
    }

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "Kategori kuisioner wajib dipilih." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: category, error: catError } = await supabase
      .from("kuisioner_categories")
      .select("id, title, slug, description, answer_type, is_active, analysis_prompt")
      .eq("id", categoryId)
      .eq("is_active", true)
      .maybeSingle();

    if (catError) {
      return NextResponse.json(
        { success: false, error: catError.message },
        { status: 500 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Kategori tidak ditemukan atau nonaktif." },
        { status: 404 },
      );
    }

    const { data: questions, error: qError } = await supabase
      .from("kuisioner_questions")
      .select("id, question_text, sort_order, feature_keys")
      .eq("category_id", categoryId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (qError) {
      return NextResponse.json(
        { success: false, error: qError.message },
        { status: 500 },
      );
    }

    if (!questions?.length) {
      return NextResponse.json(
        { success: false, error: "Kategori ini belum punya soal aktif." },
        { status: 400 },
      );
    }

    const answers = normalizeAnswers(
      body?.answers,
      questions,
      category.answer_type,
    );

    if (!answers) {
      return NextResponse.json(
        {
          success: false,
          error: `Semua ${questions.length} pertanyaan harus dijawab.`,
        },
        { status: 400 },
      );
    }

    const yesIds =
      category.answer_type === "yes_no"
        ? Object.entries(answers)
            .filter(([, value]) => value === "yes")
            .map(([id]) => id)
        : Object.keys(answers);

    const sectionScores = buildCategoryScore({ category, questions, answers });
    const yesQuestions = buildYesQuestionsPayload({
      category,
      questions,
      answers,
    });

    const row = {
      resto_name: restoName,
      owner_name: ownerName,
      whatsapp,
      city: city || null,
      category_id: category.id,
      answers,
      yes_ids: yesIds,
      yes_count: yesIds.length,
      total_questions: questions.length,
      section_scores: sectionScores,
      status: "pending",
      metadata: {
        source: "mibebi-kuisioner",
        category_title: category.title,
        category_slug: category.slug,
        answer_type: category.answer_type,
        has_custom_prompt: Boolean(
          category.analysis_prompt && String(category.analysis_prompt).trim(),
        ),
        user_agent: request.headers.get("user-agent") || null,
      },
    };

    const { data: saved, error } = await supabase
      .from("business_health_check_submissions")
      .insert(row)
      .select(
        "id, created_at, resto_name, owner_name, whatsapp, city, category_id, yes_count, total_questions, status",
      )
      .single();

    if (error) {
      console.error("Gagal insert business_health_check_submissions:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Gagal menyimpan ke database." },
        { status: 500 },
      );
    }

    let analysis = null;
    let analysisText = null;
    let analyzeError = null;

    try {
      const result = await analysisBusinessPosisi({
        restoName,
        ownerName,
        city,
        yesQuestions,
        sectionScores,
        submissionId: saved.id,
        categoryTitle: category.title,
        categoryPrompt: category.analysis_prompt || "",
      });
      analysis = result.analysis;
      analysisText = result.analysisText;

      const { data: updated, error: updateError } = await supabase
        .from("business_health_check_submissions")
        .update({
          analysis,
          analysis_text: analysisText,
          status: "analyzed",
          analyzed_at: new Date().toISOString(),
          metadata: {
            ...row.metadata,
            ai_provider: "gemini",
            ai_edge_function: "analysis-business-posisi",
            ai_key_id: result.keyId,
          },
        })
        .eq("id", saved.id)
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
      analyzeError = aiError.message || "Gagal menganalisis dengan AI.";
      console.error("analysis-business-posisi error:", aiError);

      await supabase
        .from("business_health_check_submissions")
        .update({
          metadata: {
            ...row.metadata,
            ai_provider: "gemini",
            ai_edge_function: "analysis-business-posisi",
            analyze_error: analyzeError,
          },
        })
        .eq("id", saved.id);

      return NextResponse.json({
        success: true,
        data: {
          ...saved,
          analysis: null,
          analysis_text: null,
        },
        analyzed: false,
        analyzeError,
      });
    }
  } catch (error) {
    console.error("POST /api/submissions error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Terjadi kesalahan server." },
      { status: 500 },
    );
  }
}
