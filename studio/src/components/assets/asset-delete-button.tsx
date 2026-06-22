"use client";

import type { Route } from "next";
import { LoaderCircle, Trash2 } from "lucide-react";
import { startTransition, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { deleteAssetAction } from "@/lib/assets/actions";
import { initialAssetDeleteState, type AssetDeleteState } from "@/lib/assets/types";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      onClick={(event) => {
        if (!window.confirm("Delete this asset and remove the file from storage?")) {
          event.preventDefault();
        }
      }}
      type="submit"
      variant="outline"
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Delete
    </Button>
  );
}

export function AssetDeleteButton({
  assetId,
  returnTo,
}: {
  assetId: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState<AssetDeleteState, FormData>(
    deleteAssetAction,
    initialAssetDeleteState,
  );

  useEffect(() => {
    if (state.status === "success") {
      startTransition(() => {
        if (state.redirectTo) {
          router.push(state.redirectTo as Route);
          return;
        }

        if (returnTo) {
          router.push(returnTo as Route);
          return;
        }

        router.refresh();
      });
    }
  }, [returnTo, router, state.redirectTo, state.status]);

  return (
    <form action={action} className="space-y-3">
      <input name="assetId" type="hidden" value={assetId} />
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <AuthFeedback
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />
      <SubmitButton />
    </form>
  );
}
