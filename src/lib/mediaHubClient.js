/**
 * Client ke mibebi-media API untuk upload PDF analisis kuisioner.
 * Env: MEDIA_HUB_API_BASE_URL, MEDIA_API_SECRET
 */

function isConfigured() {
  const base = (process.env.MEDIA_HUB_API_BASE_URL || "").trim();
  const secret = (process.env.MEDIA_API_SECRET || "").trim();
  if (!base || !secret) return false;
  if (secret.startsWith("change-me")) return false;
  return true;
}

export function isMediaHubConfigured() {
  return isConfigured();
}

export function isMediaAssetRef(path) {
  return typeof path === "string" && path.trim().startsWith("media:");
}

export function mediaAssetIdFromPath(path) {
  if (!isMediaAssetRef(path)) return null;
  const id = path.trim().slice("media:".length).trim();
  return id || null;
}

/**
 * Upload buffer ke mibebi-media.
 * @returns {{ id, url, path: `media:${id}` }}
 */
export async function uploadToMediaHub({
  buffer,
  filename = "upload.pdf",
  mimeType = "application/pdf",
  folder,
}) {
  if (!isConfigured()) {
    throw new Error("Media hub tidak dikonfigurasi");
  }

  const base = process.env.MEDIA_HUB_API_BASE_URL.replace(/\/+$/, "");
  const form = new FormData();
  // Uint8Array agar Buffer Node/serverless terkirim benar ke FormData
  const bytes =
    buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const blob = new Blob([bytes], { type: mimeType });
  form.append("file", blob, filename);
  if (folder) form.append("folder", folder);

  const response = await fetch(`${base}/api/media/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.MEDIA_API_SECRET.trim()}`,
    },
    body: form,
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.success || !json?.data?.id) {
    const message =
      json?.error?.message ||
      json?.error ||
      `Media hub upload gagal (${response.status})`;
    throw new Error(
      typeof message === "string" ? message : "Media hub upload gagal",
    );
  }

  // PDF raw: pakai originalUrl Cloudinary agar langsung bisa diunduh
  const url = json.data.originalUrl || json.data.url;
  if (!url) {
    throw new Error("Media hub tidak mengembalikan URL file");
  }

  return {
    id: json.data.id,
    url,
    path: `media:${json.data.id}`,
  };
}

export async function deleteMediaHubAsset(assetId) {
  if (!isConfigured() || !assetId) return;
  const base = process.env.MEDIA_HUB_API_BASE_URL.replace(/\/+$/, "");
  await fetch(`${base}/api/media/assets/${assetId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${process.env.MEDIA_API_SECRET.trim()}`,
    },
  }).catch(() => {});
}
