"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  type HoraireDraft,
  type PlanningEvent,
  type TimeSlot,
  JOUR_LABELS,
  buildTimeSlots,
  eventColor,
  eventOverlapsSlot,
  eventsForJour,
  fmtTime,
  slotLabel,
} from "@/lib/planning";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const GUTTER = "6rem"; // largeur colonne des créneaux (assez pour "08:00 – 09:00")

interface PlanningProps {
  events: PlanningEvent[];
  emptyLabel?: string;
  className?: string;
  /** Si fourni, active l'édition : bouton "Ajouter" + clic sur une case vide. */
  onCreateHoraire?: (draft: HoraireDraft) => Promise<void> | void;
  addLabel?: string;
  /**
   * Heure de fermeture ("HH:MM[:SS]") : le planning s'arrête à cette heure,
   * le dernier créneau se terminant exactement à la fermeture. Défaut : 18:00.
   */
  closingTime?: string | null;
  /**
   * Personnels proposés dans le dialog d'ajout. Si fourni (et non vide), un
   * sélecteur "Personnel" y apparaît et son choix est renvoyé dans
   * `draft.personnelId` (vue salle, où le créneau n'est pas pré-attribué).
   */
  personnelOptions?: { id: number; label: string }[];
}

export function Planning({
  events,
  emptyLabel = "Aucun créneau planifié.",
  className,
  onCreateHoraire,
  addLabel = "Ajouter un créneau",
  closingTime,
  personnelOptions,
}: PlanningProps) {
  const editable = !!onCreateHoraire;
  const hasPersonnelChoice = !!personnelOptions && personnelOptions.length > 0;
  const slots = React.useMemo(() => buildTimeSlots(closingTime), [closingTime]);

  // ─── dialog d'ajout ───
  const [addOpen, setAddOpen] = React.useState(false);
  const [adding, setAdding] = React.useState(false);
  const [draftJour, setDraftJour] = React.useState("1");
  const [draftSlot, setDraftSlot] = React.useState("0");
  const [draftPersonnelId, setDraftPersonnelId] = React.useState("");

  // Cible par défaut le premier personnel proposé (options chargées en asynchrone).
  React.useEffect(() => {
    if (hasPersonnelChoice && !draftPersonnelId) {
      setDraftPersonnelId(String(personnelOptions![0].id));
    }
  }, [hasPersonnelChoice, personnelOptions, draftPersonnelId]);

  function openAdd(jour?: number, slotIdx?: number) {
    if (jour) setDraftJour(String(jour));
    if (slotIdx != null) setDraftSlot(String(slotIdx));
    setAddOpen(true);
  }

  async function submitAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!onCreateHoraire) return;
    const slot = slots[Number(draftSlot)] ?? slots[0];
    setAdding(true);
    try {
      await onCreateHoraire({
        jour: Number(draftJour),
        heure_debut: slot.start,
        heure_fin: slot.end,
        personnelId: hasPersonnelChoice ? Number(draftPersonnelId) : undefined,
      });
      setAddOpen(false);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {/* ─── Barre d'outils ─── */}
      {editable && (
        <div className="flex items-center justify-end">
          <Button size="sm" onClick={() => openAdd()}>
            <Plus data-icon="inline-start" />
            {addLabel}
          </Button>
        </div>
      )}

      <WeekView
        events={events}
        slots={slots}
        editable={editable}
        onCellClick={openAdd}
        emptyLabel={emptyLabel}
      />

      {/* ─── Dialog d'ajout ─── */}
      {editable && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent>
            <form onSubmit={submitAdd}>
              <DialogHeader>
                <DialogTitle>Ajouter un créneau</DialogTitle>
                <DialogDescription>
                  Choisissez un jour et une plage horaire prédéfinie.
                </DialogDescription>
              </DialogHeader>
              <FieldGroup className="py-4">
                {hasPersonnelChoice && (
                  <Field>
                    <FieldLabel htmlFor="planning-personnel">
                      Personnel
                    </FieldLabel>
                    <Select
                      value={draftPersonnelId}
                      onValueChange={(v) => v && setDraftPersonnelId(v)}
                    >
                      <SelectTrigger id="planning-personnel" className="w-full">
                        <SelectValue placeholder="Choisir un personnel">
                          {(value: string | null) => {
                            const opt = personnelOptions!.find(
                              (o) => String(o.id) === value
                            );
                            return opt ? opt.label : "Choisir un personnel";
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {personnelOptions!.map((o) => (
                            <SelectItem key={o.id} value={String(o.id)}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor="planning-jour">Jour</FieldLabel>
                  <Select
                    value={draftJour}
                    onValueChange={(v) => v && setDraftJour(v)}
                  >
                    <SelectTrigger id="planning-jour" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value ? JOUR_LABELS[Number(value) - 1] : "Jour"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {JOUR_LABELS.map((label, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="planning-slot">Créneau</FieldLabel>
                  <Select
                    value={draftSlot}
                    onValueChange={(v) => v && setDraftSlot(v)}
                  >
                    <SelectTrigger id="planning-slot" className="w-full">
                      <SelectValue>
                        {(value: string | null) =>
                          value != null && slots[Number(value)]
                            ? slotLabel(slots[Number(value)])
                            : "Créneau"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {slots.map((slot, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {slotLabel(slot)}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" />}>
                  Annuler
                </DialogClose>
                <Button type="submit" disabled={adding}>
                  {adding && (
                    <Loader2 className="animate-spin" data-icon="inline-start" />
                  )}
                  Ajouter
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Emploi du temps hebdo récurrent (créneaux × jours) ──────────
// Le planning est une récurrence hebdomadaire (jour 1=lundi … 7=dimanche),
// sans dates : on affiche les 7 jours en colonnes, pas de calendrier daté.
function WeekView({
  events,
  slots,
  editable,
  onCellClick,
  emptyLabel,
}: {
  events: PlanningEvent[];
  slots: TimeSlot[];
  editable: boolean;
  onCellClick: (jour: number, slotIdx: number) => void;
  emptyLabel: string;
}) {
  const cols = `${GUTTER} repeat(7, minmax(0, 1fr))`;
  // Hauteur de rangée uniforme : en-tête auto, puis un plancher égal par créneau
  // (sinon la dernière rangée — souvent vide — paraît plus courte que les autres).
  const rows = `auto repeat(${slots.length}, minmax(3.5rem, auto))`;

  return (
    <div className="overflow-hidden rounded-lg border">
      <ScrollArea className="max-h-[36rem]">
        <div
          className="grid"
          style={{ gridTemplateColumns: cols, gridTemplateRows: rows }}
        >
          {/* En-tête */}
          <div className="sticky top-0 z-10 border-b bg-muted/60 backdrop-blur" />
          {JOUR_LABELS.map((label) => (
            <div
              key={label}
              className="sticky top-0 z-10 border-b border-l bg-muted/60 px-2 py-1.5 text-center text-sm font-medium backdrop-blur"
            >
              {label}
            </div>
          ))}

          {/* Lignes = créneaux */}
          {slots.map((slot, slotIdx) => (
            <React.Fragment key={slot.start}>
              <div className="flex items-start justify-end whitespace-nowrap border-t px-2 py-1 text-[0.7rem] tabular-nums text-muted-foreground">
                {slotLabel(slot)}
              </div>
              {JOUR_LABELS.map((label, i) => {
                const jour = i + 1;
                const cellEvents = eventsForJour(events, jour).filter((e) =>
                  eventOverlapsSlot(e, slot)
                );
                const canAdd = editable && cellEvents.length === 0;
                return (
                  <div
                    key={`${slotIdx}-${jour}`}
                    className={cn(
                      "group/cell min-h-14 border-t border-l p-1",
                      canAdd && "cursor-pointer hover:bg-accent/50"
                    )}
                    onClick={
                      canAdd ? () => onCellClick(jour, slotIdx) : undefined
                    }
                  >
                    {cellEvents.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {cellEvents.map((e) => (
                          <EventChip key={e.id} event={e} />
                        ))}
                      </div>
                    ) : (
                      canAdd && (
                        <div className="flex h-full items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100">
                          <Plus className="size-4 text-muted-foreground" />
                        </div>
                      )
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </ScrollArea>
      {events.length === 0 && !editable && (
        <p className="border-t p-3 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      )}
    </div>
  );
}

function EventChip({ event: e }: { event: PlanningEvent }) {
  return (
    <div
      title={`${fmtTime(e.start)}–${fmtTime(e.end)} · ${e.title}${
        e.subtitle ? ` · ${e.subtitle}` : ""
      }`}
      className={cn(
        "overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-[0.7rem] leading-tight shadow-sm",
        eventColor(e.colorIndex)
      )}
    >
      <div className="truncate font-medium">{e.title}</div>
      {e.subtitle && (
        <div className="truncate text-muted-foreground">{e.subtitle}</div>
      )}
    </div>
  );
}
