"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";
import PremiumModal from "./components/PremiumModal";
import { canUse, incrementUsage, getRemainingUses, getLimit, getResetTime } from "./lib/usage";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "general" | "recipe" | "terminal" | "course" | "code";

const MODES: { id: Mode; label: string; emoji: string; hint: string }[] = [
  { id: "general", label: "General", emoji: "🎯", hint: "Analyze anything" },
  { id: "recipe", label: "Recipe", emoji: "🍳", hint: "Extract ingredients & steps" },
  { id: "terminal", label: "Debug", emoji: "🐛", hint: "Fix terminal errors" },
  { id: "course", label: "Course", emoji: "📚", hint: "Build learning plans" },
  { id: "code", label: "Code", emoji: "💻", hint: "Review & improve code" },
];

function getModePrompt(mode: Mode): string {
  const prompts: Record<Mode, string> = {
    recipe: "This is a recipe or food screenshot. Extract ingredients and create cooking steps with a grocery list.",
    terminal: "This is a terminal error. Identify the error, explain the cause, and give exact fix commands.",
    course: "This is course content. Create a structured learning roadmap with modules and time estimates.",
    code: "This is code. Review it, identify issues, suggest improvements, and explain best practices.",
    general: "Analyze this screenshot and create a detailed, actionable task list.",
  };
  return prompts[mode];
}

export default function Home() {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<Mode>("general");
  const [dragOver, setDragOver] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showLimitHit, setShowLimitHit] = useState(false);
  const [remaining, setRemaining] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push("/login");
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (user) setRemaining(getRemainingUses(user.tier));
  }, [user, messages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) { alert("Image must be under 10MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setImage(reader.result as string); setImagePreview(reader.result as string); };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleImageUpload(f);
  }, [handleImageUpload]);

  const handleSubmit = async () => {
    if (!input.trim() && !image) return;
    if (isLoading || !user) return;
    if (!canUse(user.tier)) { setShowLimitHit(true); return; }

    const userMessage = input.trim() || getModePrompt(mode);
    const newMsgs: Message[] = [...messages, { role: "user", content: image ? `📸 ${userMessage}` : userMessage }];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);
    incrementUsage();
    setRemaining(getRemainingUses(user.tier));

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: userMessage }], image: image || undefined }),
      });
      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let asstMsg = "";
      setMessages([...newMsgs, { role: "assistant", content: "" }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          asstMsg += chunk;
          setMessages((prev) => {
            const u = [...prev];
            u[u.length - 1] = { role: "assistant", content: asstMsg };
            return u;
          });
        }
      }
      setImage(null); setImagePreview(null);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "❌ Something went wrong. Check your API keys in `.env.local`." }]);
    } finally {
      setIsLoading(false);
      if (user) setRemaining(getRemainingUses(user.tier));
    }
  };

  const downloadAsObsidian = (content: string) => {
    const d = new Date();
    const ds = d.toISOString().split("T")[0];
    const ts = d.toTimeString().split(" ")[0].replace(/:/g, "-");
    const fm = `---\ntitle: "Momento — ${mode}"\ndate: ${ds}\ntags: [momento, ${mode}, ai-generated]\n---\n\n`;
    const blob = new Blob([fm + content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `momento-${mode}-${ds}-${ts}.md`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-body)]">
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} />}

      {/* Limit Hit */}
      {showLimitHit && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowLimitHit(false)}>
          <div className="card p-7 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl mb-2">⏳</div>
            <h2 className="text-lg font-bold mb-1">Daily Limit Reached</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              You&apos;ve used all {getLimit(user?.tier || "free")} analyses today.
            </p>
            <p className="text-xs text-[var(--text-secondary)] mb-5">
              Resets in <strong className="text-[var(--primary-deeper)]">{getResetTime()}</strong>
            </p>
            <div className="flex gap-2">
              <button onClick={() => setShowLimitHit(false)} className="flex-1 btn-outline py-2.5 text-sm">Try Tomorrow</button>
              <button onClick={() => { setShowLimitHit(false); setShowPremium(true); }} className="flex-1 btn-primary py-2.5 text-sm">👑 Go Premium</button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-[var(--border)] bg-white">
        <div className="flex items-center gap-2.5">
          <img src="/momento-logo.png" alt="Momento" className="w-8 h-8 rounded-lg" />
          <h1 className="text-base font-bold shimmer">Momento</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${remaining <= 1 ? "bg-red-50 text-[var(--error)] border border-red-200" : "bg-[var(--primary-pale)] text-[var(--primary-deeper)] border border-[var(--border)]"}`}>
              {remaining}/{getLimit(user?.tier || "free")} left
            </div>
            {user?.tier === "premium" ? (
              <span className="text-xs font-medium text-[var(--primary-deeper)]">👑 Premium</span>
            ) : (
              <button onClick={() => setShowPremium(true)} className="text-xs font-medium text-[var(--primary-deeper)] hover:text-[var(--primary-dark)] transition-colors">
                Upgrade
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-[var(--text-on-primary)] text-xs font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <button onClick={logout} className="text-xs text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mode pills */}
      <div className="flex gap-1.5 px-4 md:px-6 py-2.5 overflow-x-auto border-b border-[var(--border)] bg-white">
        {MODES.map((m) => (
          <button key={m.id} className={`mode-pill whitespace-nowrap ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)} title={m.hint}>
            {m.emoji} {m.label}
          </button>
        ))}
        <div className="sm:hidden flex items-center ml-auto">
          <span className="text-[10px] text-[var(--text-secondary)]">{remaining} left</span>
        </div>
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col max-w-4xl w-full mx-auto px-4 py-4 gap-3 overflow-hidden">
        <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pr-1">
          {messages.length === 0 && !imagePreview && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
              <img src="/momento-logo.png" alt="Momento" className="w-16 h-16 rounded-2xl" />
              <h2 className="text-xl font-bold text-center shimmer">What can I help with?</h2>
              <p className="text-[var(--text-secondary)] text-center max-w-sm text-sm">
                Upload a screenshot of anything — I&apos;ll break it down into simple steps you can follow.
              </p>

              <div
                className={`upload-zone w-full max-w-md ${dragOver ? "drag-over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="text-3xl mb-2">📸</div>
                <p className="font-semibold text-sm mb-0.5">Drop your screenshot here</p>
                <p className="text-xs text-[var(--text-secondary)]">or click to browse • PNG, JPG, WEBP</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-md">
                {([
                  { emoji: "🍳", title: "Recipes", desc: "Ingredients & steps", m: "recipe" as Mode },
                  { emoji: "🐛", title: "Fix Errors", desc: "Debug anything", m: "terminal" as Mode },
                  { emoji: "📚", title: "Learn", desc: "Study plans", m: "course" as Mode },
                  { emoji: "💻", title: "Code Help", desc: "Review code", m: "code" as Mode },
                ]).map((c) => (
                  <button key={c.title} onClick={() => { setMode(c.m); fileInputRef.current?.click(); }}
                    className="card p-3 text-center cursor-pointer hover:bg-[var(--bg-card-hover)]">
                    <div className="text-lg mb-0.5">{c.emoji}</div>
                    <div className="font-semibold text-xs">{c.title}</div>
                    <div className="text-[10px] text-[var(--text-secondary)]">{c.desc}</div>
                  </button>
                ))}
              </div>

              <details className="card w-full max-w-md cursor-pointer">
                <summary className="px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)] flex items-center gap-1.5">
                  🤔 How does this work?
                </summary>
                <div className="px-4 pb-3 text-[11px] text-[var(--text-secondary)] space-y-1.5">
                  <p>1️⃣ <strong className="text-[var(--text-primary)]">Upload</strong> — Drop any screenshot</p>
                  <p>2️⃣ <strong className="text-[var(--text-primary)]">AI Reads It</strong> — Vision AI reads everything</p>
                  <p>3️⃣ <strong className="text-[var(--text-primary)]">Get Steps</strong> — A second AI creates your action plan</p>
                  <p>4️⃣ <strong className="text-[var(--text-primary)]">Save It</strong> — Download as Obsidian note or copy</p>
                </div>
              </details>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`chat-message ${msg.role}`}>
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.role === "assistant" && msg.content && !isLoading && (
                  <div className="flex gap-3 mt-2.5 pt-2 border-t border-[var(--border)]">
                    <button onClick={() => downloadAsObsidian(msg.content)}
                      className="text-[11px] text-[var(--primary-deeper)] hover:text-[var(--text-primary)] transition-colors">
                      💾 Save to Obsidian
                    </button>
                    <button onClick={() => navigator.clipboard.writeText(msg.content)}
                      className="text-[11px] text-[var(--primary-deeper)] hover:text-[var(--text-primary)] transition-colors">
                      📋 Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className="chat-message assistant">
                <div className="flex items-center gap-2 pulse text-sm">
                  <span>🧠</span>
                  <span className="text-[var(--text-secondary)]">Analyzing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {imagePreview && (
          <div className="card p-2.5 flex items-center gap-3">
            <img src={imagePreview} alt="Preview" className="w-12 h-12 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold">Screenshot ready</p>
              <p className="text-[10px] text-[var(--text-secondary)]">{MODES.find((m) => m.id === mode)?.emoji} {MODES.find((m) => m.id === mode)?.label}</p>
            </div>
            <button onClick={() => { setImage(null); setImagePreview(null); }} className="text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors">✕</button>
          </div>
        )}

        {/* Input bar */}
        <div className="flex gap-2">
          <button onClick={() => fileInputRef.current?.click()} className="card px-3 flex items-center hover:bg-[var(--bg-card-hover)] transition-all text-base shrink-0" title="Attach screenshot">📎</button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSubmit()}
            placeholder={image ? "Add a note (optional)..." : "Ask anything or upload a screenshot..."}
            className="flex-1 input-field" disabled={isLoading} />
          <button onClick={handleSubmit} disabled={isLoading || (!input.trim() && !image)} className="btn-primary text-sm shrink-0">
            {isLoading ? "⏳" : "🚀"} {isLoading ? "Working..." : "Analyze"}
          </button>
        </div>
      </main>

      <footer className="text-center py-2 text-[10px] text-[var(--text-secondary)] border-t border-[var(--border)] bg-white">
        2 AI Agents • {user?.tier === "premium" ? "👑 Premium" : "Free"} • {remaining} uses left today
      </footer>
    </div>
  );
}
