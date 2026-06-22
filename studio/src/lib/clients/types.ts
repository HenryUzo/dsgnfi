export type FAQEntry = {
  answer: string;
  question: string;
};

export type ClientFormState = {
  errors?: Partial<
    Record<
      | "contact_email"
      | "description"
      | "industry"
      | "location"
      | "name"
      | "status"
      | "website",
      string
    >
  >;
  message?: string;
  status: "error" | "idle" | "success";
};

export type BrandProfileFormState = {
  errors?: Partial<
    Record<
      | "common_objections"
      | "competitors"
      | "content_pillars"
      | "faqs"
      | "offer_examples"
      | "preferred_ctas"
      | "services"
      | "words_to_avoid"
      | "words_to_use",
      string
    >
  >;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialClientFormState: ClientFormState = {
  status: "idle",
};

export const initialBrandProfileFormState: BrandProfileFormState = {
  status: "idle",
};
