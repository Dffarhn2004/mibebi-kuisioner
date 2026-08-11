"use client";

import { useMemo, useState } from "react";
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  Progress,
  Row,
  Space,
} from "antd";
import {
  CheckCircleOutlined,
  DownloadOutlined,
  FormOutlined,
  ReloadOutlined,
  ShopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  QUESTIONNAIRE_FOOTER,
  SECTIONS,
  TOTAL_QUESTIONS,
} from "@/data/questions";
import { downloadAnalysisPdf } from "@/lib/downloadAnalysisPdf";

function countAnswered(answers) {
  return Object.values(answers).filter(
    (value) => value === "yes" || value === "no",
  ).length;
}

function YesNoButtons({ value, onChange }) {
  return (
    <div className="yes-no-buttons">
      <button
        type="button"
        className={`yes-no-btn yes-btn${value === "yes" ? " is-active" : ""}`}
        onClick={() => onChange("yes")}
      >
        YA
      </button>
      <button
        type="button"
        className={`yes-no-btn no-btn${value === "no" ? " is-active" : ""}`}
        onClick={() => onChange("no")}
      >
        TIDAK
      </button>
    </div>
  );
}

export default function HealthCheckForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [answers, setAnswers] = useState({});
  const [latestResult, setLatestResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const answeredCount = useMemo(() => countAnswered(answers), [answers]);
  const progressPercent = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const clearForm = () => {
    form.resetFields();
    setAnswers({});
  };

  const handleDownloadPdf = () => {
    if (!latestResult?.analysis) {
      message.warning("Hasil analisis belum tersedia untuk diunduh.");
      return;
    }

    setDownloading(true);
    try {
      downloadAnalysisPdf({
        restoName: latestResult.resto_name,
        ownerName: latestResult.owner_name,
        city: latestResult.city,
        whatsapp: latestResult.whatsapp,
        yesCount: latestResult.yes_count,
        totalQuestions: latestResult.total_questions,
        analysis: latestResult.analysis,
        createdAt: latestResult.analyzed_at || latestResult.created_at,
      });
      message.success("PDF berhasil diunduh.");
    } catch (error) {
      message.error(error.message || "Gagal membuat PDF.");
    } finally {
      setDownloading(false);
    }
  };

  const handleReanalyze = async () => {
    if (!latestResult?.id) {
      message.error("ID submission tidak ditemukan.");
      return;
    }

    setReanalyzing(true);
    try {
      const response = await fetch(
        `/api/submissions/${latestResult.id}/analyze`,
        { method: "POST" },
      );
      const result = await response.json();

      if (!response.ok || !result.success || !result.analyzed) {
        const errMsg =
          result.analyzeError || result.error || "Analisis ulang gagal.";
        setAnalyzeError(errMsg);
        throw new Error(errMsg);
      }

      setLatestResult(result.data);
      setAnalyzeError("");
      message.success("Analisis ulang berhasil.");
    } catch (error) {
      message.error(error.message || "Analisis ulang gagal.");
    } finally {
      setReanalyzing(false);
    }
  };

  const onFinish = async (values) => {
    const answered = countAnswered(answers);
    if (answered < TOTAL_QUESTIONS) {
      message.warning(
        `Masih ada ${TOTAL_QUESTIONS - answered} pertanyaan yang belum dijawab.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const normalizedAnswers = {};
      for (let id = 1; id <= TOTAL_QUESTIONS; id += 1) {
        normalizedAnswers[String(id)] = answers[id];
      }

      const payload = {
        restoName: values.restoName,
        ownerName: values.ownerName,
        whatsapp: values.whatsapp,
        city: values.city || "",
        answers: normalizedAnswers,
      };

      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal menyimpan jawaban.");
      }

      setLatestResult(result.data);
      setAnalyzeError(result.analyzed ? "" : result.analyzeError || "");
      clearForm();
      setSubmitted(true);

      if (result.analyzed) {
        message.success("Jawaban tersimpan dan analisis AI selesai.");
      } else {
        message.warning(
          result.analyzeError
            ? `Jawaban tersimpan, tetapi analisis AI gagal: ${result.analyzeError}`
            : "Jawaban tersimpan, tetapi analisis AI belum tersedia.",
        );
      }
    } catch (error) {
      message.error(error.message || "Gagal menyimpan ke database.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    const hasAnalysis = Boolean(
      latestResult?.analysis?.summary ||
        (Array.isArray(latestResult?.analysis?.recommendations) &&
          latestResult.analysis.recommendations.length > 0),
    );

    if (!hasAnalysis) {
      return (
        <Card className="health-check-card success-card">
          <div className="success-content">
            <WarningOutlined style={{ fontSize: 56, color: "#D83028" }} />
            <h3 className="success-title">Jawaban tersimpan</h3>
            <p className="success-text">
              Analisis AI gagal diproses. Data resto{" "}
              <strong>{latestResult?.resto_name || "-"}</strong> sudah aman
              tersimpan — silakan coba analisis ulang.
            </p>
            {analyzeError ? (
              <p className="analysis-error">{analyzeError}</p>
            ) : null}
            <Button
              type="primary"
              size="large"
              icon={<ReloadOutlined />}
              loading={reanalyzing}
              onClick={handleReanalyze}
              block
              style={{ maxWidth: 360 }}
            >
              Analisis ulang
            </Button>
            <Button type="link" onClick={() => setSubmitted(false)}>
              Isi kuisioner lagi
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card className="health-check-card success-card">
        <div className="success-content">
          <CheckCircleOutlined style={{ fontSize: 56, color: "#16A34A" }} />
          <h3 className="success-title">Terima kasih!</h3>
          <p className="success-text">{QUESTIONNAIRE_FOOTER}</p>
          <p className="success-meta">
            Analisis AI siap. Unduh PDF laporan untuk resto{" "}
            <strong>{latestResult.resto_name}</strong>.
          </p>
          {latestResult.analysis?.summary ? (
            <p className="analysis-preview">{latestResult.analysis.summary}</p>
          ) : null}
          <Space wrap style={{ justifyContent: "center" }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              loading={downloading}
              onClick={handleDownloadPdf}
            >
              Unduh PDF analisis
            </Button>
            <Button
              icon={<ReloadOutlined />}
              loading={reanalyzing}
              onClick={handleReanalyze}
            >
              Analisis ulang
            </Button>
            <Button onClick={() => setSubmitted(false)}>Isi lagi</Button>
          </Space>
        </div>
      </Card>
    );
  }

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={onFinish}
      scrollToFirstError
    >
      <Card className="health-check-card identity-card">
        <div className="section-heading">
          <ShopOutlined style={{ fontSize: 22, color: "#D83028" }} />
          <div>
            <h2 className="section-title">Data Resto</h2>
            <p className="section-desc">
              Lengkapi identitas singkat sebelum mengisi health check.
            </p>
          </div>
        </div>

        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label="Nama resto"
              name="restoName"
              rules={[{ required: true, message: "Nama resto wajib diisi" }]}
            >
              <Input placeholder="Contoh: Warung Makan Bahagia" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Nama pemilik / PIC"
              name="ownerName"
              rules={[{ required: true, message: "Nama PIC wajib diisi" }]}
            >
              <Input placeholder="Nama Anda" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="WhatsApp"
              name="whatsapp"
              rules={[
                { required: true, message: "Nomor WhatsApp wajib diisi" },
                {
                  pattern: /^[0-9+\s()-]{8,20}$/,
                  message: "Format nomor tidak valid",
                },
              ]}
            >
              <Input placeholder="08xxxxxxxxxx" size="large" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Kota (opsional)" name="city">
              <Input placeholder="Contoh: Bandung" size="large" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card className="health-check-card progress-card sticky-progress">
        <div className="progress-row">
          <div>
            <p className="progress-label">
              Progress: {answeredCount}/{TOTAL_QUESTIONS} pertanyaan
            </p>
            <p className="progress-hint">
              Jawab YA atau TIDAK pada setiap pertanyaan
            </p>
          </div>
          <Progress
            type="circle"
            percent={progressPercent}
            size={64}
            strokeColor="#D83028"
            format={(percent) => `${percent}%`}
          />
        </div>
        <Progress
          percent={progressPercent}
          showInfo={false}
          strokeColor="#D83028"
          style={{ marginTop: 12, marginBottom: 0 }}
        />
      </Card>

      <div className="sections-stack">
        {SECTIONS.map((section) => (
          <Card
            key={section.key}
            className="health-check-card section-card"
            title={
              <Space>
                <FormOutlined style={{ color: "#D83028" }} />
                <span>
                  {section.key === "extra" ? "" : `${section.key}. `}
                  {section.title}
                </span>
              </Space>
            }
          >
            <div className="questions-stack">
              {section.questions.map((question, index) => (
                <div key={question.id} className="question-block">
                  <p className="question-text">
                    <span className="question-number">{question.id}.</span>
                    {question.text}
                  </p>
                  <YesNoButtons
                    value={answers[question.id]}
                    onChange={(value) => setAnswer(question.id, value)}
                  />
                  {index < section.questions.length - 1 ? (
                    <Divider style={{ margin: "16px 0 0" }} />
                  ) : null}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="health-check-card submit-card">
        <p className="submit-note">{QUESTIONNAIRE_FOOTER}</p>
        <Button
          type="primary"
          htmlType="submit"
          size="large"
          loading={submitting}
          block
        >
          {submitting
            ? "Menyimpan & menganalisis..."
            : "Kirim & analisis dengan AI"}
        </Button>
      </Card>
    </Form>
  );
}
