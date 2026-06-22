export type AuthFormState = {
  fieldErrors?: Partial<Record<"confirmPassword" | "email" | "password", string>>;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialAuthFormState: AuthFormState = {
  status: "idle",
};
