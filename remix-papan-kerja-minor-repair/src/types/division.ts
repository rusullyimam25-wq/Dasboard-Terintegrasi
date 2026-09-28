/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Multi-Divisional Types & Configuration - Aetra Air Tangerang
 */

export type DivisionId =
  | "customer_service"
  | "minor_repair"
  | "sales_support"
  | "key_account"
  | "technical_support";

export interface DivisionMeta {
  id: DivisionId;
  name: string;
  shortName: string;
  tagline: string;
  icon: string;
  badgeColor: string;
  badgeBg: string;
  borderColor: string;
  gradient: string;
  defaultAdminEmail: string;
  defaultAdminName: string;
  description: string;
}

export const DIVISIONS: Record<DivisionId, DivisionMeta> = {
  customer_service: {
    id: "customer_service",
    name: "Customer Service & Contact Center",
    shortName: "Customer Service",
    tagline: "Gerbang Awal Penerimaan & Distribusi Komplain Pelanggan",
    icon: "🎧",
    badgeColor: "#0284C7",
    badgeBg: "#EFF6FF",
    borderColor: "#BFDBFE",
    gradient: "linear-gradient(135deg, #0284C7 0%, #0369A1 100%)",
    defaultAdminEmail: "cs.admin@aetra.co.id",
    defaultAdminName: "Putri Delia (Supervisor CS & Dispatcher)",
    description: "Menerima pengaduan pelanggan 24/7, validasi data sambungan, verifikasi keluhan, dan mendistribusikan Work Order ke divisi teknis terkait.",
  },
  minor_repair: {
    id: "minor_repair",
    name: "Divisi Minor Repair (Teknik Lapangan)",
    shortName: "Minor Repair",
    tagline: "Penanganan Gangguan Kebocoran Pipa & Penggantian Meter Air",
    icon: "🛠️",
    badgeColor: "#D97706",
    badgeBg: "#FFFBEB",
    borderColor: "#FDE68A",
    gradient: "linear-gradient(135deg, #D97706 0%, #B45309 100%)",
    defaultAdminEmail: "minor.repair@aetra.co.id",
    defaultAdminName: "Ir. Bambang Trihatmojo (Koordinator Lapangan)",
    description: "Eksekusi perbaikan kebocoran pipa persil/dinas, penggantian meter air macet/rusak, stop kran, dokumentasi GPS & BAST serah terima.",
  },
  sales_support: {
    id: "sales_support",
    name: "Operasional Sales Support (OSS)",
    shortName: "Sales Support",
    tagline: "Administrasi Kepelangganan, Billing, Rekening & Sambungan Baru",
    icon: "💼",
    badgeColor: "#059669",
    badgeBg: "#ECFDF5",
    borderColor: "#A7F3D0",
    gradient: "linear-gradient(135deg, #059669 0%, #047857 100%)",
    defaultAdminEmail: "sales.support@aetra.co.id",
    defaultAdminName: "Dewi Lestari, S.E. (Head of Sales Support)",
    description: "Verifikasi administrasi, penyesuaian rekening tinggi (KRPT), cicilan tagihan, balik nama, permohonan pipa dinas baru, dan penyambungan kembali tunggakan.",
  },
  key_account: {
    id: "key_account",
    name: "Technical Key Account (TKA)",
    shortName: "Key Account",
    tagline: "Layanan Prioritas Kawasan Industri, Pabrik & Niaga Besar",
    icon: "🏢",
    badgeColor: "#7C3AED",
    badgeBg: "#F5F3FF",
    borderColor: "#DDD6FE",
    gradient: "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
    defaultAdminEmail: "key.account@aetra.co.id",
    defaultAdminName: "H. Rudi Hartono, S.T. (Senior Key Account Specialist)",
    description: "Penanganan komplain debit, tekanan, dan perbaikan pipa kawasan industri dengan SLA prioritas tinggi (< 24 jam) serta berita acara industri.",
  },
  technical_support: {
    id: "technical_support",
    name: "Technical Support & Laboratorium",
    shortName: "Tech Support",
    tagline: "Pengujian Kualitas Air, Uji Akurasi Tera Meter & Penertiban",
    icon: "🔬",
    badgeColor: "#DC2626",
    badgeBg: "#FEF2F2",
    borderColor: "#FECACA",
    gradient: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)",
    defaultAdminEmail: "tech.support@aetra.co.id",
    defaultAdminName: "Dr. Agus Sutrisno (Manager Technical Support & Lab)",
    description: "Investigasi kualitas air (kekeruhan, bau, sisa klorin), flushing jaringan, tera meter uji akurasi bangku tera, dan penertiban konsumsi ilegal.",
  },
};

export interface DivisionUserSession {
  email: string;
  name: string;
  divisionId: DivisionId;
  role: "admin" | "supervisor" | "officer";
  loginAt: string;
  username?: string;
}

export interface TicketComment {
  id: string;
  authorName: string;
  authorDivision: DivisionId;
  authorRole?: string;
  content: string;
  createdAt: string;
  targetDepartment?: string;
}

/**
 * Smart Category to Division Mapping Rules
 */
export const CATEGORY_DIVISION_ROUTING: Record<string, DivisionId> = {
  // Minor Repair
  KBSM: "minor_repair",
  KP: "minor_repair",
  KPPR: "minor_repair",
  KKMR: "minor_repair",
  KS: "minor_repair",
  KPMR: "minor_repair",
  KMR: "minor_repair",
  KMDT: "minor_repair",
  KMAL: "minor_repair",
  KLBC: "minor_repair",
  TRO9: "minor_repair",
  TR09: "minor_repair",
  KBGL: "minor_repair",

  // Operasional Sales Support
  KRPT: "sales_support",
  KRPR: "sales_support",
  KPCT: "sales_support",
  KPKT: "sales_support",
  KPGP: "sales_support",
  KPPA: "sales_support",
  KPAP: "sales_support",
  KPAT: "sales_support",
  KPPS: "sales_support",
  KPSB: "sales_support",
  KBTT: "sales_support",
  KBTR: "sales_support",
  KBBP: "sales_support",
  BPPD: "sales_support",
  "KTST-RC": "sales_support",
  KTST: "sales_support",

  // Technical Key Account (Industri)
  KATMIND: "key_account",
  KATRIND: "key_account",
  KBSMIND: "key_account",
  KPMRIND: "key_account",
  KKMRIND: "key_account",
  KMALIND: "key_account",
  KPPSIND: "key_account",
  BPPDIND: "key_account",
  PPMI: "key_account",
  TRO9IND: "key_account",
  TR09IND: "key_account",
  KTRIND: "key_account",
  KPIND: "key_account",

  // Technical Support (Kualitas, Tera, Tekanan, Ilegal)
  KATR: "technical_support",
  KATM: "technical_support",
  KEC: "technical_support",
  TERAREQ: "technical_support",
  SMR: "technical_support",
  MM: "technical_support",
  KILL: "technical_support",
  KTR: "technical_support",
  KMTA: "technical_support",
  KPSM: "technical_support",
  KPPM: "technical_support",
};

/**
 * Determine default target division from complaint category
 */
export function getRecommendedDivision(categoryKey: string): DivisionId {
  const cleanKey = (categoryKey || "").trim().toUpperCase();
  if (CATEGORY_DIVISION_ROUTING[cleanKey]) {
    return CATEGORY_DIVISION_ROUTING[cleanKey];
  }
  if (cleanKey.includes("IND")) {
    return "key_account";
  }
  return "minor_repair";
}
