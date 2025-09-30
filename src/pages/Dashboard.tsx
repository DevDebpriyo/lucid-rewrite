import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TextEditor } from "@/components/TextEditor";
import { DetectionScore } from "@/components/DetectionScore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const [inputText, setInputText] = useState("");
  const [rewrittenText, setRewrittenText] = useState("");
  const [detectionScore, setDetectionScore] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [tone, setTone] = useState("professional");
  const [activeTab, setActiveTab] = useState("analyze");

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to analyze");
      return;
    }

    setAnalyzing(true);
    // Simulate analysis
    setTimeout(() => {
      const randomScore = Math.floor(Math.random() * 100);
      setDetectionScore(randomScore);
      setAnalyzing(false);
      toast.success("Analysis complete!");
    }, 2000);
  };

  const handleRewrite = () => {
    if (!inputText.trim()) {
      toast.error("Please enter some text to rewrite");
      return;
    }

    setAnalyzing(true);
    // Simulate rewriting
    setTimeout(() => {
      setRewrittenText(`[Rewritten in ${tone} tone]\n\n${inputText}`);
      setActiveTab("rewrite");
      setAnalyzing(false);
      toast.success("Text rewritten successfully!");
    }, 2000);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold mb-2">AI Content Analysis</h1>
          <p className="text-muted-foreground">
            Detect AI-generated content and rewrite it to sound more natural
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analyze">Analyze</TabsTrigger>
                <TabsTrigger value="rewrite">Rewrite</TabsTrigger>
              </TabsList>

              <TabsContent value="analyze" className="mt-6">
                <TextEditor
                  value={inputText}
                  onChange={setInputText}
                  placeholder="Paste your text here to analyze for AI-generated content..."
                  title="Input Text"
                />
              </TabsContent>

              <TabsContent value="rewrite" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextEditor
                    value={inputText}
                    onChange={setInputText}
                    placeholder="Original text..."
                    title="Original"
                    readOnly
                  />
                  <TextEditor
                    value={rewrittenText}
                    onChange={setRewrittenText}
                    placeholder="Rewritten text will appear here..."
                    title="Rewritten"
                  />
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <Card className="shadow-medium">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
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

                <div className="flex items-center gap-2">
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Select tone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="creative">Creative</SelectItem>
                      <SelectItem value="academic">Academic</SelectItem>
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

                <div className="ml-auto flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleCopy(activeTab === "analyze" ? inputText : rewrittenText)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <DetectionScore score={detectionScore} analyzing={analyzing} />

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
                  <p>Click "Analyze Text" to detect AI-generated content</p>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0">
                    3
                  </div>
                  <p>Use "Rewrite" to make the text sound more natural</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
