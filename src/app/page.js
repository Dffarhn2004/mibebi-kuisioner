"use client";

import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("@/components/HomePage"), {
  ssr: false,
  loading: () => (
    <div className="health-check-page">
      <div className="health-check-shell">
        <p className="brand-eyebrow">Mibebi</p>
        <h1 className="hero-title">Business Health Check Resto</h1>
        <p className="hero-subtitle">Menyiapkan formulir...</p>
      </div>
    </div>
  ),
});

export default function Home() {
  return <HomePage />;
}
