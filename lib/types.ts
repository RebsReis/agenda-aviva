export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: "membro" | "admin" | "secretaria";
  consent_at: string | null;
  consent_version: string | null;
  created_at: string;
};

export type Ministry = {
  id: string;
  name: string;
  color: string;
  publica_avisos?: boolean;
  ministry_leaders?: MinistryLeader[];
};

export type MinistryLeader = { user_id: string; leader_name: string | null };

export type EventRow = {
  id: string;
  ministry_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  created_by: string | null;
  responsible_name: string | null;
  created_at: string;
  updated_at: string;
  ministries?: Pick<Ministry, "id" | "name" | "color"> | null;
};

export type Question = {
  id: string;
  event_id: string;
  author_id: string;
  author_name: string;
  body: string;
  answer: string | null;
  answered_by_name: string | null;
  answered_by_role: "lider" | "admin" | null;
  answered_at: string | null;
  created_at: string;
};

export const CONSENT_VERSION = "2026-11-26";

export type Announcement = {
  id: string;
  title: string;
  body: string | null;
  pinned: boolean;
  expires_on: string | null;
  created_at: string;
};

export type Duty = {
  id: string;
  ministry_id: string | null;
  category: string;
  duty_date: string;
  assignees: string;
  notes: string | null;
};

/** Ministério dos cultos e eventos da igreja toda; o filtro dele também mostra o Mural */
export const MURAL_MINISTRY = "Mural da igreja";

export type Birthday = { id: string; name: string; day: number; month: number };

export type GivingInfo = {
  id: string;
  pix_key: string | null;
  pix_key_type: string | null;
  beneficiary: string | null;
  bank: string | null;
  email: string | null;
  message: string | null;
  updated_at: string;
};

/** Tipos de escala de cada ministério (os ministérios listados aqui ganham uma área de escalas no Mural) */
export const ESCALAS_MINISTERIO: Record<string, string[]> = {
  "Mídia": ["Som", "Luzes", "Fotos e Vídeos", "Datashow"],
};

/** Tipos sugeridos para as escalas gerais da igreja (secretaria) */
export const ESCALAS_IGREJA = ["Limpeza", "Recepção", "Santa Ceia", "Cantina", "Estacionamento"];
