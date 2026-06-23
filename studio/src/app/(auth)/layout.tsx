export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="grid min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(29,180,153,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(217,140,68,0.1),transparent_22%)] lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden border-r border-white/10 px-12 py-16 lg:flex lg:flex-col lg:justify-between">
        <div className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.32em] text-primary">
            Dsgnfi AI Studio
          </p>
          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-foreground">
              Serious campaign operations for an agency team that moves fast.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              The first release is focused on planning campaigns, shaping AI-ready brand context, reviewing output, and preparing content for manual publishing.
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">MVP boundaries</p>
            <p className="text-sm leading-6 text-muted-foreground">
              No direct publishing, scheduling, billing, or channel integrations yet. The workspace is optimized for strategy, review, and execution discipline.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-2 text-sm font-semibold text-foreground">Future-ready stack</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Supabase-ready auth and data layers are reserved, and all OpenAI access remains server-side from the start.
            </p>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-xl">{children}</div>
      </section>
    </main>
  );
}
