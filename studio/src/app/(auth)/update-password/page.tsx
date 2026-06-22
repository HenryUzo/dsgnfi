import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { mapAuthQueryMessage } from "@/lib/auth/errors";

type UpdatePasswordPageProps = {
  searchParams: Promise<{
    error?: string;
    notice?: string;
  }>;
};

export default async function UpdatePasswordPage({
  searchParams,
}: UpdatePasswordPageProps) {
  const { error, notice } = await searchParams;

  return (
    <UpdatePasswordForm
      notice={mapAuthQueryMessage(error) ?? mapAuthQueryMessage(notice)}
    />
  );
}
