"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  FormOutlined,
  ReloadOutlined,
  ShopOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  ANSWER_TYPE_LABELS,
  QUESTIONNAIRE_FOOTER,
} from "@/data/questions";
import { downloadAnalysisPdf } from "@/lib/downloadAnalysisPdf";

function countAnswered(answers, questions, answerType) {
  return questions.filter((q) => {
    const value = answers[q.id];
    if (answerType === "yes_no") return value === "yes" || value === "no";
    if (answerType === "scale_1_5") {
      return ["1", "2", "3", "4", "5"].includes(String(value));
    }
    if (answerType === "text") {
      return typeof value === "string" && value.trim().length > 0;
    }
    return false;
  }).length;
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

function ScaleButtons({ value, onChange }) {
  return (
    <div className="yes-no-buttons">
      {["1", "2", "3", "4", "5"].map((n) => (
        <button
          key={n}
          type="button"
          className={`yes-no-btn scale-btn${value === n ? " is-active" : ""}`}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function AnswerInput({ answerType, value, onChange }) {
  if (answerType === "yes_no") {
    return <YesNoButtons value={value} onChange={onChange} />;
  }
  if (answerType === "scale_1_5") {
    return <ScaleButtons value={value} onChange={onChange} />;
  }
  return (
    <Input.TextArea
      rows={3}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Tulis jawaban Anda…"
      size="large"
    />
  );
}

export default function HealthCheckForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);

  const [answers, setAnswers] = useState({});
  const [latestResult, setLatestResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const answerType = selectedCategory?.answer_type || "yes_no";
  const totalQuestions = questions.length;
  const answeredCount = useMemo(
    () => countAnswered(answers, questions, answerType),
    [answers, questions, answerType],
  );
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/categories");
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat kategori.");
      }
      setCategories(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      message.error(error.message || "Gagal memuat kategori.");
    } finally {
      setCategoriesLoading(false);
    }
  }, [message]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const selectCategory = async (category) => {
    setQuestionsLoading(true);
    setAnswers({});
    setSelectedCategory(category);
    try {
      const response = await fetch(`/api/categories/${category.id}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || "Gagal memuat soal.");
      }
      setSelectedCategory(result.data.category);
      setQuestions(Array.isArray(result.data.questions) ? result.data.questions : []);
    } catch (error) {
      message.error(error.message || "Gagal memuat soal.");
      setSelectedCategory(null);
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const backToCategories = () => {
    setSelectedCategory(null);
    setQuestions([]);
    setAnswers({});
    form.resetFields();
  };

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
    if (latestResult?.pdf_url) {
      window.open(latestResult.pdf_url, "_blank", "noopener,noreferrer");
      message.success("PDF dibuka.");
      return;
    }

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
        categoryTitle: latestResult.category_title_snapshot || "",
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
    if (!selectedCategory?.id) {
      message.warning("Pilih kategori terlebih dahulu.");
      return;
    }

    if (answeredCount < totalQuestions) {
      message.warning(
        `Masih ada ${totalQuestions - answeredCount} pertanyaan yang belum dijawab.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const normalizedAnswers = {};
      for (const question of questions) {
        normalizedAnswers[String(question.id)] = answers[question.id];
      }

      const payload = {
        restoName: values.restoName,
        ownerName: values.ownerName,
        whatsapp: values.whatsapp,
        city: values.city || "",
        categoryId: selectedCategory.id,
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

  const resetToStart = () => {
    setSubmitted(false);
    setLatestResult(null);
    setAnalyzeError("");
    backToCategories();
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
            <Button type="link" onClick={resetToStart}>
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
            <Button onClick={resetToStart}>Isi lagi</Button>
          </Space>
        </div>
      </Card>
    );
  }

  if (!selectedCategory) {
    return (
      <Card className="health-check-card">
        <div className="section-heading">
          <FormOutlined style={{ fontSize: 22, color: "#D83028" }} />
          <div>
            <h2 className="section-title">Pilih kategori</h2>
            <p className="section-desc">
              Pilih fokus kuisioner yang ingin Anda isi. Setiap kategori punya
              soal sendiri dengan tipe jawaban yang sama.
            </p>
          </div>
        </div>

        {categoriesLoading ? (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Spin size="large" />
          </div>
        ) : categories.length === 0 ? (
          <p className="section-desc">
            Belum ada kategori aktif. Silakan atur di mibebi-admin.
          </p>
        ) : (
          <div className="category-grid">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                className="category-pick-card"
                onClick={() => selectCategory(category)}
              >
                <span className="category-pick-title">{category.title}</span>
                {category.description ? (
                  <span className="category-pick-desc">{category.description}</span>
                ) : null}
                <span className="category-pick-meta">
                  {category.questions_count} soal ·{" "}
                  {ANSWER_TYPE_LABELS[category.answer_type] ||
                    category.answer_type}
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    );
  }

  if (questionsLoading) {
    return (
      <Card className="health-check-card">
        <div style={{ textAlign: "center", padding: "48px 0" }}>
          <Spin size="large" />
          <p className="section-desc" style={{ marginTop: 16 }}>
            Memuat soal {selectedCategory.title}…
          </p>
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
      <div className="category-toolbar">
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={backToCategories}
          style={{ paddingLeft: 0 }}
        >
          Ganti kategori
        </Button>
        <span className="category-toolbar-label">
          {selectedCategory.title} ·{" "}
          {ANSWER_TYPE_LABELS[answerType] || answerType}
        </span>
      </div>

      <Card className="health-check-card identity-card">
        <div className="section-heading">
          <ShopOutlined style={{ fontSize: 22, color: "#D83028" }} />
          <div>
            <h2 className="section-title">Data Resto</h2>
            <p className="section-desc">
              Lengkapi identitas singkat sebelum mengisi kuisioner.
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
              Progress: {answeredCount}/{totalQuestions} pertanyaan
            </p>
            <p className="progress-hint">
              {answerType === "yes_no"
                ? "Jawab YA atau TIDAK pada setiap pertanyaan"
                : answerType === "scale_1_5"
                  ? "Pilih skala 1–5 pada setiap pertanyaan"
                  : "Isi jawaban teks pada setiap pertanyaan"}
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

      <Card
        className="health-check-card section-card"
        title={
          <Space>
            <FormOutlined style={{ color: "#D83028" }} />
            <span>{selectedCategory.title}</span>
          </Space>
        }
      >
        <div className="questions-stack">
          {questions.map((question, index) => (
            <div key={question.id} className="question-block">
              <p className="question-text">
                <span className="question-number">{index + 1}.</span>
                {question.question_text}
              </p>
              <AnswerInput
                answerType={answerType}
                value={answers[question.id]}
                onChange={(value) => setAnswer(question.id, value)}
              />
              {index < questions.length - 1 ? (
                <Divider style={{ margin: "16px 0 0" }} />
              ) : null}
            </div>
          ))}
        </div>
      </Card>

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
