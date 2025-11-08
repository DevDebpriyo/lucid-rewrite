import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Copy, Download, KeyRound, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import type { ApiKeyEnv, ListedKey, CreateKeyResponse } from "@/lib/apiKeys";
import { listKeys, createKey, revokeKey, callRephraseWithApiKey } from "@/lib/apiKeys";

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") || "";

function formatKeyPreview(_env: ApiKeyEnv, _keyId: string) {
  // Per request: do not reveal any part of the key or id. Show only the prefix then mask.
  return "sk_...";
}

function formatDate(iso?: string) {
  if (!iso) return "--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

export default function ApiKeys() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState<{ open: boolean; id?: string; name?: string }>({ open: false });

  // create form
  const [name, setName] = useState("");
  const [env, setEnv] = useState<ApiKeyEnv>("test");
  const [scopes, setScopes] = useState<string>("");

  // show-once key modal
  const [created, setCreated] = useState<CreateKeyResponse | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["api-keys"],
    queryFn: () => listKeys(),
    staleTime: 10_000,
  });

  const createMut = useMutation({
    mutationFn: (payload: { name?: string; env?: ApiKeyEnv; scopes?: string[] }) => createKey(payload),
    onSuccess: async (res) => {
      setCreated(res);
      setCreateOpen(false);
      setName("");
      setScopes("");
      setEnv("test");
      await qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any) => {
      const status = e?.status as number | undefined;
      const msg = e?.message as string | undefined;
      if (status === 401) toast.error("Your session expired. Please sign in again.");
      else if (status === 403) toast.error("You don't have permission to create API keys.");
      else if (status === 429) toast.error("Rate limit exceeded. Please wait and try again.");
      else toast.error(msg || "Failed to create key");
    },
  });

  const revokeMut = useMutation({
    mutationFn: (id: string) => revokeKey(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["api-keys"] });
      const previous = qc.getQueryData<ListedKey[]>(["api-keys"]);
      if (previous) {
        qc.setQueryData<ListedKey[]>(["api-keys"], previous.filter((k) => k._id !== id));
      }
      return { previous } as { previous?: ListedKey[] };
    },
    onSuccess: async () => {
      toast.success("Key deleted");
      setConfirmRevoke({ open: false });
      await qc.invalidateQueries({ queryKey: ["api-keys"] });
    },
    onError: (e: any, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(["api-keys"], ctx.previous);
      const status = e?.status as number | undefined;
      const msg = e?.message as string | undefined;
      if (status === 401) toast.error("Your session expired. Please sign in again.");
      else toast.error(msg || "Failed to delete key");
    },
  });

  const keys = data || [];

  // Dev tryout section state (client-side only; don't persist keys)
  const [tryKey, setTryKey] = useState("");
  const [tryText, setTryText] = useState("Hello world");
  const [tryAction, setTryAction] = useState<"rephrase" | "rewrite" | "ai-score" | "plagiarism">("rephrase");
  const [tryLoading, setTryLoading] = useState(false);
  const [tryResult, setTryResult] = useState<{ status: number; ok: boolean; body: any; rate?: { limit?: string | null; remaining?: string | null; reset?: string | null } } | null>(null);

  const handleCreate = () => {
    const payload = {
      name: name.trim() || undefined,
      env,
      scopes: scopes.trim() ? scopes.split(/[,\s]+/).filter(Boolean) : undefined,
    };
    createMut.mutate(payload);
  };

  const maskScopes = (arr?: string[]) => (arr && arr.length ? arr.join(", ") : "-");

  const statusBadge = (k: ListedKey) => {
    const isRev = k.revoked?.isRevoked;
    return (
      <Badge variant={isRev ? "destructive" : "default"}>{isRev ? "revoked" : "active"}</Badge>
    );
  };

  const emptyState = isLoading ? (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading keys...
    </div>
  ) : (
    <div className="py-16 text-center">
      <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
        <KeyRound className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">No API keys yet. Create your first one.</p>
    </div>
  );

  const errorBanner = isError ? (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive px-4 py-2 text-sm">
      {(error as any)?.message || "Failed to fetch keys"}
    </div>
  ) : null;

  const handleCopy = async (text: string, label = "Copied") => {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  };

  const handleDownloadTxt = (filename: string, contents: string) => {
    const blob = new Blob([contents], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const tryCall = async () => {
    if (!tryKey.trim()) {
      toast.error("Enter an API key to test");
      return;
    }
    setTryLoading(true);
    setTryResult(null);
    try {
      const path =
        tryAction === "rephrase"
          ? "/model/rephrase"
          : tryAction === "rewrite"
          ? "/model/tone-rewrite"
          : tryAction === "ai-score"
          ? "/model/ai-score"
          : "/model/plagiarism-check";

      const res = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": tryKey.trim(),
        },
        body: JSON.stringify(
          tryAction === "rewrite" ? { text: tryText, tone: "formal" } : { text: tryText }
        ),
      });
      const rate = {
        limit: res.headers.get("X-RateLimit-Limit"),
        remaining: res.headers.get("X-RateLimit-Remaining"),
        reset: res.headers.get("X-RateLimit-Reset"),
      };
      const body = await res.json().catch(() => ({}));
      const result = { ok: res.ok, status: res.status, body, rate } as const;
      setTryResult(result as any);
      if (res.status === 402) {
        toast.error("Quota exceeded. Upgrade to continue.");
      } else if (!res.ok) {
        if (res.status === 401) toast.error("Invalid or revoked API key.");
        else if (res.status === 403) toast.error("Insufficient scope for this endpoint.");
        else if (res.status === 429) toast.error("Rate limit exceeded. Check reset header and retry later.");
        else toast.error(body?.error || `Request failed (${res.status})`);
      } else {
        toast.success("Request successful");
      }
    } catch (e: any) {
      toast.error(e?.message || "Request failed");
    } finally {
      setTryLoading(false);
    }
  };

  const snippetCurl = useMemo(() => {
    const base = API_BASE || "$BASE_URL";
    return "curl -X POST " + base + "/v1/model/rephrase \\\n+  -H \"Content-Type: application/json\" \\\n+  -H \"x-api-key: sk_test_AbC123def456.XYZ...\" \\\n+  -d '{\\\"text\\\":\\\"Hello\\\"}'";
  }, []);

  const snippetFetch = useMemo(() => {
    const base = API_BASE || "http://localhost:5000";
    return (
      "const BASE_URL = '" + base + "';\n" +
      "// Do NOT embed user keys in public client bundles. Store on server/env.\n" +
      "async function rephrase(text) {\n" +
      "  const res = await fetch(`${BASE_URL}/v1/model/rephrase`, {\n" +
      "    method: 'POST',\n" +
      "    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.MY_API_KEY },\n" +
      "    body: JSON.stringify({ text })\n" +
      "  });\n" +
      "  if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || `HTTP ${res.status}`);\n" +
      "  return res.json();\n" +
      "}"
    );
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="text-muted-foreground">Create and manage keys for accessing the public AI API.</p>
          </div>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary"><Plus className="h-4 w-4 mr-2"/>Create Key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>Optionally name your key and choose environment.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" className="col-span-3" placeholder="My key" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Environment</Label>
                  <div className="col-span-3">
                    <Select value={env} onValueChange={(v) => setEnv(v as ApiKeyEnv)}>
                      <SelectTrigger><SelectValue placeholder="Select env"/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">test</SelectItem>
                        <SelectItem value="live">live</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="scopes" className="text-right">Scopes</Label>
                  <Input id="scopes" className="col-span-3" placeholder="Optional, e.g. rephrase ai-score" value={scopes} onChange={(e) => setScopes(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMut.isPending}>{createMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Creating...</> : "Create"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {errorBanner}

        <Card className="mb-8">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Your Keys</CardTitle>
          </CardHeader>
          <CardContent>
            {!keys.length ? (
              emptyState
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Env</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Last used</TableHead>
                      <TableHead>Scopes</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {keys.map((k) => (
                      <TableRow key={k._id}>
                        <TableCell className="font-medium">{k.name || "–"}</TableCell>
                        <TableCell>
                          <Badge variant={k.env === "live" ? "default" : "secondary"}>{k.env}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{formatKeyPreview(k.env, k.keyId)}</TableCell>
                        <TableCell>{formatDate(k.createdAt)}</TableCell>
                        <TableCell>{formatDate(k.lastUsedAt)}</TableCell>
                        <TableCell>{maskScopes(k.scopes)}</TableCell>
                        <TableCell>{statusBadge(k)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={revokeMut.isPending}
                            onClick={() => setConfirmRevoke({ open: true, id: k._id, name: k.name })}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Developer usage/help */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">How to use your key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p className="text-muted-foreground">
                Send requests to our public endpoints with your API key in <code className="font-mono">x-api-key</code> or <code className="font-mono">Authorization: Bearer</code> header.
                Keys are shown only once on creation. Store them securely.
              </p>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="font-medium">curl</span><Button size="sm" variant="outline" onClick={() => handleCopy(snippetCurl, "Copied curl")}>Copy</Button></div>
                <pre className="p-3 rounded-md bg-muted overflow-auto text-xs"><code>{snippetCurl}</code></pre>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><span className="font-medium">fetch</span><Button size="sm" variant="outline" onClick={() => handleCopy(snippetFetch, "Copied snippet")}>Copy</Button></div>
                <pre className="p-3 rounded-md bg-muted overflow-auto text-xs"><code>{snippetFetch}</code></pre>
              </div>
              <div className="text-xs text-muted-foreground">
                Rate limit headers: <code className="font-mono">X-RateLimit-Limit</code>, <code className="font-mono">X-RateLimit-Remaining</code>, <code className="font-mono">X-RateLimit-Reset</code>.
                Common errors: 401 invalid_api_key, 403 insufficient_scope, 429 rate_limit_exceeded, 5xx inference_failed/api_key_auth_error.
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Try the API (client-side demo)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2">
                <Label>API key</Label>
                <Input value={tryKey} onChange={(e) => setTryKey(e.target.value)} placeholder="sk_..." type="password" />
              </div>
              <div className="grid gap-2">
                <Label>Text</Label>
                <Input value={tryText} onChange={(e) => setTryText(e.target.value)} />
              </div>
              <div className="flex gap-2 items-center">
                <Select value={tryAction} onValueChange={(v) => setTryAction(v as any)}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Select action" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rephrase">Rephrase</SelectItem>
                    <SelectItem value="rewrite">Rewrite</SelectItem>
                    <SelectItem value="ai-score">Ai-score</SelectItem>
                    <SelectItem value="plagiarism">Plagiarism</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={tryCall} disabled={tryLoading}>
                  {tryLoading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Sending...</>
                  ) : (
                    `Test ${tryAction}`
                  )}
                </Button>
              </div>
              {tryResult && (
                <div className="text-xs space-y-2">
                  <div className="flex gap-4 flex-wrap">
                    <span>Status: <span className="font-mono">{tryResult.status}</span></span>
                    <span>Limit: <span className="font-mono">{tryResult.rate?.limit ?? "-"}</span></span>
                    <span>Remaining: <span className="font-mono">{tryResult.rate?.remaining ?? "-"}</span></span>
                    <span>Reset: <span className="font-mono">{tryResult.rate?.reset ?? "-"}</span></span>
                  </div>
                  <pre className="p-3 rounded-md bg-muted overflow-auto"><code>{JSON.stringify(tryResult.body, null, 2)}</code></pre>
                </div>
              )}
              <p className="text-xs text-muted-foreground">Note: This demo runs in your browser. Do not hardcode keys in production client apps—keep them in server-side env variables or secret managers.</p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />

      {/* Show-once key reveal modal */}
      <Dialog open={!!created} onOpenChange={(open) => { if (!open) setCreated(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new API key</DialogTitle>
            <DialogDescription>
              Copy and store this key now. You will only see it once.
            </DialogDescription>
          </DialogHeader>
          {created ? (
            <div className="space-y-4">
              <div className="grid gap-1 text-sm">
                <div><span className="text-muted-foreground">Name:</span> {created.name || "–"}</div>
                <div><span className="text-muted-foreground">Env:</span> {created.env}</div>
              </div>
              <div className="rounded-md border p-3 bg-muted/50">
                <div className="font-mono break-all text-sm">{created.key}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCopy(created.key, "Key copied")}><Copy className="h-4 w-4 mr-2"/>Copy</Button>
                <Button variant="outline" onClick={() => handleDownloadTxt("api-key.txt", created.key)}><Download className="h-4 w-4 mr-2"/>Download .txt</Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Security tip: We don’t store this secret client-side. Don’t share it or log it. Rotate or revoke compromised keys from this page.
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreated(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={confirmRevoke.open} onOpenChange={(open) => setConfirmRevoke((s) => ({ ...s, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this key?</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="text-sm text-muted-foreground">This action cannot be undone. The key will be permanently removed and any apps using it will stop working immediately.</div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmRevoke.id && revokeMut.mutate(confirmRevoke.id)}
              disabled={revokeMut.isPending}
            >
              {revokeMut.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
