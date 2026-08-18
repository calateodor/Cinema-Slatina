import "server-only";

export type SmsResult = { ok: boolean; provider: string; detail?: string };

/**
 * Trimite un SMS. Implicit foloseste providerul "console", care doar scrie
 * mesajul in terminal — util in dezvoltare, cand nu exista contract SMS.
 * Pentru productie se seteaza SMS_PROVIDER="smso" si SMSO_API_KEY in .env.
 */
export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const provider = process.env.SMS_PROVIDER ?? "console";

  if (provider === "smso") {
    const apiKey = process.env.SMSO_API_KEY;
    if (!apiKey) {
      return { ok: false, provider, detail: "SMSO_API_KEY lipsește" };
    }
    try {
      const res = await fetch("https://app.smso.ro/api/v1/send", {
        method: "POST",
        headers: {
          "X-Authorization": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to,
          body: message,
          sender: process.env.SMSO_SENDER ?? "CinemaSLT",
        }),
      });
      if (!res.ok) {
        return { ok: false, provider, detail: `HTTP ${res.status}` };
      }
      return { ok: true, provider };
    } catch (error) {
      return { ok: false, provider, detail: String(error) };
    }
  }

  console.info(`\n[SMS -> ${to}] ${message}\n`);
  return { ok: true, provider: "console" };
}
