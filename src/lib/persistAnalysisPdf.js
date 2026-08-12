import { createServiceClient } from "@/lib/supabaseServer";
import {
  buildAnalysisPdfBuffer,
  buildAnalysisPdfFilename,
} from "@/lib/downloadAnalysisPdf";
import {
  deleteMediaHubAsset,
  isMediaHubConfigured,
  mediaAssetIdFromPath,
  uploadToMediaHub,
} from "@/lib/mediaHubClient";

async function uploadPdfToSupabaseStorage({ buffer, filename, submissionId }) {
  const supabase = createServiceClient();
  const path = `${submissionId}/${Date.now()}-${filename}`;

  const { error } = await supabase.storage
    .from("kuisioner-pdfs")
    .upload(path, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });

  if (error) {
    throw new Error(error.message || "Gagal upload PDF ke storage.");
  }

  const { data } = supabase.storage.from("kuisioner-pdfs").getPublicUrl(path);
  return {
    url: data.publicUrl,
    path,
    mediaId: null,
  };
}

async function removePreviousPdf({ pdfPath, pdfMediaId }) {
  const mediaId = pdfMediaId || mediaAssetIdFromPath(pdfPath);
  if (mediaId) {
    await deleteMediaHubAsset(mediaId);
    return;
  }

  if (pdfPath && !String(pdfPath).startsWith("media:")) {
    const supabase = createServiceClient();
    await supabase.storage.from("kuisioner-pdfs").remove([pdfPath]).catch(() => {});
  }
}

/**
 * Generate + upload PDF hanya setelah analisis sukses.
 * PDF lama diganti (analisis ulang memakai yang terakhir).
 */
export async function persistSuccessfulAnalysisPdf({
  submission,
  analysis,
  categoryTitle,
}) {
  const filename = buildAnalysisPdfFilename(submission.resto_name);
  const buffer = buildAnalysisPdfBuffer({
    restoName: submission.resto_name,
    ownerName: submission.owner_name,
    city: submission.city,
    whatsapp: submission.whatsapp,
    yesCount: submission.yes_count,
    totalQuestions: submission.total_questions,
    analysis,
    createdAt: submission.analyzed_at || new Date().toISOString(),
    categoryTitle:
      categoryTitle ||
      submission.category_title_snapshot ||
      submission.metadata?.category_title ||
      "",
  });

  await removePreviousPdf({
    pdfPath: submission.pdf_path,
    pdfMediaId: submission.pdf_media_id,
  });

  let uploaded;
  if (isMediaHubConfigured()) {
    try {
      const media = await uploadToMediaHub({
        buffer,
        filename,
        mimeType: "application/pdf",
        folder: `kuisioner/${submission.id}`,
      });
      uploaded = {
        url: media.url,
        path: media.path,
        mediaId: media.id,
      };
    } catch (error) {
      console.error(
        "Media hub PDF upload gagal, fallback ke Supabase Storage:",
        error,
      );
      uploaded = await uploadPdfToSupabaseStorage({
        buffer,
        filename,
        submissionId: submission.id,
      });
    }
  } else {
    uploaded = await uploadPdfToSupabaseStorage({
      buffer,
      filename,
      submissionId: submission.id,
    });
  }

  return {
    pdf_url: uploaded.url,
    pdf_path: uploaded.path,
    pdf_media_id: uploaded.mediaId,
  };
}

/** Bangun snapshot soal + jawaban agar aman jika soal diganti. */
export function buildQuestionsSnapshot({ category, questions, answers }) {
  return (questions || []).map((q, index) => ({
    id: q.id,
    sort_order: q.sort_order ?? index + 1,
    question_text: q.question_text,
    feature_keys: Array.isArray(q.feature_keys) ? q.feature_keys : [],
    answer: answers[String(q.id)] ?? answers[q.id] ?? null,
    answer_type: category?.answer_type || "yes_no",
    category_id: category?.id || null,
    category_title: category?.title || null,
  }));
}
