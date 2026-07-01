// =====================================================================
// Planning — helpers purs (aucune dépendance React).
// Un évènement de planning provient d'un personnel_horaire :
// jour (1=lundi … 7=dimanche) + heure_debut/heure_fin (récurrence hebdo).
// Le planning est un emploi du temps hebdomadaire récurrent : les blocs
// sont placés sur une grille 7j × heures, sans dates ni calendrier daté.
// =====================================================================

import type { HoraireRead } from "./types";

export interface PlanningEvent {
  id: string;
  jour: number; // 1=lundi … 7=dimanche
  start: string; // "HH:MM" ou "HH:MM:SS"
  end: string;
  title: string;
  subtitle?: string;
  colorIndex?: number;
}

/** Créneau à créer (envoyé à POST /api/personnels/{pid}/horaires). */
export interface HoraireDraft {
  jour: number;
  heure_debut: string; // "HH:MM"
  heure_fin: string; // "HH:MM"
  /**
   * Personnel ciblé, choisi dans le dialog quand le planning propose plusieurs
   * personnels (vue salle). À retirer avant l'envoi : ce n'est pas un champ
   * de HoraireCreate, il sert à router le POST vers le bon personnel.
   */
  personnelId?: number;
}

/** Plages horaires prédéfinies (emploi du temps type). */
export interface TimeSlot {
  start: string; // "HH:MM"
  end: string;
}

/** Heure d'ouverture fixe (aucune heure d'ouverture n'est exposée par l'API). */
const OPEN_HOUR = 8;
/** Heure de fermeture par défaut si la salle n'en définit pas (ou hors dashboard salles). */
const DEFAULT_CLOSE = "18:00";

/** Minutes depuis minuit → "HH:MM". */
function minutesToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Construit les créneaux d'une heure de 08:00 jusqu'à l'heure de fermeture.
 * Le dernier créneau se termine EXACTEMENT à `closing` (ex. fermeture 18:30 →
 * dernier créneau "18:00 – 18:30" ; fermeture 19:00 → "18:00 – 19:00").
 * Fermeture absente / invalide / ≤ 08:00 → repli sur 18:00.
 */
export function buildTimeSlots(closing?: string | null): TimeSlot[] {
  const startMin = OPEN_HOUR * 60;
  let endMin = closing ? parseTime(closing) : parseTime(DEFAULT_CLOSE);
  if (!Number.isFinite(endMin) || endMin <= startMin) {
    endMin = parseTime(DEFAULT_CLOSE);
  }
  const slots: TimeSlot[] = [];
  for (let cur = startMin; cur < endMin; cur += 60) {
    const next = Math.min(cur + 60, endMin);
    slots.push({ start: minutesToTime(cur), end: minutesToTime(next) });
  }
  return slots;
}

/** Créneaux par défaut (08:00 → 18:00). */
export const TIME_SLOTS: TimeSlot[] = buildTimeSlots(DEFAULT_CLOSE);

export function slotLabel(slot: TimeSlot): string {
  return `${slot.start} – ${slot.end}`;
}

/** Vrai si l'évènement chevauche le créneau [start, end[. */
export function eventOverlapsSlot(e: PlanningEvent, slot: TimeSlot): boolean {
  return (
    parseTime(e.start) < parseTime(slot.end) &&
    parseTime(e.end) > parseTime(slot.start)
  );
}

// ─── Libellés ────────────────────────────────────────────────────
export const JOUR_LABELS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

// ─── Temps ───────────────────────────────────────────────────────
/** "HH:MM[:SS]" → minutes depuis minuit. Renvoie 0 si invalide. */
export function parseTime(t: string): number {
  const [h, m] = t.split(":");
  const hh = Number(h);
  const mm = Number(m);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return 0;
  return hh * 60 + mm;
}

/** "HH:MM:SS" → "HH:MM". */
export function fmtTime(t: string): string {
  return t.slice(0, 5);
}

// ─── Sélection par jour ──────────────────────────────────────────
export function eventsForJour(
  events: PlanningEvent[],
  jour: number
): PlanningEvent[] {
  return events
    .filter((e) => e.jour === jour)
    .sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

// ─── Palette (tokens chart-1..5) ─────────────────────────────────
const EVENT_PALETTE = [
  "border-chart-1 bg-chart-1/15",
  "border-chart-2 bg-chart-2/15",
  "border-chart-3 bg-chart-3/15",
  "border-chart-4 bg-chart-4/15",
  "border-chart-5 bg-chart-5/15",
] as const;

export function eventColor(index: number | undefined): string {
  const i = ((index ?? 0) % EVENT_PALETTE.length + EVENT_PALETTE.length) %
    EVENT_PALETTE.length;
  return EVENT_PALETTE[i];
}

// ─── Conversion horaires → évènements ────────────────────────────
export function horairesToEvents(
  horaires: HoraireRead[],
  opts: {
    title: string;
    subtitle?: string;
    colorIndex?: number;
    keyPrefix?: string;
  }
): PlanningEvent[] {
  return horaires.map((h) => ({
    id: `${opts.keyPrefix ?? "h"}-${h.id}`,
    jour: h.jour,
    start: h.heure_debut,
    end: h.heure_fin,
    title: opts.title,
    subtitle: opts.subtitle,
    colorIndex: opts.colorIndex,
  }));
}
