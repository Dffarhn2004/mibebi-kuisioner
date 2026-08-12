import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabaseServer";

/** GET — daftar kategori aktif untuk dipilih di halaman kuisioner */
export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("kuisioner_categories")
      .select(
        "id, title, slug, description, answer_type, sort_order, kuisioner_questions(count)",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    const categories = (data || [])
      .map((row) => {
        const countRaw = row.kuisioner_questions;
        const questions_count = Array.isArray(countRaw)
          ? Number(countRaw[0]?.count ?? 0)
          : 0;
        const { kuisioner_questions: _, ...rest } = row;
        return { ...rest, questions_count };
      })
      .filter((row) => row.questions_count > 0);

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error("GET /api/categories error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memuat kategori." },
      { status: 500 },
    );
  }
}
