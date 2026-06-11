import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";

import { ApiError } from "../../lib/api";
import { adminLogin } from "../../lib/cmsAdmin";
import { useAdmin } from "../../auth/useAdmin";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

export function AdminLogin() {
  const navigate = useNavigate();
  const { admin, loading, refresh } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && admin) {
      navigate("/admin", { replace: true });
    }
  }, [admin, loading, navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid credentials.";
      setError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await adminLogin(parsed.data.email, parsed.data.password);
      await refresh();
      toast.success("Welcome back.");
      navigate("/admin", { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Login failed.";
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.4em] text-white/40">
            Dsgnfi CMS
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Admin Login</h1>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-white focus:outline-none"
              placeholder="admin@dsgnfi.com"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-white/50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-white/40 focus:border-white focus:outline-none"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-white text-black py-3 text-xs uppercase tracking-[0.3em] hover:bg-white/90 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
