import { NextResponse } from "next/server";
import { TOTAL_QUESTIONS } from "@/data/questions";
import { analysisBusinessPosisi } from "@/lib/analysisBusinessPosisi";
import { buildSectionScores } from "@/lib/sectionScores";
import { createServiceClient } from "@/lib/supabaseServer";

export const maxDuration = 60;

function normalizeAnswers(rawAnswers) {
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) {
    return null;
  }

  const answers = {};
  for (let id = 1; id <= TOTAL_QUESTIONS; id += 1) {
    const value = rawAnswers[String(id)] ?? rawAnswers[id];
    if (value !== "yes" && value !== "no") {
      return null;
    }
    answers[String(id)] = value;
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
    const answers = normalizeAnswers(body?.answers);

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

    if (!answers) {
      return NextResponse.json(
        {
          success: false,
          error: `Semua ${TOTAL_QUESTIONS} pertanyaan harus dijawab YA atau TIDAK.`,
        },
        { status: 400 },
      );
    }

    const yesIds = Object.entries(answers)
      .filter(([, value]) => value === "yes")
      .map(([id]) => Number(id))
      .sort((a, b) => a - b);
    const sectionScores = buildSectionScores(answers);

    const row = {
      resto_name: restoName,
      owner_name: ownerName,
      whatsapp,
      city: city || null,
      answers,
      yes_ids: yesIds,
      yes_count: yesIds.length,
      total_questions: TOTAL_QUESTIONS,
      section_scores: sectionScores,
      status: "pending",
      metadata: {
        source: "mibebi-kuisioner",
        user_agent: request.headers.get("user-agent") || null,
      },
    };

    const supabase = createServiceClient();
    const { data: saved, error } = await supabase
      .from("business_health_check_submissions")
      .insert(row)
      .select(
        "id, created_at, resto_name, owner_name, whatsapp, city, yes_count, total_questions, status",
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
        yesIds,
        sectionScores,
        submissionId: saved.id,
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
          "id, created_at, resto_name, owner_name, whatsapp, city, yes_count, total_questions, status, analysis, analysis_text, analyzed_at",
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
