import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { SamarkandBackdrop } from "@/components/SamarkandBackdrop";

export const Route = createFileRoute("/staff-login")({
  head: () => ({ meta: [{ title: "Saxovat — Boshqaruv" }, { name: "robots", content: "noindex" }] }),
  component: StaffLogin,
});

function StaffLogin() {
  const { loginStaff, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("+998");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && (role === "SUPER_ADMIN" || role === "CASHIER")) {
      navigate({ to: "/admin", replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    const cleanPhone = phone.replace(/\s+/g, "");
    if (!/^\+998\d{9}$/.test(cleanPhone)) {
      toast.error("Telefon raqamni to‘liq kiriting");
      return;
    }
    setLoading(true);
    try {
      await loginStaff(cleanPhone, password);
      await navigate({ to: "/admin", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page-background px-5 py-10">
      <SamarkandBackdrop />
      <div className="relative z-10 w-full max-w-sm">
        <Link to="/" className="samarkand-button-secondary mb-6 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold"><ArrowLeft className="h-4 w-4" /> Orqaga — menyuga</Link>
        <h1 className="font-display text-3xl font-bold text-foreground">Saxovat</h1>
        <p className="mt-2 mb-6 text-sm text-muted-foreground">Admin login</p>
        <form onSubmit={submit} className="space-y-5 rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div>
            <label htmlFor="staff-phone" className="mb-2 block text-sm font-semibold">Telefon raqam</label>
            <input id="staff-phone" type="tel" autoComplete="username" required value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-primary" />
          </div>
          <div>
            <label htmlFor="staff-password" className="mb-2 block text-sm font-semibold">Parol</label>
            <input id="staff-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-border bg-background px-3 focus-visible:outline-primary" />
          </div>
          <button type="submit" disabled={loading} className="samarkand-button-primary flex min-h-12 w-full items-center justify-center rounded-xl font-semibold">{loading ? <Loader2 className="h-5 w-5 animate-spin" aria-label="Yuklanmoqda" /> : "Kirish"}</button>
        </form>
      </div>
    </main>
  );
}
