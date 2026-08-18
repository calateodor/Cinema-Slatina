"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  confirmReservation,
  requestReservationCode,
} from "@/server/actions/reservations";
import { maskPhone } from "@/lib/format";
import { ADULT_AGE } from "@/lib/constants";

type Props = {
  screeningId: string;
  maxSeats: number;
  usesExtraSeats: boolean;
};

export function ReservationForm({ screeningId, maxSeats, usesExtraSeats }: Props) {
  const [step, setStep] = useState<"details" | "code" | "done">("details");
  const [pending, startTransition] = useTransition();

  const [customerName, setCustomerName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [seats, setSeats] = useState("1");

  const [otpId, setOtpId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [finalCode, setFinalCode] = useState("");
  const [usedExtra, setUsedExtra] = useState(false);
  /** Eroarea rămâne vizibilă în formular, nu doar în notificarea trecătoare. */
  const [error, setError] = useState<string | null>(null);

  function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await requestReservationCode({
        screeningId,
        customerName,
        age,
        phone,
        seats,
      });
      if (!result.ok) {
        const message = result.message ?? "Nu am putut trimite codul.";
        setError(message);
        toast.error(message);
        return;
      }
      setError(null);
      setOtpId(result.otpId ?? null);
      setSentTo(result.maskedPhone ?? phone);
      setDevCode(result.devCode ?? null);
      setStep("code");
      toast.success("Introdu codul de confirmare.");
    });
  }

  function submitCode(event: React.FormEvent) {
    event.preventDefault();
    if (!otpId) return;
    startTransition(async () => {
      const result = await confirmReservation({ otpId, code });
      if (!result.ok) {
        const message = result.message ?? "Codul nu a putut fi verificat.";
        setError(message);
        toast.error(message);
        return;
      }
      setError(null);
      setFinalCode(result.reservationCode ?? "");
      setUsedExtra(Boolean(result.usedExtraSeat));
      setStep("done");
    });
  }

  if (step === "done") {
    return (
      <Card className="ring-brand-yellow/30">
        <CardHeader>
          <CheckCircle2 className="size-8 text-brand-yellow" aria-hidden="true" />
          <CardTitle className="display mt-3 text-2xl">
            Rezervare confirmată
          </CardTitle>
          <CardDescription>
            {devCode
              ? "Notează codul de mai jos și prezintă-l la casierie, cu cel puțin 10 minute înainte de începerea filmului."
              : "Ți-am trimis confirmarea prin SMS. Prezintă codul la casierie, cu cel puțin 10 minute înainte de începerea filmului."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="ticket text-3xl tracking-[0.2em] text-brand-yellow">
            {finalCode}
          </p>
          {usedExtra ? (
            <Alert>
              <AlertDescription>
                Locurile fixe erau ocupate, așa că rezervarea ta este pe scaunele
                mobile suplimentare.
              </AlertDescription>
            </Alert>
          ) : null}
          <Button asChild className="w-fit rounded-full font-semibold">
            <Link href="/program">Înapoi la program</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (step === "code") {
    return (
      <Card>
        <CardHeader>
          <MessageSquare className="size-6 text-brand-orange" aria-hidden="true" />
          <CardTitle className="display mt-3 text-2xl">
            Confirmă numărul de telefon
          </CardTitle>
          <CardDescription>
            {devCode
              ? `Codul pentru numărul ${maskPhone(sentTo)} este afișat mai jos. Introdu-l ca să finalizăm rezervarea.`
              : `Am trimis un cod de 6 cifre prin SMS la ${maskPhone(sentTo)}. Introdu-l mai jos ca să finalizăm rezervarea.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitCode} className="flex flex-col gap-5">
            {error ? <FormError message={error} /> : null}
            {devCode ? (
              <Alert variant="brand">
                <AlertTitle>Codul tău de confirmare</AlertTitle>
                <AlertDescription className="flex flex-col gap-1">
                  <span className="ticket text-3xl tracking-[0.3em] text-brand-yellow">
                    {devCode}
                  </span>
                  <span>
                    Cinematograful nu are încă un contract de SMS, așa că îți
                    arătăm codul aici, pe ecran — nu îl aștepta pe telefon.
                  </span>
                </AlertDescription>
              </Alert>
            ) : null}

            <Field>
              <FieldLabel htmlFor="code">Cod SMS</FieldLabel>
              <InputOTP
                id="code"
                maxLength={6}
                value={code}
                onChange={setCode}
                containerClassName="justify-center"
                aria-describedby={error ? "reservation-error" : undefined}
                aria-invalid={error ? true : undefined}
                autoFocus
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="size-12 text-xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <FieldDescription>
                Codul este valabil 10 minute.
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap gap-3">
              <Button
                type="submit"
                disabled={pending || code.length !== 6}
                className="rounded-full font-semibold"
              >
                {pending ? <Spinner data-icon="inline-start" /> : null}
                Confirmă rezervarea
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="rounded-full"
                onClick={() => setStep("details")}
                disabled={pending}
              >
                Schimbă datele
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="display text-2xl">Datele tale</CardTitle>
        <CardDescription>
          Rezervarea este gratuită. Îți cerem numele și vârsta pentru
          clasificarea filmului, iar numărul de telefon ca să confirmăm
          rezervarea.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submitDetails} className="flex flex-col gap-5">
          {error ? <FormError message={error} /> : null}
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Nume și prenume</FieldLabel>
              <Input
                id="name"
                required
                minLength={3}
                autoComplete="name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ex. Andrei Popescu"
              />
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="age">Vârsta</FieldLabel>
                <Input
                  id="age"
                  required
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))}
                  placeholder="Ex. 27"
                />
                {age && Number(age) < ADULT_AGE ? (
                  <FieldDescription>
                    Sub {ADULT_AGE} ani — casieria verifică restricția de vârstă
                    a filmului la intrare.
                  </FieldDescription>
                ) : null}
              </Field>

              <Field>
                <FieldLabel htmlFor="seats">Număr de locuri</FieldLabel>
                <Select value={seats} onValueChange={setSeats}>
                  <SelectTrigger id="seats" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Array.from(
                        { length: Math.min(6, Math.max(1, maxSeats)) },
                        (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            {i + 1} {i === 0 ? "loc" : "locuri"}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="phone">Număr de telefon</FieldLabel>
              <Input
                id="phone"
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
              />
              <FieldDescription>
                Primești un cod de confirmare pe acest număr.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {usesExtraSeats ? (
            <Alert variant="brand">
              <AlertDescription>
                Locurile fixe s-au ocupat. Rezervarea ta va fi pe scaunele mobile
                suplimentare.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-brand-orange"
              aria-hidden="true"
            />
            <p>
              Folosim numărul doar pentru confirmarea acestei rezervări și pentru
              a te anunța dacă proiecția se modifică.
            </p>
          </div>

          <Button
            type="submit"
            disabled={pending}
            className="w-full rounded-full font-semibold sm:w-fit"
          >
            {pending ? <Spinner data-icon="inline-start" /> : null}
            Continuă spre confirmare
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Mesaj de eroare vizibil în formular și anunțat de cititoarele de ecran. */
function FormError({ message }: { message: string }) {
  return (
    <Alert variant="destructive" role="alert" id="reservation-error" tabIndex={-1}>
      <AlertCircle />
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
