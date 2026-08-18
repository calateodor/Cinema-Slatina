export const CINEMA = {
  name: 'Cinema "Eugen Ionescu"',
  city: "Slatina",
  shortName: "Cinema Slatina",
  address: "Bulevardul Alexandru Ioan Cuza nr. 28, Slatina, județul Olt",
  phone: "0784 010 929",
  email: "cinemaslatina.ro@gmail.com",
  hours: "Zilnic 14:00 – 22:00",
  firstScreening: "Primul film la 15:00",
  reservationHours: "Între 15:00 și 21:00",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Cinema+Eugen+Ionescu+Slatina",
  owner: "Administrat de Primăria Municipiului Slatina.",
} as const;

export const ROLES = {
  ADMIN: "ADMIN",
  CASHIER: "CASHIER",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];

export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  CHECKED_IN: "CHECKED_IN",
  NO_SHOW: "NO_SHOW",
} as const;
export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABEL: Record<string, string> = {
  PENDING: "În așteptare",
  CONFIRMED: "Confirmată",
  CANCELLED: "Anulată",
  CHECKED_IN: "Prezent",
  NO_SHOW: "Neprezentat",
};

export const RESERVATION_SOURCE_LABEL: Record<string, string> = {
  ONLINE: "Online",
  PHONE: "Telefonic",
  DESK: "Casierie",
};

/** Clasificarea de varsta folosita in Romania. */
export const AGE_RATINGS = [
  { value: "AG", label: "AG", hint: "Acces general" },
  { value: "AP-12", label: "AP-12", hint: "Acces cu părinte sub 12 ani" },
  { value: "N-15", label: "N-15", hint: "Nerecomandat sub 15 ani" },
  { value: "IM-18", label: "IM-18", hint: "Interzis minorilor sub 18 ani" },
] as const;

export const SETTING_KEYS = {
  RESERVATIONS_ENABLED: "reservations_enabled",
  ANNOUNCEMENT: "announcement",
  RULES_CONTENT: "rules_content",
  BAR_INTRO: "bar_intro",
} as const;

/** Varsta de la care o persoana este considerata adult la casierie. */
export const ADULT_AGE = 18;

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
