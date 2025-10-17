import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Shield, Zap, CheckCircle, ArrowRight } from "lucide-react";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";
import heroImage from "@/assets/hero-bg.jpg";

const Landing = () => {
  const featuresAnimation = useScrollAnimation({ threshold: 0.2 });
  const ctaAnimation = useScrollAnimation({ threshold: 0.3 });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div
          className="absolute inset-0 z-0 opacity-10"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 z-0 bg-gradient-to-b from-background via-background/80 to-background" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Professional AI Detection & Rewriting
            </div>

            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Transform AI Content Into{" "}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Natural Writing
              </span>
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Detect AI-generated content and rewrite it to sound authentically human.
              Perfect for writers, students, and professionals.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/sign-up?next=/dashboard">
                <Button size="lg" className="gradient-primary text-lg px-8 shadow-strong">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8">
                View Demo
              </Button>
            </div>

            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>No Credit Card Required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>Instant Results</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-slide-up">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Humanize AI Content
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful tools to detect and transform AI-generated text into natural, authentic writing
            </p>
          </div>

          <div
            ref={featuresAnimation.elementRef}
            className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 ${
              featuresAnimation.isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Advanced AI Detection</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Accurately identify AI-generated content with our state-of-the-art detection
                algorithm. Get detailed confidence scores and highlighted sections.
              </CardContent>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-accent flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-accent-foreground" />
                </div>
                <CardTitle>Intelligent Rewriting</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Transform AI content into natural, human-like text while preserving meaning.
                Choose from multiple writing tones and styles.
              </CardContent>
            </Card>

            <Card className="shadow-medium hover:shadow-strong transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary-foreground" />
                </div>
                <CardTitle>Lightning Fast</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground">
                Get instant results with our optimized processing engine. Analyze and rewrite
                thousands of words in seconds.
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div
            ref={ctaAnimation.elementRef}
            className={`transition-all duration-700 ${
              ctaAnimation.isVisible
                ? "opacity-100 scale-100"
                : "opacity-0 scale-95"
            }`}
          >
            <Card className="gradient-primary text-primary-foreground shadow-strong">
              <CardContent className="p-12 text-center space-y-6">
                <h2 className="text-4xl font-bold">Ready to Get Started?</h2>
                <p className="text-lg opacity-90 max-w-2xl mx-auto">
                  Join thousands of writers, students, and professionals who trust AuthentiText
                  to transform their AI-generated content.
                </p>
                <Link to="/dashboard">
                  <Button size="lg" variant="secondary" className="text-lg px-8">
                    Start Analyzing Now
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Landing;
