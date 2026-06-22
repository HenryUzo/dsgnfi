import { cn } from "@/lib/utils";

type AuthFeedbackProps = {
  message: string | null | undefined;
  tone?: "error" | "success";
};

export function AuthFeedback({ message, tone = "error" }: AuthFeedbackProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-3 text-sm leading-6",
        tone === "success"
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          : "border-rose-500/20 bg-rose-500/10 text-rose-100",
      )}
    >
      {message}
    </div>
  );
}
