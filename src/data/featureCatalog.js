/** Katalog fitur Mibebi untuk mapping jawaban YA → rekomendasi AI */

export const FEATURE_CATALOG = [
  {
    key: "upsell_pairing",
    name: "Menu Pairing / Upselling",
    description:
      "Saran menu tambahan otomatis agar pelanggan tidak hanya beli menu utama.",
  },
  {
    key: "crm_points",
    name: "CRM Pelanggan & Poin Membership",
    description:
      "Database pelanggan, poin, dan membership untuk mendorong pembelian ulang.",
  },
  {
    key: "reminder",
    name: "Reminder & Campaign WhatsApp",
    description:
      "Menghubungi pelanggan lama/inactive dan menyebarkan promo via WhatsApp.",
  },
  {
    key: "pesan_ai",
    name: "Pesan AI / Pesan Hati",
    description:
      "Pesan personal/hangat setelah pembayaran di struk atau WhatsApp.",
  },
  {
    key: "promo",
    name: "Promo & Diskon Kasir",
    description: "Kelola program diskon langsung dari sistem kasir.",
  },
  {
    key: "qr_meja",
    name: "QR Meja & Self-Order",
    description:
      "Pelanggan pesan/bayar dari meja; mengurangi antrean kasir di jam sibuk.",
  },
  {
    key: "website_toko",
    name: "Website Toko",
    description:
      "Kanal order/branding sendiri untuk mengurangi ketergantungan OTA.",
  },
  {
    key: "dapur",
    name: "Display Dapur",
    description: "Antrian dapur real-time agar pesanan lebih rapi dan akurat.",
  },
  {
    key: "lastbite",
    name: "LastBite",
    description:
      "Flash sale leftover menjelang tutup untuk mengurangi food waste.",
  },
  {
    key: "bi",
    name: "Business Intelligence / Dashboard Owner",
    description:
      "Analisis penjualan, menu laris, performa outlet, dan ringkasan rutin.",
  },
  {
    key: "pos",
    name: "POS Kasir Mibebi",
    description: "Kasir sederhana untuk staf, transaksi, dan operasional harian.",
  },
  {
    key: "scan_menu_ai",
    name: "Scan Menu AI",
    description: "Input ratusan menu lebih cepat dari foto/file.",
  },
  {
    key: "qris",
    name: "Pencatatan QRIS",
    description: "Pencatatan transaksi QRIS yang lebih optimal di kasir.",
  },
  {
    key: "multi_outlet",
    name: "Multi-Outlet / Brand Dashboard",
    description: "Pantau beberapa cabang secara terpusat.",
  },
  {
    key: "academy_support",
    name: "Academy & Pendampingan",
    description: "Onboarding dan pendampingan saat mulai memakai sistem baru.",
  },
  {
    key: "revenue_share",
    name: "Skema Biaya Ringan / Bagi Hasil",
    description:
      "Model biaya yang lebih ringan agar naik penjualan tanpa beban lisensi berat.",
  },
];

/** Mapping question id → feature keys yang relevan jika jawaban YA */
export const QUESTION_FEATURE_MAP = {
  1: ["upsell_pairing", "promo", "qr_meja"],
  2: ["upsell_pairing"],
  3: ["crm_points", "reminder"],
  4: ["crm_points", "reminder", "promo"],
  5: ["crm_points"],
  6: ["pesan_ai"],
  7: ["promo"],
  8: ["reminder", "crm_points"],
  9: ["reminder"],
  10: ["qr_meja", "website_toko"],
  11: ["qr_meja", "website_toko"],
  12: ["qr_meja"],
  13: ["qr_meja"],
  14: ["dapur"],
  15: ["lastbite"],
  16: ["lastbite"],
  17: ["bi"],
  18: ["bi"],
  19: ["bi"],
  20: ["multi_outlet", "bi"],
  21: ["pos"],
  22: ["pos", "academy_support"],
  23: ["scan_menu_ai"],
  24: ["revenue_share", "academy_support"],
  25: ["revenue_share", "academy_support"],
  26: ["qris"],
  27: ["revenue_share"],
  28: ["revenue_share"],
  29: ["academy_support", "revenue_share"],
  30: ["academy_support"],
  31: ["multi_outlet", "bi"],
  32: ["pos", "qr_meja", "crm_points", "promo", "bi"],
  33: ["revenue_share", "qr_meja", "upsell_pairing", "reminder", "lastbite"],
};
