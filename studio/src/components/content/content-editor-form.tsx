"use client";

import { LoaderCircle, Save } from "lucide-react";
import { startTransition, useActionState, useEffect } from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { RouteEmptyState } from "@/components/clients/route-empty-state";
import { ContentApprovalStatusBadge } from "@/components/content/content-approval-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateContentDraftAction } from "@/lib/ai/actions";
import {
  addContentCommentAction,
  saveContentVariantAction,
  updateContentStatusAction,
} from "@/lib/content/actions";
import {
  initialContentCommentFormState,
  initialContentEditorFormState,
  initialContentStatusFormState,
  type ContentCommentFormState,
  type ContentEditorFormState,
  type ContentStatusFormState,
} from "@/lib/content/types";
import type {
  ContentCommentWithUserEmail,
  ContentItemDetail,
} from "@/lib/db/content-items";
import { formatStatusLabel } from "@/lib/status";
import type { ContentVariant, Json } from "@/types/database";

type ContentVariantWithCreatorEmail = ContentVariant & {
  creator_email: string | null;
};

function getMetadataText(value: Json, key: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }

  const text = (value as Record<string, Json | undefined>)[key];

  return typeof text === "string" ? text : "";
}

function buildInitialAiDraft(contentItem: ContentItemDetail, latestVariant: ContentVariant | null) {
  if (latestVariant?.ai_generated_copy) {
    return latestVariant.ai_generated_copy;
  }

  const summary = getMetadataText(contentItem.metadata, "caption_or_script_summary");

  return [
    contentItem.title,
    contentItem.objective,
    contentItem.hook,
    contentItem.cta,
    summary,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join("\n\n");
}

function PendingButton({
  children,
  variant = "default",
}: {
  children: string;
  variant?: "default" | "outline";
}) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit" variant={variant}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {children}
    </Button>
  );
}

export function ContentItemWorkspace({
  comments,
  contentItem,
  currentTab,
  latestVariant,
  variants,
}: {
  comments: ContentCommentWithUserEmail[];
  contentItem: ContentItemDetail;
  currentTab: string;
  latestVariant: ContentVariant | null;
  variants: ContentVariantWithCreatorEmail[];
}) {
  const router = useRouter();
  const initialValues = {
    ai_generated_copy: buildInitialAiDraft(contentItem, latestVariant),
    creative_direction: latestVariant?.creative_direction ?? "",
    edited_copy:
      latestVariant?.edited_copy ??
      latestVariant?.ai_generated_copy ??
      buildInitialAiDraft(contentItem, latestVariant),
    notes:
      getMetadataText(contentItem.metadata, "editor_notes") ||
      getMetadataText(contentItem.metadata, "draft_notes"),
  };

  const [editorState, editorAction] = useActionState<ContentEditorFormState, FormData>(
    saveContentVariantAction,
    initialContentEditorFormState,
  );
  const [draftState, draftAction] = useActionState(
    generateContentDraftAction,
    { status: "idle" as const },
  );
  const [commentState, commentAction] = useActionState<ContentCommentFormState, FormData>(
    addContentCommentAction,
    initialContentCommentFormState,
  );
  const [statusState, statusAction] = useActionState<ContentStatusFormState, FormData>(
    updateContentStatusAction,
    initialContentStatusFormState,
  );

  useEffect(() => {
    if (
      editorState.status === "success" ||
      draftState.status === "success" ||
      commentState.status === "success" ||
      statusState.status === "success"
    ) {
      startTransition(() => {
        router.refresh();
      });
    }
  }, [
    commentState.status,
    draftState.status,
    editorState.status,
    router,
    statusState.status,
  ]);

  const values = editorState.values ?? initialValues;

  if (currentTab === "activity") {
    return (
      <RouteEmptyState
        description="Activity logs are being recorded for generation, saves, comments, and status changes, but the dedicated timeline UI is intentionally deferred."
        eyebrow="Activity"
        href={`/content-calendar/${contentItem.id}` as Route}
        primaryLabel="Return to editor"
        title="Activity is reserved for a later step"
      />
    );
  }

  if (currentTab === "versions") {
    return (
      <div className="grid gap-4">
        {variants.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-muted-foreground">
            No versions exist yet. Generate a draft or save the editor to create the first version.
          </div>
        ) : null}
        {variants.map((variant, index) => (
          <div
            key={variant.id}
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-6"
          >
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <Input className="max-w-[160px]" disabled value={`Version ${variant.version_number}`} />
              {index === 0 ? (
                <span className="text-xs uppercase tracking-[0.2em] text-primary">Latest</span>
              ) : null}
              <ContentApprovalStatusBadge status={variant.approval_status} />
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {new Date(variant.created_at).toLocaleString()}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {variant.model_used ?? "Manual"}
              </span>
              <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {variant.creator_email ?? variant.created_by ?? "Unknown author"}
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  AI-generated copy
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {variant.ai_generated_copy ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Edited copy
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {variant.edited_copy ?? "Not set"}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 md:col-span-2">
                <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Creative direction
                </p>
                <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                  {variant.creative_direction ?? "Not set"}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (currentTab === "comments") {
    return (
      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={commentAction} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <input name="contentItemId" type="hidden" value={contentItem.id} />
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Add Comment</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Keep review feedback attached directly to this content item.
              </p>
            </div>
            <AuthFeedback
              message={commentState.message}
              tone={commentState.status === "success" ? "success" : "error"}
            />
            <div className="space-y-2">
              <Label htmlFor="comment-body">Comment</Label>
              <Textarea
                defaultValue={commentState.values?.comment ?? ""}
                id="comment-body"
                name="comment"
                placeholder="Add feedback, approval rationale, or revision guidance."
              />
            </div>
            <PendingButton>Add comment</PendingButton>
          </div>
        </form>

        <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Comments</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Comments are shown in chronological order.
            </p>
          </div>
          {comments.length === 0 ? (
            <p className="text-sm leading-6 text-muted-foreground">
              No comments have been added yet.
            </p>
          ) : (
            <div className="grid gap-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"
                >
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    {comment.user_email ?? "Team member"} / {new Date(comment.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">{comment.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <form action={draftAction} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <input name="contentItemId" type="hidden" value={contentItem.id} />
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-foreground">Generate Full Draft</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Use the current brand profile, campaign brief, and item details to generate a full first-pass draft as a new version.
              </p>
            </div>
            <AuthFeedback
              message={draftState.message}
              tone={draftState.status === "success" ? "success" : "error"}
            />
            <PendingButton variant="outline">Generate full content draft</PendingButton>
          </div>
        </form>

        <form action={editorAction} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <input name="contentItemId" type="hidden" value={contentItem.id} />
          <input name="variantId" type="hidden" value={latestVariant?.id ?? ""} />
          <AuthFeedback
            message={editorState.message}
            tone={editorState.status === "success" ? "success" : "error"}
          />
          <div className="mt-4 grid gap-5">
            <div className="space-y-2">
              <Label htmlFor="ai_generated_copy">AI-generated draft</Label>
              <Textarea
                defaultValue={values.ai_generated_copy}
                id="ai_generated_copy"
                name="ai_generated_copy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edited_copy">Editable final copy</Label>
              <Textarea
                defaultValue={values.edited_copy}
                id="edited_copy"
                name="edited_copy"
              />
              {editorState.errors?.edited_copy ? (
                <p className="text-sm text-rose-200">{editorState.errors.edited_copy}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="creative_direction">Creative direction</Label>
              <Textarea
                defaultValue={values.creative_direction}
                id="creative_direction"
                name="creative_direction"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea defaultValue={values.notes} id="notes" name="notes" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button name="mode" type="submit" value="update_latest">
              <Save className="h-4 w-4" />
              Save current version
            </Button>
            <Button name="mode" type="submit" value="create_new" variant="outline">
              Save as new version
            </Button>
          </div>
        </form>
      </div>

      <form action={statusAction} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
        <input name="contentItemId" type="hidden" value={contentItem.id} />
        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground">Approval Workflow</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Move the content item through review, approval, and manual publishing states.
            </p>
          </div>
          <AuthFeedback
            message={statusState.message}
            tone={statusState.status === "success" ? "success" : "error"}
          />
          <div className="space-y-2">
            <Label htmlFor="workflow-comment">Workflow comment</Label>
            <Textarea
              id="workflow-comment"
              name="comment"
              placeholder="Required when requesting changes."
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button name="status" type="submit" value="draft" variant="outline">
              Mark as {formatStatusLabel("draft")}
            </Button>
            <Button name="status" type="submit" value="needs_review" variant="outline">
              Mark as {formatStatusLabel("needs_review")}
            </Button>
            <Button name="status" type="submit" value="changes_requested" variant="outline">
              {formatStatusLabel("changes_requested")}
            </Button>
            <Button name="status" type="submit" value="approved" variant="outline">
              {formatStatusLabel("approved")}
            </Button>
            <Button name="status" type="submit" value="ready_to_publish" variant="outline">
              {formatStatusLabel("ready_to_publish")}
            </Button>
            <Button
              name="status"
              onClick={(event) => {
                if (!window.confirm("Mark this item as published manually?")) {
                  event.preventDefault();
                }
              }}
              type="submit"
              value="published_manually"
              variant="outline"
            >
              {formatStatusLabel("published_manually")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
