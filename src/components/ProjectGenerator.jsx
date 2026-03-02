import { useState, useRef, useEffect } from "react";

const STEPS = [
  { key: "ideia", label: "Sua Ideia", emoji: "\u{1F4A1}", placeholder: "Descreva sua ideia em 2-3 frases. Ex: Criar uma landing page para servi\u00e7o de coleta domiciliar de exames...", question: "Qual \u00e9 sua ideia? Descreva em poucas frases o que voc\u00ea quer criar." },
  { key: "objetivo", label: "Objetivo", emoji: "\u{1F3AF}", placeholder: "O que ser\u00e1 'sucesso'? Ex: Paciente preencher formul\u00e1rio e solicitar coleta. Meta: 50 leads/m\u00eas...", question: "O que ser\u00e1 'sucesso'? Como 'pronto' se parece para voc\u00ea?" },
  { key: "publico", label: "P\u00fablico", emoji: "\u{1F465}", placeholder: "Para quem \u00e9 isso? Ex: Empresas que precisam de exames para funcion\u00e1rios e pessoas f\u00edsicas...", question: "Para quem \u00e9 isso? Quem vai usar, ver ou comprar?" },
  { key: "recursos", label: "Recursos", emoji: "\u{1F4E6}", placeholder: "O que voc\u00ea j\u00e1 tem? Ex: Logomarca, fotos da equipe, lista de servi\u00e7os, or\u00e7amento de R$2.000...", question: "O que voc\u00ea j\u00e1 tem dispon\u00edvel? (textos, imagens, dados, refer\u00eancias, or\u00e7amento)" },
  { key: "prazo", label: "Prazo e Formato", emoji: "\u{1F4C5}", placeholder: "Ex: Preciso em 1 semana. Formato: site HTML responsivo com formul\u00e1rio de contato...", question: "Quando precisa estar pronto? Em qual formato de entrega? (site, documento, apresenta\u00e7\u00e3o, app, outro)" },
];

const GRADIENT = "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)";

export default function ProjectGenerator() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [inputValue, setInputValue] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [showIntro, setShowIntro] = useState(true);
  const resultRef = useRef(null);
  const inputRef = useRef(null);

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

    const systemPrompt = `Voc\u00ea \u00e9 um Arquiteto de Projetos Claude especialista. Sua fun\u00e7\u00e3o \u00e9 transformar ideias brutas em projetos completos e estruturados, prontos para execu\u00e7\u00e3o no Claude Cowork ou Claude Code.

IMPORTANTE: Responda INTEIRAMENTE em Portugu\u00eas Brasileiro. Use formata\u00e7\u00e3o Markdown rica.

Com base nas respostas do usu\u00e1rio, gere TUDO abaixo:

## \u{1F4C1} A) Estrutura de Pastas
\u00c1rvore de diret\u00f3rios completa do projeto usando formato visual.

## \u{1F4CB} B) _MANIFEST.md
Com Tier 1 (fontes de verdade), Tier 2 (dom\u00ednios espec\u00edficos) e Tier 3 (arquivo morto).

## \u{1F4C4} C) briefing-projeto.md
Documento com: vis\u00e3o geral, objetivos SMART, p\u00fablico-alvo detalhado, escopo, entreg\u00e1veis, cronograma, m\u00e9tricas de sucesso.

## \u2699\uFE0F D) instrucoes-pasta.md
Instru\u00e7\u00f5es espec\u00edficas de pasta (Folder Instructions) com regras, terminologia e formatos do projeto.

## \u{1F680} E) Prompts de Execu\u00e7\u00e3o
Crie um prompt espec\u00edfico e DETALHADO para CADA FASE do projeto. Cada prompt deve conter:
- O que "pronto" se parece
- Restri\u00e7\u00f5es claras
- Tratamento de incerteza
- Formato de sa\u00edda
- Conex\u00e3o com fase anterior e pr\u00f3xima

Os prompts devem ser autocontidos \u2014 funcionam sem explicar o sistema ao Claude.

## \u{1F527} F) Skills do Projeto
Se houver tarefas repet\u00edveis, crie arquivos .md de skill prontos para uso.

## \u2705 G) Checklist de Execu\u00e7\u00e3o
Lista ordenada de tudo que precisa ser feito, indicando qual prompt usar em cada etapa.

## \u{1F4A1} H) Dicas de Otimiza\u00e7\u00e3o
Sugira conex\u00f5es/plugins \u00fateis do Cowork e boas pr\u00e1ticas espec\u00edficas para este projeto.`;

    const userMessage = `Aqui est\u00e3o as respostas do usu\u00e1rio para o projeto:

**\u{1F4A1} IDEIA:** ${data.ideia}

**\u{1F3AF} OBJETIVO:** ${data.objetivo}

**\u{1F465} P\u00daBLICO:** ${data.publico}

**\u{1F4E6} RECURSOS DISPON\u00cdVEIS:** ${data.recursos}

**\u{1F4C5} PRAZO E FORMATO:** ${data.prazo}

Por favor, gere o projeto completo e estruturado seguindo todas as se\u00e7\u00f5es solicitadas (A at\u00e9 H).`;

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
          <div style={{ fontSize: "64px", marginBottom: "24px" }}>{"\u{1F3D7}\uFE0F"}</div>
          <h1 style={{ fontSize: "36px", fontWeight: 800, color: "#f0f9ff", marginBottom: "12px", letterSpacing: "-0.5px" }}>
            Gerador de Projetos Claude
          </h1>
          <p style={{ fontSize: "18px", color: "#94a3b8", marginBottom: "8px", lineHeight: "1.6" }}>
            Transforme qualquer ideia em um projeto completo e estruturado.
            <br />Basta descrever o que voc\u00ea quer &mdash; o Claude cria tudo.
          </p>
          <p style={{ fontSize: "13px", color: "#475569", marginBottom: "32px" }}>
            por Win7 Ag\u00eancia de Marketing Digital
          </p>

          <div style={{ background: "rgba(56, 189, 248, 0.08)", border: "1px solid rgba(56, 189, 248, 0.2)", borderRadius: "16px", padding: "28px", marginBottom: "32px", textAlign: "left" }}>
            <p style={{ color: "#7dd3fc", fontWeight: 600, fontSize: "15px", marginBottom: "16px" }}>O que ser\u00e1 gerado automaticamente:</p>
            {["Estrutura de pastas do projeto", "Manifest de prioridades (_MANIFEST.md)", "Briefing completo com objetivos SMART", "Prompts prontos para cada fase de execu\u00e7\u00e3o", "Skills reutiliz\u00e1veis para tarefas repetitivas", "Checklist ordenado de implementa\u00e7\u00e3o"].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ color: "#22d3ee", fontSize: "14px" }}>{"\u2713"}</span>
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
            Come\u00e7ar &rarr;
          </button>

          <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px" }}>
            Responda 5 perguntas r\u00e1pidas. O Claude faz o resto.
          </p>
        </div>
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
              {"\u{1F3D7}\uFE0F"} Seu Projeto Gerado
            </h1>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => navigator.clipboard.writeText(result)} style={{ background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                {"\u{1F4CB}"} Copiar Tudo
              </button>
              <button onClick={resetAll} style={{ background: "rgba(248, 113, 113, 0.15)", color: "#f87171", border: "1px solid rgba(248, 113, 113, 0.3)", padding: "8px 20px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                {"\u21A9"} Novo Projeto
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
                {i < currentStep && <span>{"\u2713"}</span>}
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
            Quanto mais detalhes, melhor ser\u00e1 o projeto gerado.
          </p>

          {currentStep > 0 && (
            <div style={{ background: "rgba(34, 197, 94, 0.06)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "13px" }}>
              <span style={{ color: "#22c55e", fontWeight: 600 }}>{"\u2713"} {STEPS[currentStep - 1].emoji} {STEPS[currentStep - 1].label}:</span>
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
              &larr; Voltar
            </button>

            <button
              onClick={handleSubmitAnswer}
              disabled={!inputValue.trim()}
              style={{ background: inputValue.trim() ? "linear-gradient(135deg, #0ea5e9 0%, #38bdf8 100%)" : "#1e293b", color: inputValue.trim() ? "#fff" : "#475569", border: "none", padding: "12px 32px", borderRadius: "10px", fontSize: "15px", fontWeight: 700, cursor: inputValue.trim() ? "pointer" : "default", transition: "all 0.2s", boxShadow: inputValue.trim() ? "0 4px 16px rgba(14, 165, 233, 0.25)" : "none" }}
            >
              {currentStep === STEPS.length - 1 ? "\u{1F680} Gerar Projeto" : "Pr\u00f3ximo \u2192"}
            </button>
          </div>

          <p style={{ color: "#334155", fontSize: "12px", marginTop: "12px", textAlign: "center" }}>
            Enter para avan\u00e7ar &bull; Shift+Enter para nova linha
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
              O Claude est\u00e1 criando toda a estrutura, prompts e documentos.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      )}

      {error && (
        <div style={{ position: "fixed", bottom: "24px", left: "50%", transform: "translateX(-50%)", background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "12px", padding: "14px 24px", color: "#f87171", fontSize: "14px", zIndex: 50, maxWidth: "90vw" }}>
          {error}
          <button onClick={() => setError("")} style={{ marginLeft: "16px", background: "none", border: "none", color: "#f87171", cursor: "pointer", fontWeight: 700 }}>{"\u2715"}</button>
        </div>
      )}
    </div>
  );
}
