"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Select,
  Space,
  Spin,
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

function isIdentityReady(restoName, ownerName, whatsapp) {
  return Boolean(
    String(restoName || "").trim() &&
      String(ownerName || "").trim() &&
      /^[0-9+\s()-]{8,20}$/.test(String(whatsapp || "").trim()),
  );
}

function estimateMinutes(questionCount) {
  if (!questionCount) return 5;
  return Math.max(3, Math.ceil(questionCount * 0.35));
}

function YesNoButtons({ value, onChange }) {
  return (
    <div className="yes-no-buttons">
      <button
        type="button"
        className={`yes-no-btn yes-btn${value === "yes" ? " is-active" : ""}`}
        onClick={() => onChange("yes")}
      >
        Ya
      </button>
      <button
        type="button"
        className={`yes-no-btn no-btn${value === "no" ? " is-active" : ""}`}
        onClick={() => onChange("no")}
      >
        Tidak
      </button>
    </div>
  );
}

function ScaleButtons({ value, onChange }) {
  return (
    <div className="scale-wrap">
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
      <div className="scale-legend">
        <span>1 · kurang</span>
        <span>5 · sangat baik</span>
      </div>
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
      placeholder="Tulis jawaban singkat sesuai kondisi resto Anda…"
      size="large"
    />
  );
}

function FormStepper({ current }) {
  const steps = [
    { n: 1, label: "Data resto" },
    { n: 2, label: "Pilih kategori" },
    { n: 3, label: "Jawab pertanyaan" },
  ];

  return (
    <ol className="form-stepper" aria-label="Langkah pengisian">
      {steps.map((step, index) => {
        const status =
          current > step.n ? "done" : current === step.n ? "current" : "todo";
        return (
          <li key={step.n} className={`form-step is-${status}`}>
            <span className="form-step-index">{step.n}</span>
            <span className="form-step-label">{step.label}</span>
            {index < steps.length - 1 ? (
              <span className="form-step-line" aria-hidden="true" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

export default function HealthCheckForm() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const questionsRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [categoryUnlocked, setCategoryUnlocked] = useState(false);

  const [answers, setAnswers] = useState({});
  const [latestResult, setLatestResult] = useState(null);
  const [analyzeError, setAnalyzeError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const restoName = Form.useWatch("restoName", form);
  const ownerName = Form.useWatch("ownerName", form);
  const whatsapp = Form.useWatch("whatsapp", form);
  const identityReady = isIdentityReady(restoName, ownerName, whatsapp);

  useEffect(() => {
    if (identityReady) setCategoryUnlocked(true);
  }, [identityReady]);

  const answerType = selectedCategory?.answer_type || "yes_no";
  const totalQuestions = questions.length;
  const answeredCount = useMemo(
    () => countAnswered(answers, questions, answerType),
    [answers, questions, answerType],
  );
  const progressPercent =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  const currentStep = selectedCategory
    ? 3
    : categoryUnlocked
      ? 2
      : 1;

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

  const loadQuestions = async (category) => {
    if (!category?.id) return;
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
      setQuestions(
        Array.isArray(result.data.questions) ? result.data.questions : [],
      );
    } catch (error) {
      message.error(error.message || "Gagal memuat soal.");
      setSelectedCategory(null);
      setQuestions([]);
      form.setFieldValue("categoryId", undefined);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleCategoryChange = (categoryId) => {
    const category = categories.find((item) => item.id === categoryId);
    if (!category) return;
    if (Object.keys(answers).length > 0) {
      message.info("Pertanyaan diganti sesuai kategori baru.");
    }
    loadQuestions(category);
  };

  useEffect(() => {
    if (!selectedCategory || questionsLoading || questions.length === 0) return;
    questionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedCategory, questionsLoading, questions.length]);

  const setAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const clearForm = () => {
    form.resetFields();
    setAnswers({});
    setSelectedCategory(null);
    setQuestions([]);
    setCategoryUnlocked(false);
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
      message.warning("Pilih kategori analisis terlebih dahulu.");
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
        message.success("Jawaban tersimpan dan hasil analisis siap.");
      } else {
        message.warning(
          result.analyzeError
            ? `Jawaban tersimpan, tetapi analisis gagal: ${result.analyzeError}`
            : "Jawaban tersimpan, tetapi hasil analisis belum tersedia.",
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
    clearForm();
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
              Hasil analisis belum berhasil diproses. Data resto{" "}
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
            Hasil analisis untuk{" "}
            <strong>{latestResult.resto_name}</strong> sudah siap diunduh.
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

  return (
    <Form
      form={form}
      layout="vertical"
      requiredMark={false}
      onFinish={onFinish}
      scrollToFirstError
    >
      <FormStepper current={currentStep} />

      <Card className="health-check-card identity-card">
        <div className="section-heading">
          <ShopOutlined style={{ fontSize: 22, color: "#D83028" }} />
          <div>
            <h2 className="section-title">Data resto Anda</h2>
            <p className="section-desc">
              Isi identitas singkat dulu. Setelah itu baru pilih bagian bisnis
              yang ingin dicek.
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
              <Input
                placeholder="Contoh: Warung Makan Bahagia"
                size="large"
                autoComplete="organization"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="Nama pemilik / PIC"
              name="ownerName"
              rules={[{ required: true, message: "Nama PIC wajib diisi" }]}
            >
              <Input
                placeholder="Nama Anda"
                size="large"
                autoComplete="name"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label="WhatsApp"
              name="whatsapp"
              extra="Dipakai tim Mibebi untuk follow-up hasil, bukan untuk spam."
              rules={[
                { required: true, message: "Nomor WhatsApp wajib diisi" },
                {
                  pattern: /^[0-9+\s()-]{8,20}$/,
                  message: "Format nomor tidak valid",
                },
              ]}
            >
              <Input
                placeholder="08xxxxxxxxxx"
                size="large"
                inputMode="tel"
                autoComplete="tel"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label="Kota (opsional)" name="city">
              <Input placeholder="Contoh: Bandung" size="large" />
            </Form.Item>
          </Col>
        </Row>

        {!categoryUnlocked ? (
          <p className="identity-next-hint">
            Lengkapi nama resto, nama PIC, dan WhatsApp untuk memilih kategori.
          </p>
        ) : (
          <div className="category-select-block">
            <Divider style={{ margin: "4px 0 20px" }} />
            <Form.Item
              label="Anda ingin menganalisis bagian mana?"
              name="categoryId"
              rules={[{ required: true, message: "Pilih kategori analisis" }]}
              extra={
                selectedCategory?.description ||
                "Pilih satu fokus. Pertanyaan akan muncul sesuai kategori ini."
              }
            >
              <Select
                size="large"
                placeholder="Pilih kategori, misalnya operasional atau penjualan"
                loading={categoriesLoading}
                disabled={submitting}
                listHeight={320}
                optionLabelProp="label"
                onChange={handleCategoryChange}
                options={categories.map((category) => ({
                  value: category.id,
                  label: category.title,
                  description: category.description,
                  questions_count: category.questions_count,
                  answer_type: category.answer_type,
                }))}
                optionRender={(option) => (
                  <div className="category-option">
                    <span className="category-option-title">
                      {option.data.label}
                    </span>
                    {option.data.description ? (
                      <span className="category-option-desc">
                        {option.data.description}
                      </span>
                    ) : null}
                    <span className="category-option-meta">
                      {option.data.questions_count} pertanyaan ·{" "}
                      {ANSWER_TYPE_LABELS[option.data.answer_type] ||
                        option.data.answer_type}
                    </span>
                  </div>
                )}
                notFoundContent={
                  categoriesLoading ? (
                    <Spin size="small" />
                  ) : (
                    "Belum ada kategori aktif. Silakan atur di mibebi-admin."
                  )
                }
              />
            </Form.Item>
          </div>
        )}
      </Card>

      {categoryUnlocked && selectedCategory ? (
        <div ref={questionsRef} className="questions-reveal">
          {questionsLoading ? (
            <Card className="health-check-card">
              <div style={{ textAlign: "center", padding: "36px 0" }}>
                <Spin size="large" />
                <p className="section-desc" style={{ marginTop: 16 }}>
                  Menyiapkan pertanyaan {selectedCategory.title}…
                </p>
              </div>
            </Card>
          ) : (
            <>
              <Card className="health-check-card progress-card sticky-progress">
                <div className="progress-row">
                  <div>
                    <p className="progress-label">
                      {answeredCount} dari {totalQuestions} pertanyaan terjawab
                    </p>
                    <p className="progress-hint">
                      {selectedCategory.title}
                      {" · "}
                      {answerType === "yes_no"
                        ? "Jawab Ya atau Tidak"
                        : answerType === "scale_1_5"
                          ? "Pilih 1 (kurang) sampai 5 (sangat baik)"
                          : "Isi jawaban singkat sesuai kondisi resto"}
                      {" · ± "}
                      {estimateMinutes(totalQuestions)} menit
                    </p>
                  </div>
                  <span className="progress-percent">{progressPercent}%</span>
                </div>
                <Progress
                  percent={progressPercent}
                  showInfo={false}
                  strokeColor="#D83028"
                  style={{ marginTop: 10, marginBottom: 0 }}
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
                    ? "Menyimpan & menyiapkan hasil..."
                    : "Kirim & lihat hasil analisis"}
                </Button>
              </Card>
            </>
          )}
        </div>
      ) : null}
    </Form>
  );
}
