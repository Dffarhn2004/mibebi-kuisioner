"use client";

import HealthCheckForm from "@/components/HealthCheckForm";
import { QUESTIONNAIRE_TITLE } from "@/data/questions";

export default function HomePage() {
  return (
    <div className="health-check-page">
      <div className="health-check-shell">
        <header className="health-check-hero">
          <p className="brand-eyebrow">Mibebi</p>
          <h1 className="hero-title">{QUESTIONNAIRE_TITLE}</h1>
          <p className="hero-subtitle">
            Cek posisi bisnis resto Anda: isi data singkat, pilih fokus yang
            ingin dianalisis, lalu jawab beberapa pertanyaan. Hasilnya bisa
            diunduh sebagai PDF.
          </p>
          <ul className="hero-trust">
            <li>Gratis</li>
            <li>± 5 menit</li>
            <li>Hasil PDF siap unduh</li>
          </ul>
        </header>

        <HealthCheckForm />
      </div>
    </div>
  );
}
