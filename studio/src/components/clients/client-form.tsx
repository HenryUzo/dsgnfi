"use client";

import { LoaderCircle } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { AuthFeedback } from "@/components/auth/auth-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createClientAction,
  updateClientAction,
} from "@/lib/clients/actions";
import {
  initialClientFormState,
  type ClientFormState,
} from "@/lib/clients/types";
import type { Client } from "@/types/database";

function SubmitButton({ idleLabel, pendingLabel }: { idleLabel: string; pendingLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} type="submit">
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

type ClientFormProps = {
  client?: Client;
  description: string;
  title: string;
};

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-rose-200">{message}</p>;
}

export function ClientForm({ client, description, title }: ClientFormProps) {
  const action = client ? updateClientAction : createClientAction;
  const [state, formAction] = useActionState<ClientFormState, FormData>(
    action,
    initialClientFormState,
  );

  return (
    <Card>
      <CardHeader className="p-0">
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription className="leading-6">{description}</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <form action={formAction} className="grid gap-5">
          {client ? <input name="clientId" type="hidden" value={client.id} /> : null}
          <AuthFeedback
            message={state.message}
            tone={state.status === "success" ? "success" : "error"}
          />
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Client name</Label>
              <Input defaultValue={client?.name ?? ""} id="name" name="name" />
              <FieldError message={state.errors?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                defaultValue={client?.industry ?? ""}
                id="industry"
                name="industry"
              />
              <FieldError message={state.errors?.industry} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                className="flex h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-foreground shadow-sm outline-none transition focus-visible:border-primary/60 focus-visible:ring-[3px] focus-visible:ring-primary/15"
                defaultValue={client?.status ?? "active"}
                id="status"
                name="status"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
              <FieldError message={state.errors?.status} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                defaultValue={client?.website ?? ""}
                id="website"
                name="website"
                placeholder="https://example.com"
              />
              <FieldError message={state.errors?.website} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                defaultValue={client?.location ?? ""}
                id="location"
                name="location"
              />
              <FieldError message={state.errors?.location} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                defaultValue={client?.description ?? ""}
                id="description"
                name="description"
                placeholder="Describe the client and the commercial context the agency should remember."
              />
              <FieldError message={state.errors?.description} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact name</Label>
              <Input
                defaultValue={client?.contact_name ?? ""}
                id="contact_name"
                name="contact_name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact email</Label>
              <Input
                defaultValue={client?.contact_email ?? ""}
                id="contact_email"
                name="contact_email"
                placeholder="contact@example.com"
              />
              <FieldError message={state.errors?.contact_email} />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton
              idleLabel={client ? "Save client" : "Create client"}
              pendingLabel={client ? "Saving client" : "Creating client"}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
