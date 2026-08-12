import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";

/** GET — detail kategori + soal aktif */
export async function GET(_request, { params }) {
  try {
    const { id } = await params;
    const categoryId = String(id || "").trim();

    if (!categoryId) {
      return NextResponse.json(
        { success: false, error: "ID kategori wajib diisi." },
        { status: 400 },
      );
    }

    const supabase = createServiceClient();

    const { data: category, error: catError } = await supabase
      .from("kuisioner_categories")
      .select("id, title, slug, description, answer_type, sort_order, is_active")
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

    return NextResponse.json({
      success: true,
      data: {
        category,
        questions: questions || [],
      },
    });
  } catch (error) {
    console.error("GET /api/categories/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat soal." },
      { status: 500 },
    );
  }
}
