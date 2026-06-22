import type {
  ContentItemStatus,
  ContentVariantApprovalStatus,
} from "@/types/database";

export type ContentEditorFormValues = {
  ai_generated_copy: string;
  creative_direction: string;
  edited_copy: string;
  notes: string;
};

export type ContentEditorFormState = {
  errors?: Partial<Record<"edited_copy", string>>;
  message?: string;
  status: "error" | "idle" | "success";
  values?: ContentEditorFormValues;
};

export type ContentCommentFormState = {
  message?: string;
  status: "error" | "idle" | "success";
  values?: {
    comment: string;
  };
};

export type ContentStatusFormState = {
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialContentEditorFormState: ContentEditorFormState = {
  status: "idle",
};

export const initialContentCommentFormState: ContentCommentFormState = {
  status: "idle",
};

export const initialContentStatusFormState: ContentStatusFormState = {
  status: "idle",
};

export const contentItemStatusOptions: Array<{
  label: string;
  value: ContentItemStatus;
}> = [
  { label: "Draft", value: "draft" },
  { label: "Needs Review", value: "needs_review" },
  { label: "Request Changes", value: "changes_requested" },
  { label: "Approved", value: "approved" },
  { label: "Ready to Publish", value: "ready_to_publish" },
  { label: "Published Manually", value: "published_manually" },
];

export function mapContentItemStatusToVariantApprovalStatus(
  status: ContentItemStatus,
): ContentVariantApprovalStatus | null {
  switch (status) {
    case "draft":
      return "draft";
    case "needs_review":
      return "needs_review";
    case "changes_requested":
      return "changes_requested";
    case "approved":
    case "ready_to_publish":
    case "published_manually":
      return "approved";
    default:
      return null;
  }
}
