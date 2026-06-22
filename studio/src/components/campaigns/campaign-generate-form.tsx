"use client";

import { AlertTriangle, LoaderCircle, Sparkles } from "lucide-react";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import {
  generateCampaignStrategyAction,
} from "@/lib/ai/actions";
import {
  initialCampaignGenerationActionState,
  type CampaignGenerationActionState,
} from "@/lib/ai/types";

function SubmitButton({
  hasExistingContentItems,
  showDuplicateWarning,
  onRequireConfirmation,
}: {
  hasExistingContentItems: boolean;
  onRequireConfirmation: () => void;
  showDuplicateWarning: boolean;
}) {
  const { pending } = useFormStatus();

  if (hasExistingContentItems && !showDuplicateWarning) {
    return (
      <Button onClick={onRequireConfirmation} type="button">
        <Sparkles className="h-4 w-4" />
        Generate Strategy & Calendar
      </Button>
    );
  }

  return (
    <Button disabled={pending} type="submit">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {pending ? "Generating strategy & calendar" : "Generate Strategy & Calendar"}
    </Button>
  );
}

export function CampaignGenerateForm({
  campaignId,
  hasExistingContentItems,
}: {
  campaignId: string;
  hasExistingContentItems: boolean;
}) {
  const router = useRouter();
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [state, action] = useActionState<CampaignGenerationActionState, FormData>(
    generateCampaignStrategyAction,
    initialCampaignGenerationActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [router, state.status]);

  return (
    <form action={action} className="space-y-4">
      <input name="campaignId" type="hidden" value={campaignId} />
      <AuthFeedback
        message={state.message}
        tone={state.status === "success" ? "success" : "error"}
      />

      {hasExistingContentItems && showDuplicateWarning ? (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100">
          <div className="mb-2 flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            This campaign already has generated content items. Generating again may create duplicates.
          </div>
          <p className="text-amber-50/90">
            Continue only if you want to add another batch of draft calendar items.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <SubmitButton
              hasExistingContentItems={hasExistingContentItems}
              onRequireConfirmation={() => setShowDuplicateWarning(true)}
              showDuplicateWarning={showDuplicateWarning}
            />
            <Button
              onClick={() => setShowDuplicateWarning(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <SubmitButton
          hasExistingContentItems={hasExistingContentItems}
          onRequireConfirmation={() => setShowDuplicateWarning(true)}
          showDuplicateWarning={showDuplicateWarning}
        />
      )}
    </form>
  );
}
