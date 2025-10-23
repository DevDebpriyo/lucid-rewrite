import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { listProducts, startCheckout } from "@/lib/payments";
import { useToast } from "@/components/ui/use-toast";

const Pricing = () => {
  const plans = [
    {
      name: "Monthly",
      price: "$29",
      billing: "month" as const,
      description: "Best for flexible, pay-as-you-go access",
      features: [
        "50,000 words per month",
        "Advanced AI detection",
        "All rewriting tones",
        "Priority support",
        "Export to PDF/Word",
        "Batch processing",
      ],
      cta: "Get Started",
      highlighted: false,
      type: "subscription" as const,
    },
    {
      name: "Yearly",
      price: "$289",
      billing: "year" as const,
      description: "Save more with an annual plan",
      features: [
        "50,000 words per month",
        "Advanced AI detection",
        "All rewriting tones",
        "Priority support",
        "Export to PDF/Word",
        "Great value for long-term use",
      ],
      cta: "Get Started",
      highlighted: true,
      type: "subscription" as const,
    },
  ];

  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Load products from backend (never call Dodo directly)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const items = await listProducts();
        if (mounted) setProducts(items);
      } catch (err: any) {
        toast({
          title: "Unable to load products",
          description: err?.message || String(err),
          variant: "destructive",
        });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [toast]);

  // Name-based matching as a reasonable default; adjust if your API exposes explicit mapping
  const productByName = useMemo(() => {
    const map = new Map<string, any>();
    for (const p of products || []) {
      const key = String(p?.name || "")
        .trim()
        .toLowerCase();
      if (key) map.set(key, p);
    }
    return map;
  }, [products]);

  async function handlePlanClick(plan: (typeof plans)[number]) {
    // Find product by name (case-insensitive). Customize if your backend uses different names.
    const key = plan.name.toLowerCase();
    const product = productByName.get(key) || null;
    const productId: string | undefined =
      product?.id || product?._id || product?.productId;

    if (!productId) {
      toast({
        title: "Product not found",
        description: `Couldn't find a matching product for "${plan.name}".`,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingId(productId);
      await startCheckout(productId, true);
      // startCheckout will redirect on success
    } catch (err: any) {
      toast({
        title: "Checkout failed",
        description: err?.message || String(err),
        variant: "destructive",
      });
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
            <h1 className="text-5xl font-bold mb-4">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-muted-foreground">
              Choose the perfect plan for your needs. No hidden fees.
            </p>
          </div>

          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
              {plans.map((plan) => (
                <div className="flex justify-center">
                  <Card
                    key={plan.name}
                    className={`w-full max-w-sm relative ${
                      plan.highlighted
                        ? "shadow-strong border-primary scale-105"
                        : "shadow-medium"
                    }`}
                  >
                    {plan.highlighted && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 gradient-primary text-primary-foreground text-sm font-medium rounded-full">
                        Most Popular
                      </div>
                    )}

                    <CardHeader className="text-center pb-8">
                      <CardTitle className="text-2xl mb-2">
                        {plan.name}
                      </CardTitle>
                      <div className="text-4xl font-bold mb-2">
                        {plan.price}
                        {
                          <span className="text-lg font-normal text-muted-foreground">
                            /{(plan as any).billing || "month"}
                          </span>
                        }
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-success flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={`w-full ${
                          plan.highlighted ? "gradient-primary" : ""
                        }`}
                        variant={plan.highlighted ? "default" : "outline"}
                        size="lg"
                        onClick={() => handlePlanClick(plan)}
                        disabled={Boolean(loadingId)}
                      >
                        {loadingId ? "Redirecting..." : plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 text-center text-muted-foreground">
            <p>All plans include a 14-day money-back guarantee</p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Pricing;
