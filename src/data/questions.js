/** Business Health Check Resto — 33 pertanyaan YA/TIDAK */

export const QUESTIONNAIRE_TITLE = "Business Health Check Resto";

export const QUESTIONNAIRE_FOOTER =
  "Jawaban Anda akan digunakan untuk membantu mengidentifikasi peluang dan tantangan dalam pengelolaan bisnis resto Anda.";

export const SECTIONS = [
  {
    key: "A",
    title: "Penjualan & Pelanggan",
    questions: [
      {
        id: 1,
        text: "Apakah Anda merasa masih ada potensi omzet yang belum maksimal dari pelanggan yang sudah datang ke resto?",
      },
      {
        id: 2,
        text: "Apakah pelanggan Anda sering hanya membeli menu utama tanpa membeli menu tambahan?",
      },
      {
        id: 3,
        text: "Apakah Anda kesulitan mengetahui pelanggan yang sudah lama tidak kembali ke resto?",
      },
      {
        id: 4,
        text: "Apakah Anda merasa jumlah pelanggan yang kembali membeli masih rendah?",
      },
      {
        id: 5,
        text: "Apakah saat ini Anda belum memiliki program membership atau poin untuk mendorong pelanggan datang kembali?",
      },
      {
        id: 6,
        text: "Apakah Anda belum memiliki cara yang efektif untuk memberikan pesan atau pengalaman personal kepada pelanggan setelah mereka melakukan pembayaran?",
      },
    ],
  },
  {
    key: "B",
    title: "Promosi & Marketing",
    questions: [
      {
        id: 7,
        text: "Apakah Anda belum memiliki program diskon yang dapat dikelola langsung dari sistem kasir?",
      },
      {
        id: 8,
        text: "Apakah Anda pernah membuat promo tetapi informasi promo tersebut tidak menjangkau sebagian besar pelanggan Anda?",
      },
      {
        id: 9,
        text: "Apakah Anda belum memiliki cara yang mudah untuk mengirimkan informasi promo kepada pelanggan melalui WhatsApp?",
      },
      {
        id: 10,
        text: "Apakah Anda merasa masih terlalu bergantung pada platform pihak ketiga seperti ShopeeFood untuk mendapatkan pesanan online?",
      },
      {
        id: 11,
        text: "Apakah biaya admin atau komisi platform pemesanan online terasa cukup besar bagi bisnis Anda?",
      },
    ],
  },
  {
    key: "C",
    title: "Operasional Resto",
    questions: [
      {
        id: 12,
        text: "Apakah pelanggan pernah harus menunggu cukup lama untuk melakukan pemesanan atau melakukan tambahan pesanan?",
      },
      {
        id: 13,
        text: "Apakah resto Anda pernah mengalami antrean pelanggan yang cukup panjang pada jam sibuk?",
      },
      {
        id: 14,
        text: "Apakah proses pemesanan dan antrean di dapur masih sulit dipantau?",
      },
      {
        id: 15,
        text: "Apakah Anda pernah memiliki stok makanan yang tidak habis terjual dan akhirnya harus dibuang?",
      },
      {
        id: 16,
        text: "Apakah Anda merasa kehilangan potensi pendapatan dari makanan atau produk yang tersisa menjelang resto tutup?",
      },
    ],
  },
  {
    key: "D",
    title: "Data & Manajemen",
    questions: [
      {
        id: 17,
        text: "Apakah Anda kesulitan mendapatkan informasi performa resto tanpa harus membuka aplikasi dan memeriksa laporan secara manual?",
      },
      {
        id: 18,
        text: "Apakah Anda belum mendapatkan ringkasan performa penjualan secara rutin?",
      },
      {
        id: 19,
        text: "Apakah Anda belum memiliki analisis penjualan yang membantu mengetahui menu atau produk mana yang paling banyak menghasilkan penjualan?",
      },
      {
        id: 20,
        text: "Jika Anda memiliki lebih dari satu outlet, apakah Anda merasa kesulitan memantau performa setiap outlet secara terpusat?",
      },
    ],
  },
  {
    key: "E",
    title: "Sistem Kasir & Teknologi",
    questions: [
      {
        id: 21,
        text: "Apakah aplikasi kasir yang Anda gunakan saat ini terasa rumit bagi Anda atau karyawan?",
      },
      {
        id: 22,
        text: "Apakah karyawan baru membutuhkan waktu yang cukup lama untuk belajar menggunakan aplikasi kasir?",
      },
      {
        id: 23,
        text: "Apakah Anda merasa proses memasukkan menu dan harga ketika menggunakan aplikasi POS baru cukup merepotkan?",
      },
      {
        id: 24,
        text: "Apakah Anda masih memiliki masa berlangganan pada aplikasi POS yang sedang digunakan?",
      },
      {
        id: 25,
        text: "Apakah Anda pernah menunda menggunakan aplikasi baru karena masih sayang dengan sisa masa berlangganan aplikasi sebelumnya?",
      },
      {
        id: 26,
        text: "Apakah aplikasi kasir yang Anda gunakan saat ini belum mendukung pencatatan transaksi QRIS secara optimal?",
      },
    ],
  },
  {
    key: "F",
    title: "Biaya & Risiko",
    questions: [
      {
        id: 27,
        text: "Apakah biaya berlangganan aplikasi kasir saat ini terasa cukup membebani bisnis Anda?",
      },
      {
        id: 28,
        text: "Apakah Anda merasa biaya aplikasi kasir yang Anda bayar belum sebanding dengan manfaat yang Anda dapatkan?",
      },
      {
        id: 29,
        text: "Apakah Anda khawatir sudah membayar aplikasi tetapi ternyata aplikasi tersebut tidak memberikan manfaat yang sesuai harapan?",
      },
      {
        id: 30,
        text: "Apakah Anda merasa membutuhkan pendampingan ketika pertama kali menggunakan aplikasi kasir baru, bukan hanya diberikan aplikasi lalu harus belajar sendiri?",
      },
    ],
  },
  {
    key: "extra",
    title: "Pertanyaan Tambahan",
    questions: [
      {
        id: 31,
        text: "Apakah Anda memiliki rencana membuka outlet baru atau mengembangkan resto menjadi beberapa cabang?",
      },
      {
        id: 32,
        text: "Apakah Anda saat ini menggunakan lebih dari satu aplikasi untuk mengelola operasional, penjualan, pelanggan, atau promosi resto?",
      },
      {
        id: 33,
        text: "Apakah Anda ingin memiliki sistem yang dapat membantu meningkatkan penjualan tanpa harus menambah banyak biaya operasional?",
      },
    ],
  },
];

export const ALL_QUESTIONS = SECTIONS.flatMap((section) => section.questions);

export const TOTAL_QUESTIONS = ALL_QUESTIONS.length;
