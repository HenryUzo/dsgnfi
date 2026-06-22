"use client";

import { LogOut, LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { initialAuthFormState } from "@/lib/auth/form-state";

function LogoutButton() {
  const { pending } = useFormStatus();

  return (
    <Button className="w-full justify-center" disabled={pending} type="submit" variant="outline">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
      {pending ? "Signing out" : "Logout"}
    </Button>
  );
}

type UserMenuProps = {
  email: string | null;
  role?: string | null;
};

export function UserMenu({ email, role }: UserMenuProps) {
  const [state, action] = useActionState(logoutAction, initialAuthFormState);

  return (
    <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
        Workspace account
      </p>
      <p className="mt-2 truncate text-sm font-medium text-foreground">
        {email ?? "Authenticated user"}
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {role ? role.replace(/_/g, " ") : "Role not assigned"}
      </p>
      {state.status === "error" ? (
        <div className="mt-3">
          <AuthFeedback message={state.message} />
        </div>
      ) : null}
      <form action={action} className="mt-3">
        <LogoutButton />
      </form>
    </div>
  );
}
