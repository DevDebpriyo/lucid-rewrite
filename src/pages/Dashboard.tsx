import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TextEditor } from "@/components/TextEditor";
import { DetectionScore } from "@/components/DetectionScore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Download, RefreshCw, Loader2, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Service base URLs (prod-ready via env) and sensible dev fallbacks via Vite proxies
const isDev = import.meta.env.DEV;

// Model/backend API (our server) — preferred envs
const rawModelBase =
  (import.meta.env.VITE_API_URL as string | undefined) ??
  (import.meta.env.NEXT_PUBLIC_BACKEND_URL as string | undefined) ??
  "";
const MODEL_BASE = rawModelBase.replace(/\/$/, "");

// External services — allow separate envs for production
const AI_BASE = (import.meta.env.VITE_AI_API_URL as string | undefined)?.replace(/\/$/, "");
const PLAG_BASE = (import.meta.env.VITE_PLAG_API_URL as string | undefined)?.replace(/\/$/, "");

const normalizePath = (path: string) => (path.startsWith("/") ? path : `/${path}`);

const buildAiUrl = (path: string) => {
  const p = normalizePath(path);
  if (AI_BASE) return `${AI_BASE}${p}`;
  // In dev, use Vite proxy at /api/ai
  if (isDev) return `/api/ai${p}`;
  // Fallback (prod without env) — will likely need VITE_AI_API_URL set
  return `/api/ai${p}`;
};

const buildPlagUrl = (path: string) => {
  const p = normalizePath(path);
  if (PLAG_BASE) return `${PLAG_BASE}${p}`;
  if (isDev) return `/api/plag${p}`;
  return `/api/plag${p}`;
};

const buildModelUrl = (path: string) => {
  const p = normalizePath(path);
  if (MODEL_BASE) return `${MODEL_BASE}${p}`;
  // In dev, use local proxy at /api/model
  if (isDev) return `/api/model${p}`;
  // As a last resort, try the raw path (assumes same-origin routing)
  return p;
};

const Dashboard = () => {
  const [searchParams] = useSearchParams();
  const [inputText, setInputText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [detectionScore, setDetectionScore] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [tone, setTone] = useState("formal");
  const [activeTab, setActiveTab] = useState("analyze");
  const [aiLabel, setAiLabel] = useState<string | null>(null);
  const [aiComponents, setAiComponents] = useState<Record<string, number> | null>(null);
  const [plagScore, setPlagScore] = useState<number | null>(null);
  const [plagUrls, setPlagUrls] = useState<string[]>([]);
  const [rephrasedText, setRephrasedText] = useState("");
  const [rephraseMode, setRephraseMode] = useState<"simple" | "advanced">("simple");
  const [advOptions, setAdvOptions] = useState<Array<{ sentence: string; options: string[] }> | null>(null);
  const [advSelection, setAdvSelection] = useState<Record<number, number>>({});
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStep, setLoadingStep] = useState<string>("");
  const [analysisType, setAnalysisType] = useState<"ai-score" | "plagiarism">("ai-score");
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // Handle mode parameter from URL
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode && ["analyze", "rewrite", "rephrase"].includes(mode)) {
      setActiveTab(mode);
    }
  }, [searchParams]);

  // Simulate progress with steps
  const simulateProgress = (steps: Array<{ progress: number; message: string }>) => {
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        setLoadingProgress(steps[currentStep].progress);
        setLoadingStep(steps[currentStep].message);
        currentStep++;
      } else {
        clearInterval(interval);
      }
    }, 800); // Change step every 800ms
    
    return () => clearInterval(interval);
  };

  // Handle cancel operation
  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    setAnalyzing(false);
    setLoadingMessage("");
    setLoadingProgress(0);
    setLoadingStep("");
    toast.info("Operation cancelled");
  };

  // Parse the Gradio result string into structured sentence options
  const parseAdvancedOptions = (raw: unknown): Array<{ sentence: string; options: string[] }> => {
    let textBlob = "";
    if (typeof raw === "string") {
      textBlob = raw;
    } else if (Array.isArray(raw) && typeof raw[0] === "string") {
      textBlob = raw[0] as string;
    } else {
      return [];
    }
    // Normalize newlines
    const normalized = textBlob.replace(/\r\n?/g, "\n");
    // Split by blank lines to get blocks per sentence
    const blocks = normalized
      .split(/\n\s*\n+/)
      .map((b) => b.trim())
      .filter(Boolean);

    const results: Array<{ sentence: string; options: string[] }> = [];
    for (const block of blocks) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const sentenceMatch = lines[0].match(/^Sentence\s*\d+\s*:\s*(.+)$/i);
      const sentence = sentenceMatch ? sentenceMatch[1].trim() : lines[0];
      const options: string[] = [];
      for (const line of lines.slice(1)) {
        const m = line.match(/^Option\s*\d+\s*:\s*(.+)$/i);
        if (m && m[1]) options.push(m[1].trim());
      }
      if (options.length) {
        results.push({ sentence, options });
      }
    }
    return results;
  };

  const handleAnalyze = async () => {
    // choose the text to analyze based on active tab
    const textToAnalyze =
      activeTab === "rewrite" ? rewrittenText : activeTab === "rephrase" ? rephrasedText : inputText;

    if (!textToAnalyze.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    
    setAnalyzing(true);
    setLoadingMessage(analysisType === "ai-score" ? "Analyzing AI content..." : "Checking for plagiarism...");
    setLoadingProgress(0);
    
    // Define progress steps based on analysis type
    const progressSteps = analysisType === "ai-score"
      ? [
          { progress: 20, message: "Preparing text for analysis..." },
          { progress: 40, message: "Running AI detection models..." },
          { progress: 60, message: "Analyzing language patterns..." },
          { progress: 80, message: "Computing AI probability..." },
          { progress: 95, message: "Finalizing results..." },
        ]
      : [
          { progress: 20, message: "Preparing text for plagiarism check..." },
          { progress: 40, message: "Searching content databases..." },
          { progress: 60, message: "Comparing with sources..." },
          { progress: 80, message: "Identifying matches..." },
          { progress: 95, message: "Finalizing results..." },
        ];
    
    const cleanup = simulateProgress(progressSteps);
    
    try {
      if (analysisType === "ai-score") {
        // Call AI detection API only
        const aiEndpoint = buildModelUrl("/model/ai-score");
        const res = await fetch(aiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: textToAnalyze }),
          signal: controller.signal,
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          // ignore
        }

        if (res.status === 429) {
          const msg = json?.error || "Too many requests. Please try again in a few minutes.";
          throw new Error(msg);
        }

        if (!res.ok) {
          const msg = json?.error || res.statusText || "AI score request failed";
          throw new Error(`AI detection API error (${res.status}): ${msg}`);
        }

        if (!json || json.ok !== true || !json.data) {
          const msg = json?.error || "Unexpected AI score response format";
          throw new Error(msg);
        }

        let payload = json.data as
          | {
              final_score: number;
              label?: string;
              components?: Record<string, number>;
            }
          | Array<{
              final_score: number;
              label?: string;
              components?: Record<string, number>;
            }>;

        if (Array.isArray(payload)) {
          payload = payload[0];
        }

        if (!payload || typeof payload !== "object" || payload.final_score === undefined) {
          throw new Error("AI score response missing expected fields");
        }

        const { final_score, label, components } = payload;
        // final_score is already a percentage (0-100), no need to multiply
        const scorePct = Math.max(0, Math.min(100, Math.round(final_score ?? 0)));
        setDetectionScore(scorePct);
        setAiLabel(label ?? null);
        setAiComponents(components ?? null);
        
        // Clear plagiarism results
        setPlagScore(null);
        setPlagUrls([]);
        
        toast.success("AI analysis complete!");
      } else {
        // Call plagiarism API only
        const plagEndpoint = buildModelUrl("/model/plagiarism-check");
        const res = await fetch(plagEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text: textToAnalyze }),
          signal: controller.signal,
        });

        let json: any = null;
        try {
          json = await res.json();
        } catch {
          // ignore
        }

        if (res.status === 429) {
          const msg = json?.error || "Too many requests. Please try again in a few minutes.";
          throw new Error(msg);
        }

        if (!res.ok) {
          const msg = json?.error || res.statusText || "Plagiarism request failed";
          throw new Error(`Plagiarism API error (${res.status}): ${msg}`);
        }

        if (!json || json.ok !== true || !json.data) {
          const msg = json?.error || "Unexpected plagiarism response format";
          throw new Error(msg);
        }

        let payload = json.data as
          | { score?: number; urls?: string[] }
          | Array<{ score?: number; urls?: string[] }>;

        if (Array.isArray(payload)) {
          payload = payload[0];
        }

        if (!payload || typeof payload !== "object") {
          throw new Error("Plagiarism response missing expected fields");
        }

        const { score, urls } = payload;
        const val = typeof score === "number" ? score : Number(score);
        setPlagScore(Number.isFinite(val) ? val : null);
        setPlagUrls(Array.isArray(urls) ? urls : []);
        
        // Clear AI detection results
        setDetectionScore(0);
        setAiLabel(null);
        setAiComponents(null);
        
        toast.success("Plagiarism check complete!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during analysis";
      // Don't show error if user cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      toast.error(message);
    } finally {
      cleanup();
      setAbortController(null);
      setLoadingProgress(100);
      setLoadingStep("Complete!");
      setTimeout(() => {
        setAnalyzing(false);
        setLoadingMessage("");
        setLoadingProgress(0);
        setLoadingStep("");
      }, 500);
    }
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to rewrite");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    setAnalyzing(true);
    setLoadingMessage("Rewriting your text...");
    setLoadingProgress(0);
    
    // Define progress steps for rewriting
    const progressSteps = [
      { progress: 20, message: "Analyzing original text structure..." },
      { progress: 40, message: "Applying tone transformations..." },
      { progress: 60, message: "Enhancing readability..." },
      { progress: 80, message: "Polishing final output..." },
      { progress: 95, message: "Almost done..." },
    ];
    
    const cleanup = simulateProgress(progressSteps);
    
    try {
      const endpoint = buildModelUrl("/model/tone-rewrite");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ text: inputText, tone }),
        signal: controller.signal,
      });

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // ignore
      }

      if (res.status === 429) {
        const msg = json?.error || "Too many requests. Please try again in a few minutes.";
        throw new Error(msg);
      }

      if (!res.ok) {
        const msg = json?.error || res.statusText || "Rewrite request failed";
        throw new Error(`Rewrite API error (${res.status}): ${msg}`);
      }

      if (!json || json.ok !== true) {
        const msg = json?.error || "Unexpected rewrite response format";
        throw new Error(msg);
      }

      // Extract rewritten text from flexible data shape
      const data = json.data;
      let rewritten: string | null = null;
      const tryExtract = (val: any): string | null => {
        if (typeof val === "string") return val;
        if (Array.isArray(val)) {
          // Prefer first string; else if first item has .text
          if (typeof val[0] === "string") return val[0] as string;
          if (val[0] && typeof val[0] === "object" && typeof val[0].text === "string") return val[0].text;
        }
        if (val && typeof val === "object") {
          if (typeof val.text === "string") return val.text;
          // Some spaces might return under different keys
          const candidates = ["output", "result", "content"] as const;
          for (const key of candidates) {
            if (typeof val[key] === "string") return val[key] as string;
            if (Array.isArray(val[key]) && typeof val[key][0] === "string") return val[key][0] as string;
          }
        }
        return null;
      };
      rewritten = tryExtract(data);

      if (!rewritten) {
        throw new Error("Could not parse rewritten text from response");
      }

      setRewrittenText(rewritten);
      setActiveTab("rewrite");
      toast.success("Text rewritten successfully!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during rewrite";
      // Don't show error if user cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      toast.error(message);
    } finally {
      cleanup();
      setAbortController(null);
      setLoadingProgress(100);
      setLoadingStep("Complete!");
      setTimeout(() => {
        setAnalyzing(false);
        setLoadingMessage("");
        setLoadingProgress(0);
        setLoadingStep("");
      }, 500);
    }
  };

  const handleRephrase = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to rephrase");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);

    setAnalyzing(true);
    setLoadingMessage(rephraseMode === "advanced" ? "Generating rephrase options..." : "Rephrasing your text...");
    setLoadingProgress(0);
    
    // Define progress steps for rephrasing
    const progressSteps = rephraseMode === "advanced" 
      ? [
          { progress: 15, message: "Breaking text into sentences..." },
          { progress: 35, message: "Generating alternative phrasings..." },
          { progress: 55, message: "Creating variation options..." },
          { progress: 75, message: "Optimizing suggestions..." },
          { progress: 90, message: "Preparing options for selection..." },
        ]
      : [
          { progress: 25, message: "Analyzing sentence structure..." },
          { progress: 50, message: "Generating rephrased version..." },
          { progress: 75, message: "Refining output..." },
          { progress: 95, message: "Finalizing..." },
        ];
    
    const cleanup = simulateProgress(progressSteps);
    
    try {
      if (rephraseMode === "advanced") {
  // Fetch per-sentence options
  const res = await fetch(buildModelUrl("/model/rephrase-options"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Rephrase Options API failed:", res.status, text);
          toast.error(`Rephrase Options API error (${res.status}): ${text || res.statusText}`);
          cleanup();
          setAnalyzing(false);
          setLoadingMessage("");
          setLoadingProgress(0);
          setLoadingStep("");
          return;
        }
        const json: { ok?: boolean; data?: unknown } = await res.json();
        if (!json || json.ok !== true) {
          console.error("Rephrase options returned non-ok:", json);
          toast.error(`Rephrase Options API returned error: ${(json as any)?.error || JSON.stringify(json)}`);
          cleanup();
          setAnalyzing(false);
          setLoadingMessage("");
          setLoadingProgress(0);
          setLoadingStep("");
          return;
        }
        const parsed = parseAdvancedOptions((json as any).data);
        if (!parsed.length) {
          console.error("Parsed options empty, raw data:", (json as any).data);
          toast.error("Could not parse rephrase options from response");
          cleanup();
          setAnalyzing(false);
          setLoadingMessage("");
          setLoadingProgress(0);
          setLoadingStep("");
          return;
        }
        setAdvOptions(parsed);
        setAdvSelection({});
        setRephrasedText("");
        setActiveTab("rephrase");
        toast.success("Options fetched. Select one per sentence.");
      } else {
  // Simple mode
  const res = await fetch(buildModelUrl("/model/rephrase"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: inputText }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          console.error("Rephrase API failed:", res.status, text);
          toast.error(`Rephrase API error (${res.status}): ${text || res.statusText}`);
          cleanup();
          setAnalyzing(false);
          setLoadingMessage("");
          setLoadingProgress(0);
          setLoadingStep("");
          return;
        }
        const json: { ok?: boolean; data?: unknown } = await res.json();
        if (json && json.ok && Array.isArray(json.data) && typeof json.data[0] === "string") {
          setRephrasedText(json.data[0]);
        } else if (json && typeof (json as any).data === "string") {
          setRephrasedText((json as any).data as string);
        } else {
          throw new Error("Unexpected rephrase response format");
        }
        setActiveTab("rephrase");
        toast.success("Text rephrased successfully!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error during rephrase";
      // Don't show error if user cancelled
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      toast.error(message);
    } finally {
      cleanup();
      setAbortController(null);
      setLoadingProgress(100);
      setLoadingStep("Complete!");
      setTimeout(() => {
        setAnalyzing(false);
        setLoadingMessage("");
        setLoadingProgress(0);
        setLoadingStep("");
      }, 500);
    }
  };

  const applyAdvancedSelection = () => {
    if (!advOptions || !advOptions.length) return;
    const missing = advOptions.some((_, i) => advSelection[i] === undefined);
    if (missing) {
      toast.error("Please select one option for each sentence");
      return;
    }
    const combined = advOptions
      .map((s, i) => s.options[advSelection[i]] || "")
      .join(" ")
      .trim();
    setRephrasedText(combined);
    toast.success("Combined rephrased text ready");
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    const text = activeTab === "analyze" ? inputText : activeTab === "rewrite" ? rewrittenText : rephrasedText;
    if (!text.trim()) {
      toast.error("Nothing to download");
      return;
    }
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      activeTab === "analyze"
        ? "analysis-input.txt"
        : activeTab === "rewrite"
        ? "rewritten-text.txt"
        : "rephrased-text.txt";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const formattedComponents = useMemo(() => {
    if (!aiComponents) return [] as Array<{ key: string; value: number }>;
    return Object.entries(aiComponents)
      .map(([k, v]) => ({ key: k, value: Math.round((v ?? 0) * 100) }))
      .sort((a, b) => b.value - a.value);
  }, [aiComponents]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      {/* Loading Overlay */}
      {analyzing && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-[90%] max-w-md shadow-2xl border-2">
            <CardContent className="pt-6 pb-6">
              <div className="flex flex-col items-center justify-center space-y-6">
                {/* Animated Icon */}
                <div className="relative">
                  <Loader2 className="h-16 w-16 animate-spin text-primary" />
                  <div className="absolute inset-0 h-16 w-16 animate-ping opacity-20">
                    <Sparkles className="h-16 w-16 text-primary" />
                  </div>
                </div>
                
                {/* Main Message */}
                <div className="space-y-2 text-center">
                  <h3 className="text-lg font-semibold">{loadingMessage || "Processing..."}</h3>
                  <p className="text-sm text-muted-foreground">
                    This may take a few moments. Please wait...
                  </p>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span className="font-medium">{loadingStep || "Initializing..."}</span>
                    <span className="font-bold">{loadingProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden border border-border">
                    <div 
                      className="h-full bg-gradient-to-r from-primary via-primary/90 to-secondary transition-all duration-500 ease-out relative overflow-hidden"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      {/* Animated shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                           style={{ 
                             backgroundSize: '200% 100%',
                             animation: 'shimmer 2s infinite'
                           }} 
                      />
                    </div>
                  </div>
                  
                  {/* Progress Steps Indicator */}
                  <div className="flex justify-between pt-2">
                    {[0, 25, 50, 75, 100].map((step) => (
                      <div 
                        key={step} 
                        className={`flex flex-col items-center transition-all duration-300 ${
                          loadingProgress >= step ? 'opacity-100' : 'opacity-30'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          loadingProgress >= step 
                            ? 'bg-primary scale-125' 
                            : 'bg-muted-foreground scale-100'
                        }`} />
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Cancel Button */}
                <Button 
                  variant="outline" 
                  className="w-full gap-2 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">AI Content Analysis</h1>
          <p className="text-muted-foreground">
            Detect AI-generated content and rewrite it to sound more natural
          </p>
        </div>

        {/* Centralized Mode Tabs */}
        <div className="mb-8 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="analyze">Analyze</TabsTrigger>
              <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
              <TabsTrigger value="rephrase">Rephrase</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={`grid grid-cols-1 gap-6 transition-all duration-500 ease-in-out ${
          activeTab === "analyze" ? "lg:grid-cols-3" : "lg:grid-cols-1"
        }`}>
          {/* Main Content Area */}
          <div className={`space-y-6 transition-all duration-500 ease-in-out ${
            activeTab === "analyze" ? "lg:col-span-2" : "lg:col-span-1 lg:max-w-5xl lg:mx-auto lg:w-full"
          }`}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="analyze" className="mt-0 animate-slide-up">
                <TextEditor
                  value={inputText}
                  onChange={setInputText}
                  placeholder="Paste your text here to analyze for AI-generated content..."
                  title="Input Text"
                />
              </TabsContent>

              <TabsContent value="rewrite" className="mt-0 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextEditor
                    value={inputText}
                    onChange={setInputText}
                    placeholder="Original text..."
                    title="Original"
                  />
                  <TextEditor
                    value={rewrittenText}
                    onChange={setRewrittenText}
                    placeholder="Rewritten text will appear here..."
                    title="Rewritten"
                  />
                </div>
              </TabsContent>

              <TabsContent value="rephrase" className="mt-0 animate-slide-up">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextEditor
                    value={inputText}
                    onChange={setInputText}
                    placeholder="Original text..."
                    title="Original"
                  />
                  <TextEditor
                    value={rephrasedText}
                    onChange={setRephrasedText}
                    placeholder={advOptions?.length ? "Select options below and click Apply" : "Rephrased text will appear here..."}
                    title="Rephrased"
                  />
                </div>

                {advOptions?.length ? (
                  <Card className="mt-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Advanced Options</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {advOptions.map((item, idx) => (
                        <div key={idx} className="space-y-2">
                          <p className="text-sm font-medium">Sentence {idx + 1}</p>
                          <p className="text-sm text-muted-foreground">{item.sentence}</p>
                          <RadioGroup
                            value={advSelection[idx]?.toString() ?? ""}
                            onValueChange={(val) =>
                              setAdvSelection((prev) => ({ ...prev, [idx]: Number(val) }))
                            }
                            className="mt-2 space-y-1"
                          >
                            {item.options.map((opt, oidx) => (
                              <div key={oidx} className="flex items-center space-x-2">
                                <RadioGroupItem value={String(oidx)} id={`s${idx}-o${oidx}`} />
                                <Label htmlFor={`s${idx}-o${oidx}`} className="text-sm leading-snug">
                                  {opt}
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </div>
                      ))}

                      <div className="flex justify-end">
                        <Button onClick={applyAdvancedSelection} disabled={analyzing} variant="secondary">
                          Apply Selection
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <Card className="shadow-medium animate-slide-up">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {activeTab === "analyze" && (
                  <div className="flex items-center gap-2">
                    <Select value={analysisType} onValueChange={(v) => setAnalysisType(v as any)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Analysis type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai-score">AI Detection</SelectItem>
                        <SelectItem value="plagiarism">Plagiarism Check</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="gradient-primary"
                    >
                      {analyzing ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Analyze Text
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {activeTab === "rewrite" && (
                  <div className="flex items-center gap-2">
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="humorous">Humorous</SelectItem>
                        <SelectItem value="narrative">Narrative</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      onClick={handleRewrite}
                      disabled={analyzing}
                      variant="secondary"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rewrite
                    </Button>
                  </div>
                )}

                {activeTab === "rephrase" && (
                  <div className="flex items-center gap-2">
                    <Select value={rephraseMode} onValueChange={(v) => setRephraseMode(v as any)}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Rephrase mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button onClick={handleRephrase} disabled={analyzing} variant="secondary">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Rephrase
                    </Button>
                  </div>
                )}

                {activeTab !== "analyze" && (
                  <div className="ml-auto flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        handleCopy(
                          activeTab === "rewrite" ? rewrittenText : rephrasedText
                        )
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleDownload}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Only show in analyze mode with smooth transition */}
          {activeTab === "analyze" && (
            <div className="space-y-6 animate-slide-up">
              {analysisType === "ai-score" ? (
                <>
                  <DetectionScore score={detectionScore} analyzing={analyzing} label={aiLabel} />

                  {/* AI Model Details */}
                  {/* <Card className="shadow-medium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">AI Model Insights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Label: </span>
                        <span className="font-medium">
                          {analyzing ? "--" : aiLabel ?? "N/A"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-muted-foreground">Model components</p>
                        {analyzing ? (
                          <p className="text-xs text-muted-foreground">Analyzing...</p>
                        ) : formattedComponents.length ? (
                          <ul className="space-y-1">
                            {formattedComponents.map((c) => (
                              <li key={c.key} className="flex justify-between text-xs">
                                <span className="capitalize">{c.key.replace(/[-_]/g, " ")}</span>
                                <span className="font-medium">{c.value}%</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No component data</p>
                        )}
                      </div>
                    </CardContent>
                  </Card> */}
                </>
              ) : (
                <>
                  {/* Plagiarism Results */}
                  <Card className="shadow-medium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Plagiarism Check</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold">
                          {analyzing ? "--" : plagScore !== null ? plagScore.toFixed(2) : "--"}
                        </span>
                        <span className="text-muted-foreground mb-1">%</span>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Matching sources</p>
                        {analyzing ? (
                          <p className="text-xs text-muted-foreground">Analyzing...</p>
                        ) : plagUrls.length ? (
                          <ul className="list-disc pl-4 space-y-1 text-xs break-all">
                            {plagUrls.map((u, idx) => (
                              <li key={`${u}-${idx}`}>
                                <a
                                  href={u}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  className="text-primary hover:underline"
                                >
                                  {u}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground">No matches found</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Quick Tips - Always show */}
              <Card className="shadow-medium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                      1
                    </div>
                    <p>Paste your text in the input area to get started</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                      2
                    </div>
                    <p>Select analysis type: AI Detection or Plagiarism Check</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                      3
                    </div>
                    <p>Click "Analyze Text" to get results</p>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                      4
                    </div>
                    <p>Use "Rewrite" to make the text sound more natural</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
