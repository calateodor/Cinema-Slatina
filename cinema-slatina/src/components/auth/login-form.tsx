"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, LogIn } from "lucide-react";
import { login, type LoginState } from "@/server/actions/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending}
      className="w-full rounded-full font-semibold"
    >
      {pending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <LogIn data-icon="inline-start" />
      )}
      Intră în cont
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="username">Utilizator</FieldLabel>
          <Input
            id="username"
            name="username"
            required
            autoComplete="username"
            autoCapitalize="none"
            placeholder="admin"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Parolă</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </Field>
      </FieldGroup>

      {state.error ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton />
    </form>
  );
}
