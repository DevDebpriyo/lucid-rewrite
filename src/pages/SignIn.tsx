import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormValues = z.infer<typeof schema>;

export default function SignIn() {
  const { user, signIn, signInUsingGoogle, status, initializing } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const { toast } = useToast();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const rawNext = new URLSearchParams(loc.search).get("next");
  const destination = rawNext && !rawNext.startsWith("/profile") ? rawNext : "/features";

  useEffect(() => {
    if (user) nav(destination, { replace: true });
  }, [user, destination, nav]);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      toast({ title: "Google sign in failed", description: "No credential received", variant: "destructive" });
      return;
    }
    
    try {
      await signInUsingGoogle(credentialResponse.credential);
      nav(destination, { replace: true });
    } catch (e: any) {
      toast({ title: "Google sign in failed", description: e?.message || "Unable to sign in with Google", variant: "destructive" });
    }
  };

  const handleGoogleError = () => {
    toast({ title: "Google sign in failed", description: "Unable to authenticate with Google", variant: "destructive" });
  };

  async function onSubmit(values: FormValues) {
    try {
  await signIn({ email: values.email, password: values.password });
  nav(destination, { replace: true });
    } catch (e: any) {
      toast({ title: "Sign in failed", description: e?.message || "Please check your credentials", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back. Enter your credentials to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                className="w-full"
                type="submit"
                disabled={form.formState.isSubmitting || initializing}
              >
                {form.formState.isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </Form>
          
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="mt-4">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
              width="100%"
            />
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          <span>Don't have an account?&nbsp;</span>
          <Link to={`/sign-up?next=${encodeURIComponent(destination)}`} className="text-primary hover:underline">
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
