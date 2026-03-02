import { useState, useRef, useEffect } from "react";

const STEPS = [
  { key: "ideia", label: "Sua Ideia", emoji: "💡", placeholder: "Descreva sua ideia em 2-3 frases. Ex: Criar uma landing page para serviço de coleta domiciliar de exames...", question: "Qual é sua ideia? Descreva em poucas frases o que você quer criar." },
  { key: "objetivo", label: "Objetivo", emoji: "🎯", placeholder: "O que será 'sucesso'? Ex: Paciente preencher formulário e solicitar coleta. Meta: 50 leads/mês...", question: "O que será 'sucesso'? Como 'pronto' se parece para você?" },
  { key: "publico", label: "Público", emoji: "👥", placeholder: "Para quem é isso? Ex: Empresas que precisam de exames para funcionários e pessoas físicas...", question: "Para quem é isso? Quem vai usar, ver ou comprar?" },
  { key: "recursos", label: "Recursos", emoji: "📦", placeholder: "O que você já tem? Ex: Logomarca, fotos da equipe, lista de serviços, orçamento de R$2.000...", question: "O que você já tem disponível? (textos, imagens, dados, referências, orçamento)" },
  { key: "prazo", label: "Prazo e Formato", emoji: "📅", placeholder: "Ex: Preciso em 1 semana. Formato: site HTML responsivo com formulário de contato...", question: "Quando precisa estar pronto? Em qual formato de entrega? (site, documento, apresentação, app, outro)" },
];

const GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)";

const HISTORY_KEY = "claude-project-history";

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveToHistory(answers, result) {
  const history = loadHistory();
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
    title: answers.ideia?.substring(0, 80) || "Projeto sem título",
    answers,
    result,
  };
  history.unshift(entry);
  if (history.length > 50) history.length = 50;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

function deleteFromHistory(id) {
  const history = loadHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export default function ProjectGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const resultRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (inputRef.current && !showIntro && !result) {
      inputRef.current.focus();
    }
  }, [currentStep, showIntro, result]);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  const handleSubmitAnswer = () => {
    if (!inputValue.trim()) return;
    const newAnswers = { ...answers, [STEPS[currentStep].key]: inputValue.trim() };
    setAnswers(newAnswers);
    setInputValue("");
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      generateProject(newAnswers);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitAnswer();
    }
  };

  const generateProject = async (data) => {
    setGenerating(true);
    setError("");
    setResult("");

    const systemPrompt = `Você é um Arquiteto de Projetos Claude especialista. Sua função é transformar ideias brutas em projetos completos e estruturados, prontos para execução no Claude Cowork ou Claude Code.

IMPORTANTE: Responda INTEIRAMENTE em Português Brasileiro. Use formatação Markdown rica.

Com base nas respostas do usuário, gere TUDO abaixo:

## 📁 A) Estrutura de Pastas
Árvore de diretórios completa do projeto usando formato visual.

## 📋 B) _MANIFEST.md
Com Tier 1 (fontes de verdade), Tier 2 (domínios específicos) e Tier 3 (arquivo morto).

## 📄 C) briefing-projeto.md
Documento com: visão geral, objetivos SMART, público-alvo detalhado, escopo, entregáveis, cronograma, métricas de sucesso.

## ⚙️ D) instrucoes-pasta.md
Instruções específicas de pasta (Folder Instructions) com regras, terminologia e formatos do projeto.

## 🚀 E) Prompts de Execução
Crie um prompt específico e DETALHADO para CADA FASE do projeto. Cada prompt deve conter:
- O que "pronto" se parece
- Restrições claras
- Tratamento de incerteza
- Formato de saída
- Conexão com fase anterior e próxima

Os prompts devem ser autocontidos — funcionam sem explicar o sistema ao Claude.

## 🔧 F) Skills do Projeto
Se houver tarefas repetíveis, crie arquivos .md de skill prontos para uso.

## ✅ G) Checklist de Execução
Lista ordenada de tudo que precisa ser feito, indicando qual prompt usar em cada etapa.

## 💡 H) Dicas de Otimização
Sugira conexões/plugins úteis do Cowork e boas práticas específicas para este projeto.`;

    const userMessage = `Aqui estão as respostas do usuário para o projeto:

**💡 IDEIA:** ${data.ideia}

**🎯 OBJETIVO:** ${data.objetivo}

**👥 PÚBLICO:** ${data.publico}

**📦 RECURSOS DISPONÍVEIS:** ${data.recursos}

**📅 PRAZO E FORMATO:** ${data.prazo}

Por favor, gere o projeto completo e estruturado seguindo todas as seções solicitadas (A até H).`;

    try {
      const response = await fetch("/api/generate.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          max_tokens: 8000,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erro na API: ${response.status}`);
      }

      const responseData = await response.json();
      const text = responseData.content?.map(b => b.text || "").join("\n") || "Erro ao processar resposta.";
      setResult(text);
      setHistory(saveToHistory(data, text));
    } catch (err) {
      setError(`Erro ao gerar projeto: ${err.message}. Tente novamente.`);
    } finally {
      setGenerating(false);
    }
  };

  const resetAll = () => {
    setCurrentStep(0);
    setAnswers({});
    setInputValue("");
    setResult("");
    setError("");
    setShowIntro(true);
    setShowHistory(false);
  };

  const loadFromHistory = (entry) => {
    setAnswers(entry.answers);
    setResult(entry.result);
    setShowIntro(false);
    setShowHistory(false);
    setCurrentStep(STEPS.length - 1);
  };

  const handleDeleteHistory = (id, e) => {
    e.stopPropagation();
    setHistory(deleteFromHistory(id));
  };

  const renderMarkdown = (text) => {
    const lines = text.split("\n");
    const elements = [];
    let inCodeBlock = false;
    let codeLines = [];
    let codeKey = 0;

    lines.forEach((line, i) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${codeKey++}`} style={{ background: "#1e293b", color: "#e2e8f0", padding: "16px", borderRadius: "8px", fontSize: "13px", lineHeight: "1.6", overflowX: "auto", margin: "12px 0", border: "1px solid #334155", fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>
              {codeLines.join("\n")}
            </pre>
          );
          codeLines = [];
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) { codeLines.push(line); return; }

      if (line.startsWith("## ")) {
        elements.push(<h2 key={i} style={{ fontSize: "20px", fontWeight: 700, color: "#38bdf8", marginTop: "28px", marginBottom: "12px", borderBottom: "1px solid #1e3a5f", paddingBottom: "8px" }}>{line.replace("## ", "")}</h2>);
      } else if (line.startsWith("### ")) {
        elements.push(<h3 key={i} style={{ fontSize: "17px", fontWeight: 600, color: "#7dd3fc", marginTop: "20px", marginBottom: "8px" }}>{line.replace("### ", "")}</h3>);
      } else if (line.startsWith("# ")) {
        elements.push(<h1 key={i} style={{ fontSize: "24px", fontWeight: 800, color: "#f0f9ff", marginTop: "32px", marginBottom: "16px" }}>{line.replace("# ", "")}</h1>);
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        const content = line.replace(/^[-*] /, "");
        const boldMatch = content.match(/^\*\*(.+?)\*\*(.*)$/);
        elements.push(
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", paddingLeft: "8px", lineHeight: "1.6" }}>
            <span style={{ color: "#38bdf8", flexShrink: 0 }}>&bull;</span>
            <span style={{ color: "#cbd5e1" }}>
              {boldMatch ? <><strong style={{ color: "#e2e8f0" }}>{boldMatch[1]}</strong>{boldMatch[2]}</> : content}
            </span>
          </div>
        );
      } else if (/^\d+\.\s/.test(line)) {
        const num = line.match(/^(\d+)\.\s/)[1];
        const content = line.replace(/^\d+\.\s/, "");
        const boldMatch = content.match(/^\*\*(.+?)\*\*(.*)$/);
        elements.push(
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", paddingLeft: "8px", lineHeight: "1.6" }}>
            <span style={{ color: "#38bdf8", fontWeight: 600, flexShrink: 0, minWidth: "20px" }}>{num}.</span>
            <span style={{ color: "#cbd5e1" }}>
              {boldMatch ? <><strong style={{ color: "#e2e8f0" }}>{boldMatch[1]}</strong>{boldMatch[2]}</> : content}
            </span>
          </div>
        );
      } else if (line.trim() === "") {
        elements.push(<div key={i} style={{ height: "8px" }} />);
      } else {
        const formatted = line
          .replace(/\*\*(.+?)\*\*/g, "\u27E8BOLD\u27E9$1\u27E8/BOLD\u27E9")
          .replace(/`(.+?)`/g, "\u27E8CODE\u27E9$1\u27E8/CODE\u27E9");
        const parts = formatted.split(/(\u27E8BOLD\u27E9.*?\u27E8\/BOLD\u27E9|\u27E8CODE\u27E9.*?\u27E8\/CODE\u27E9)/);
        elements.push(
          <p key={i} style={{ color: "#cbd5e1", lineHeight: "1.7", marginBottom: "8px" }}>
            {parts.map((part, j) => {
              if (part.startsWith("\u27E8BOLD\u27E9")) return <strong key={j} style={{ color: "#e2e8f0" }}>{part.replace(/\u27E8\/?BOLD\u27E9/g, "")}</strong>;
              if (part.startsWith("\u27E8CODE\u27E9")) return <code key={j} style={{ background: "#1e293b", color: "#38bdf8", padding: "2px 6px", borderRadius: "4px", fontSize: "13px" }}>{part.replace(/\u27E8\/?CODE\u27E9/g, "")}</code>;
              return part;
            })}
          </p>
        );
      }
    });
    return elements;
  };

  // ===== INTRO SCREEN =====
  if (showIntro) {
    return (
      <div style={{ minHeight: "100vh", background: GRADIENT, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: "640px", textAlign: "center" }}>
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>🏗️</div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#f0f9ff", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Gerador de Projetos Claude
          </h1>
          <p style={{ fontSize: "18px", color: "#94a3b8", marginBottom: "8px", lineHeight: "1.6" }}>
            Transforme qualquer ideia em um projeto completo e estruturado.
            <br />Basta descrever o que você quer &mdash; o Claude cria tudo.
          </p>
          <p style={{ fontSize: "13px", color: "#475569", marginBottom: "32px" }}>
            por Win7 Agência de Marketing Digital
          </p>

          <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "16px", padding: "28px", marginBottom: "32px", textAlign: "left" }}>
            <p style={{ color: "#7dd3fc", fontWeight: 600, fontSize: "15px", marginBottom: "16px" }}>O que será gerado automaticamente:</p>
            {["Estrutura de pastas do projeto", "Manifest de prioridades (_MANIFEST.md)", "Briefing completo com objetivos SMART", "Prompts prontos para cada fase de execução", "Skills reutilizáveis para tarefas repetitivas", "Checklist ordenado de implementação"].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ color: "#22d3ee", fontSize: "14px" }}>✓</span>
                <span style={{ color: "#cbd5e1", fontSize: "14px" }}>{item}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowIntro(false)}
            style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)", color: "#fff", border: "none", padding: "16px 48px", borderRadius: "12px", fontSize: "17px", fontWeight: 700, cursor: "pointer", transition: "all 0.2s", boxShadow: "0 4px 24px rgba(14, 165, 233, 0.3)" }}
            onMouseOver={e => e.target.style.transform = "translateY(-2px)"}
            onMouseOut={e => e.target.style.transform = "translateY(0)"}
          >
            Começar →
          </button>

          <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px" }}>
            Responda 5 perguntas rápidas. O Claude faz o resto.
          </p>

          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              style={{ marginTop: "16px", background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.2)", padding: "10px 24px", borderRadius: "10px", fontSize: "14px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
              onMouseOver={e => e.target.style.borderColor = "rgba(148, 163, 184, 0.4)"}
              onMouseOut={e => e.target.style.borderColor = "rgba(148, 163, 184, 0.2)"}
            >
              📂 Histórico ({history.length} {history.length === 1 ? "projeto" : "projetos"})
            </button>
          )}
        </div>

        {/* History Drawer */}
        {showHistory && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
            <div onClick={() => setShowHistory(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: "440px", background: "#0f172a", borderLeft: "1px solid #1e3a5f", height: "100vh", overflowY: "auto", padding: "24px", animation: "slideIn 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ color: "#f0f9ff", fontSize: "20px", fontWeight: 700 }}>📂 Histórico de Projetos</h2>
                <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "24px", cursor: "pointer", padding: "4px" }}>✕</button>
              </div>
              {history.length === 0 ? (
                <p style={{ color: "#475569", textAlign: "center", marginTop: "48px" }}>Nenhum projeto gerado ainda.</p>
              ) : (
                history.map(entry => (
                  <div
                    key={entry.id}
                    onClick={() => loadFromHistory(entry)}
                    style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "16px", marginBottom: "12px", cursor: "pointer", transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)"}
                    onMouseOut={e => e.currentTarget.style.borderColor = "#1e3a5f"}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 600, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          💡 {entry.title}
                        </p>
                        <p style={{ color: "#64748b", fontSize: "12px" }}>{entry.date}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteHistory(entry.id, e)}
                        style={{ background: "none", border: "none", color: "#475569", fontSize: "16px", cursor: "pointer", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}
                        onMouseOver={e => e.target.style.color = "#f87171"}
                        onMouseOut={e => e.target.style.color = "#475569"}
                        title="Excluir do histórico"
                      >
                        🗑
                      </button>
                    </div>
                    {entry.answers.objetivo && (
                      <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        🎯 {entry.answers.objetivo}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
          </div>
        )}
      </div>
    );
  }

  // ===== RESULT SCREEN =====
  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: GRADIENT, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#f0f9ff" }}>
              🏗️ Seu Projeto Gerado
            </h1>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigator.clipboard.writeText(result)} style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                📋 Copiar Tudo
              </button>
              {history.length > 0 && (
                <button onClick={() => setShowHistory(true)} style={{ background: "rgba(148, 163, 184, 0.1)", color: "#94a3b8", border: "1px solid rgba(148, 163, 184, 0.2)", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                  📂 Histórico
                </button>
              )}
              <button onClick={resetAll} style={{ background: "rgba(248, 113, 113, 0.15)", color: "#f87171", border: "1px solid rgba(248, 113, 113, 0.3)", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                ↩ Novo Projeto
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {Object.entries(answers).map(([key, val]) => (
              <div key={key} style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.15)", borderRadius: "8px", padding: "6px 12px", fontSize: "12px", color: "#94a3b8", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong style={{ color: "#7dd3fc" }}>{STEPS.find(s => s.key === key)?.emoji}</strong> {val}
              </div>
            ))}
          </div>

          <div ref={resultRef} style={{ background: "rgba(15, 23, 42, 0.6)", border: "1px solid #1e3a5f", borderRadius: "16px", padding: "32px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            {renderMarkdown(result)}
          </div>
        </div>

        {/* History Drawer on Result */}
        {showHistory && (
          <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}>
            <div onClick={() => setShowHistory(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{ position: "relative", marginLeft: "auto", width: "100%", maxWidth: "440px", background: "#0f172a", borderLeft: "1px solid #1e3a5f", height: "100vh", overflowY: "auto", padding: "24px", animation: "slideIn 0.2s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
                <h2 style={{ color: "#f0f9ff", fontSize: "20px", fontWeight: 700 }}>📂 Histórico de Projetos</h2>
                <button onClick={() => setShowHistory(false)} style={{ background: "none", border: "none", color: "#64748b", fontSize: "24px", cursor: "pointer", padding: "4px" }}>✕</button>
              </div>
              {history.map(entry => (
                <div
                  key={entry.id}
                  onClick={() => loadFromHistory(entry)}
                  style={{ background: "rgba(30, 41, 59, 0.6)", border: "1px solid #1e3a5f", borderRadius: "12px", padding: "16px", marginBottom: "12px", cursor: "pointer", transition: "all 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.borderColor = "rgba(56, 189, 248, 0.4)"}
                  onMouseOut={e => e.currentTarget.style.borderColor = "#1e3a5f"}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: "#e2e8f0", fontSize: "14px", fontWeight: 600, marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        💡 {entry.title}
                      </p>
                      <p style={{ color: "#64748b", fontSize: "12px" }}>{entry.date}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistory(entry.id, e)}
                      style={{ background: "none", border: "none", color: "#475569", fontSize: "16px", cursor: "pointer", padding: "2px 6px", borderRadius: "4px", flexShrink: 0 }}
                      onMouseOver={e => e.target.style.color = "#f87171"}
                      onMouseOut={e => e.target.style.color = "#475569"}
                      title="Excluir do histórico"
                    >
                      🗑
                    </button>
                  </div>
                  {entry.answers.objetivo && (
                    <p style={{ color: "#94a3b8", fontSize: "12px", marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      🎯 {entry.answers.objetivo}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <style>{`@keyframes slideIn { from { transform: translateX(100%) } to { transform: translateX(0) } }`}</style>
          </div>
        )}
      </div>
    );
  }

  // ===== QUESTIONNAIRE =====
  const step = STEPS[currentStep];
  const progress = ((currentStep) / STEPS.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: GRADIENT, display: "flex", flexDirection: "column", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Progress */}
      <div style={{ padding: "20px 24px 0" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ color: "#64748b", fontSize: "13px", fontWeight: 500 }}>Pergunta {currentStep + 1} de {STEPS.length}</span>
            <span style={{ color: "#64748b", fontSize: "13px" }}>{Math.round(progress)}%</span>
          </div>
          <div style={{ height: "4px", background: "#1e293b", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0ea5e9, #38bdf8)", borderRadius: "4px", transition: "width 0.5s ease" }} />
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", background: i === currentStep ? "rgba(56, 189, 248, 0.15)" : i < currentStep ? "rgba(34, 197, 94, 0.1)" : "transparent", border: `1px solid ${i === currentStep ? "rgba(56, 189, 248, 0.3)" : i < currentStep ? "rgba(34, 197, 94, 0.2)" : "rgba(100, 116, 139, 0.2)"}`, color: i === currentStep ? "#38bdf8" : i < currentStep ? "#22c55e" : "#475569", cursor: i < currentStep ? "pointer" : "default", transition: "all 0.2s" }} onClick={() => { if (i < currentStep) setCurrentStep(i); }}>
                <span>{s.emoji}</span>
                <span style={{ fontWeight: 500 }}>{s.label}</span>
                {i < currentStep && <span>✓</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "680px", width: "100%" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>{step.emoji}</div>
          <h2 style={{ fontSize: "28px", fontWeight: 700, color: "#f0f9ff", marginBottom: "12px", lineHeight: "1.3" }}>
            {step.question}
          </h2>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px" }}>
            Quanto mais detalhes, melhor será o projeto gerado.
          </p>

          {currentStep > 0 && (
            <div style={{ background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px" }}>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>✓ {STEPS[currentStep - 1].emoji} {STEPS[currentStep - 1].label}:</span>
              <span style={{ color: "#94a3b8", marginLeft: "8px" }}>{answers[STEPS[currentStep - 1].key]}</span>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={step.placeholder}
              rows={4}
              style={{ width: "100%", background: "rgba(30, 41, 59, 0.8)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "14px", padding: "18px", color: "#e2e8f0", fontSize: "15px", lineHeight: "1.6", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", transition: "border-color 0.2s" }}
              onFocus={e => e.target.style.borderColor = "rgba(56, 189, 248, 0.5)"}
              onBlur={e => e.target.style.borderColor = "rgba(56, 189, 248, 0.2)"}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => { if (currentStep > 0) { setInputValue(answers[STEPS[currentStep - 1].key] || ""); setCurrentStep(currentStep - 1); } }}
              disabled={currentStep === 0}
              style={{ background: "transparent", color: currentStep === 0 ? "#334155" : "#64748b", border: "1px solid rgba(100, 116, 139, 0.2)", padding: "10px 24px", borderRadius: "10px", fontSize: "14px", cursor: currentStep === 0 ? "default" : "pointer", fontWeight: 500 }}
            >
              ← Voltar
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!inputValue.trim()}
              style={{ background: inputValue.trim() ? "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" : "#1e293b", color: inputValue.trim() ? "#fff" : "#475569", border: "none", padding: "12px 32px", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: inputValue.trim() ? "pointer" : "default", transition: "all 0.2s", boxShadow: inputValue.trim() ? "0 4px 16px rgba(14, 165, 233, 0.25)" : "none" }}
            >
              {currentStep === STEPS.length - 1 ? "🚀 Gerar Projeto" : "Próximo →"}
            </button>
          </div>

          <p style={{ color: "#334155", fontSize: "12px", marginTop: "12px", textAlign: "center" }}>
            Enter para avançar • Shift+Enter para nova linha
          </p>
        </div>
      </div>

      {generating && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: "56px", height: "56px", border: "3px solid #1e3a5f", borderTop: "3px solid #38bdf8", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 24px" }} />
            <h3 style={{ color: "#f0f9ff", fontSize: "22px", fontWeight: 700, marginBottom: "8px" }}>
              Gerando seu projeto...
            </h3>
            <p style={{ color: "#64748b", fontSize: "14px" }}>
              O Claude está criando toda a estrutura, prompts e documentos.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", padding: "14px 24px", color: "#f87171", fontSize: "14px", zIndex: 50, maxWidth: "90vw" }}>
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: "16px", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}
    </div>
  );
}
