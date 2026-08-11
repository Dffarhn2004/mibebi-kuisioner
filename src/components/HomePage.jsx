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
            Jawab YA atau TIDAK pada setiap pertanyaan untuk membantu
            mengidentifikasi peluang dan tantangan pengelolaan bisnis resto Anda.
          </p>
        </header>

        <HealthCheckForm />
      </div>
    </div>
  );
}
