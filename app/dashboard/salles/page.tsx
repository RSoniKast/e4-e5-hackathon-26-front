"use client";

import * as React from "react";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { SalleRead, BatimentRead, CalculateurRead, SiteRead, PersonnelRead } from "@/lib/types";
import {
  getSalles,
  getBatiments,
  getSites,
  getCalculateurs,
  getPersonnels,
  getHoraires,
  createHoraire,
  createSalle,
  updateSalle,
  deleteSalle,
  updateCalculateur,
  ApiError,
} from "@/lib/api";
import { Planning } from "@/components/planning/planning";
import { horairesToEvents, type PlanningEvent, type HoraireDraft } from "@/lib/planning";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function SallesPage() {
  const [salles, setSalles] = React.useState<SalleRead[]>([]);
  const [batiments, setBatiments] = React.useState<BatimentRead[]>([]);
  const [sites, setSites] = React.useState<SiteRead[]>([]);
  const [calculateurs, setCalculateurs] = React.useState<CalculateurRead[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterSiteId, setFilterSiteId] = React.useState<string>("");
  const [filterBatimentId, setFilterBatimentId] = React.useState<string>("");
  const [createOpen, setCreateOpen] = React.useState(false);
  // Calculateurs liés à la salle sélectionnée (multi-select contrôlé, ids en string).
  const [selectedCalcIds, setSelectedCalcIds] = React.useState<string[]>([]);
  const [planningEvents, setPlanningEvents] = React.useState<PlanningEvent[]>(
    []
  );
  // Site choisi dans les formulaires : restreint les bâtiments proposés à ce site.
  const [createSiteId, setCreateSiteId] = React.useState<string>("");
  const [createBatId, setCreateBatId] = React.useState<string>("");
  const [editSiteId, setEditSiteId] = React.useState<string>("");
  const [editBatId, setEditBatId] = React.useState<string>("");
  // Personnels chargés pour le planning (options du sélecteur "Personnel" dans
  // le dialog d'ajout de créneau).
  const [planningPersonnels, setPlanningPersonnels] = React.useState<
    PersonnelRead[]
  >([]);

  // (Re)charge l'occupation hebdomadaire des personnels (aucun lien
  // salle↔personnel exposé par l'API : la vue est commune à l'établissement).
  const reloadPlanning = React.useCallback(async () => {
    try {
      const people = await getPersonnels();
      const lists = await Promise.all(
        people.map((pp) => getHoraires(pp.id).catch(() => []))
      );
      const evts = people.flatMap((pp, i) =>
        horairesToEvents(lists[i], {
          title: `${pp.prenom} ${pp.nom}`,
          colorIndex: i,
          keyPrefix: `sp${pp.id}`,
        })
      );
      setPlanningPersonnels(people);
      setPlanningEvents(evts);
    } catch {
      /* planning optionnel : on ignore les erreurs de chargement */
    }
  }, []);

  React.useEffect(() => {
    reloadPlanning();
  }, [reloadPlanning]);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [sallesData, batimentsData, sitesData, calcData] = await Promise.all([
        getSalles(),
        getBatiments(),
        getSites(),
        getCalculateurs(),
      ]);
      setSalles(sallesData);
      setBatiments(batimentsData);
      setSites(sitesData);
      setCalculateurs(calcData);

      if (sallesData.length > 0 && selectedId === null) {
        setSelectedId(sallesData[0].id);
      }
    } catch {
      toast.error("Erreur lors du chargement des salles");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Get batiment name for a salle
  const getBatimentName = (batimentId: number) =>
    batiments.find((b) => b.id === batimentId)?.nom ?? "—";

  // Get site name for a batiment
  const getSiteName = (batimentId: number) => {
    const bat = batiments.find((b) => b.id === batimentId);
    if (!bat) return "—";
    return sites.find((s) => s.id === bat.site_id)?.nom ?? "—";
  };

  // Filter salles
  const filteredSalles = salles.filter((s) => {
    if (searchQuery && !s.nom.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterBatimentId && s.batiment_id !== parseInt(filterBatimentId)) return false;
    if (filterSiteId) {
      const bat = batiments.find((b) => b.id === s.batiment_id);
      if (!bat || bat.site_id !== parseInt(filterSiteId)) return false;
    }
    return true;
  });

  const selected = salles.find((s) => s.id === selectedId) ?? salles[0];
  const allCalcs = calculateurs;

  // Aligne la sélection du multi-select sur les calculateurs réellement liés
  // à la salle courante (au changement de salle ou après un rechargement).
  React.useEffect(() => {
    setSelectedCalcIds(
      calculateurs
        .filter((c) => c.salle_id === selected?.id)
        .map((c) => String(c.id))
    );
  }, [selected?.id, calculateurs]);

  // Initialise les sélecteurs Site/Bâtiment du formulaire de détail sur la
  // salle courante (le site est déduit du bâtiment de la salle).
  React.useEffect(() => {
    if (!selected) return;
    const bat = batiments.find((b) => b.id === selected.batiment_id);
    setEditSiteId(bat ? String(bat.site_id) : "");
    setEditBatId(String(selected.batiment_id));
  }, [selected?.id, batiments]);

  // Filter batiments by site for create dialog
  const filteredBatimentsForFilter = filterSiteId
    ? batiments.filter((b) => b.site_id === parseInt(filterSiteId))
    : batiments;

  // Bâtiments d'un site donné (id en string), pour les sélecteurs de formulaire.
  const batimentsForSite = (siteId: string) =>
    siteId ? batiments.filter((b) => String(b.site_id) === siteId) : [];

  // Tronque un libellé trop long pour un dropdown compact ("…" en fin).
  const truncateLabel = (text: string, max = 20) =>
    text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

  // Handle save
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateSalle(selected.id, {
        nom: formData.get("salle-nom") as string,
        capacite: formData.get("salle-cap") ? parseInt(formData.get("salle-cap") as string) : null,
        batiment_id: editBatId ? parseInt(editBatId) : undefined,
        heure_fermeture: (formData.get("salle-heure") as string) || null,
      });

      // Update calculateur links: assign salle_id to selected calculateurs, remove from the rest
      const checkedCalcIds = new Set(
        selectedCalcIds.map((v) => parseInt(v, 10))
      );
      for (const calc of allCalcs) {
        const shouldBeLinked = checkedCalcIds.has(calc.id);
        const isLinked = calc.salle_id === selected.id;
        if (shouldBeLinked && !isLinked) {
          await updateCalculateur(calc.id, { salle_id: selected.id });
        } else if (!shouldBeLinked && isLinked) {
          await updateCalculateur(calc.id, { salle_id: null });
        }
      }

      toast.success(`Salle ${formData.get("salle-nom")} enregistrée`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Handle create
  async function handleCreateSalle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!createBatId) {
      toast.error("Veuillez choisir un bâtiment");
      return;
    }
    try {
      await createSalle({
        nom: formData.get("nom") as string,
        batiment_id: parseInt(createBatId),
        capacite: formData.get("capacite") ? parseInt(formData.get("capacite") as string) : undefined,
        heure_fermeture: (formData.get("heure_fermeture") as string) || undefined,
      });
      toast.success("Salle créée avec succès");
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la création");
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteSalle(selected.id);
      toast.success(`Salle ${selected.nom} supprimée`);
      setSelectedId(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la suppression");
    }
  }

  // Ajout d'un créneau depuis le planning → POST /api/personnels/{pid}/horaires.
  // Le personnel est choisi dans le dialog (draft.personnelId) ; on le retire
  // du corps envoyé (ce n'est pas un champ HoraireCreate). L'horaire est rattaché
  // au personnel et apparaît dans la vue établissement de toutes les salles.
  async function handleAddHoraire({ personnelId, ...draft }: HoraireDraft) {
    if (!personnelId) {
      toast.error("Choisissez d'abord un personnel");
      return;
    }
    try {
      await createHoraire(personnelId, draft);
      toast.success("Créneau ajouté");
      await reloadPlanning();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de l'ajout du créneau"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <SidebarTrigger />
        <h1 className="font-heading text-lg font-semibold">Salles de classe</h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-52">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher une salle…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Select value={filterSiteId} onValueChange={(v) => { setFilterSiteId(v ?? ""); setFilterBatimentId(""); }}>
            <SelectTrigger className="w-36" aria-label="Filtrer par site">
              <SelectValue placeholder="Site">
                {(value: string | null) => {
                  if (!value) return "Site";
                  const s = sites.find((x) => String(x.id) === value);
                  return s ? truncateLabel(s.nom) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)} title={s.nom}>
                    {truncateLabel(s.nom)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select value={filterBatimentId} onValueChange={(v) => setFilterBatimentId(v ?? "")}>
            <SelectTrigger className="w-36" aria-label="Filtrer par bâtiment">
              <SelectValue placeholder="Bâtiment">
                {(value: string | null) => {
                  if (!value) return "Bâtiment";
                  const b = filteredBatimentsForFilter.find((x) => String(x.id) === value);
                  return b ? truncateLabel(b.nom) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filteredBatimentsForFilter.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)} title={b.nom}>
                    {truncateLabel(b.nom)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Dialog
            open={createOpen}
            onOpenChange={(o) => {
              setCreateOpen(o);
              if (o) {
                setCreateSiteId("");
                setCreateBatId("");
              }
            }}
          >
            <DialogTrigger render={<Button />}>
              <Plus data-icon="inline-start" />
              Salle
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateSalle}>
                <DialogHeader>
                  <DialogTitle>Nouvelle salle</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations de la nouvelle salle.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup className="py-4">
                  <Field>
                    <FieldLabel htmlFor="create-salle-nom">Nom</FieldLabel>
                    <Input id="create-salle-nom" name="nom" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-salle-site">Site</FieldLabel>
                    <Select
                      value={createSiteId}
                      onValueChange={(v) => {
                        setCreateSiteId(v ?? "");
                        setCreateBatId("");
                      }}
                    >
                      <SelectTrigger id="create-salle-site" className="w-full">
                        <SelectValue placeholder="Choisir un site">
                          {(value: string | null) => {
                            if (!value) return "Choisir un site";
                            const s = sites.find((x) => String(x.id) === value);
                            return s ? s.nom : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sites.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-salle-bat">Bâtiment</FieldLabel>
                    <Select
                      name="batiment_id"
                      value={createBatId}
                      onValueChange={(v) => setCreateBatId(v ?? "")}
                      disabled={!createSiteId}
                    >
                      <SelectTrigger id="create-salle-bat" className="w-full">
                        <SelectValue placeholder="Choisir un bâtiment">
                          {(value: string | null) => {
                            if (!value)
                              return createSiteId
                                ? "Choisir un bâtiment"
                                : "Choisir un site d'abord";
                            const b = batiments.find((x) => String(x.id) === value);
                            return b ? b.nom : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {batimentsForSite(createSiteId).map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.nom}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="create-salle-cap">Capacité</FieldLabel>
                      <Input id="create-salle-cap" name="capacite" type="number" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="create-salle-heure">Heure de fermeture</FieldLabel>
                      <Input id="create-salle-heure" name="heure_fermeture" type="time" />
                    </Field>
                  </div>
                </FieldGroup>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" />}>
                    Annuler
                  </DialogClose>
                  <Button type="submit">Créer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[1fr_minmax(320px,400px)]">
        {/* Liste */}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="w-24">Capacité</TableHead>
                <TableHead>Bâtiment / Site</TableHead>
                <TableHead className="w-16 text-right">Calc.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucune salle trouvée
                  </TableCell>
                </TableRow>
              ) : (
                filteredSalles.map((s) => (
                  <TableRow
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    data-state={s.id === selectedId ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{s.nom}</TableCell>
                    <TableCell>{s.capacite ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {getBatimentName(s.batiment_id)} · {getSiteName(s.batiment_id)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {calculateurs.filter((c) => c.salle_id === s.id).length}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Détail */}
        {selected ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary">Salle {selected.nom}</CardTitle>
              <ConfirmDialog
                title="Supprimer cette salle ?"
                description={
                  <>
                    La salle {selected.nom} et ses calculateurs associés seront
                    définitivement supprimés. Cette action est irréversible.
                  </>
                }
                onConfirm={handleDelete}
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" data-icon="inline-start" />
                    Supprimer
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <form
                key={selected.id}
                onSubmit={handleSave}
                className="flex flex-1 flex-col gap-6"
              >
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="salle-nom">Nom</FieldLabel>
                      <Input id="salle-nom" name="salle-nom" defaultValue={selected.nom} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="salle-cap">Capacité</FieldLabel>
                      <Input
                        id="salle-cap"
                        name="salle-cap"
                        type="number"
                        defaultValue={selected.capacite ?? ""}
                      />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="salle-heure">Heure de fermeture</FieldLabel>
                    <Input
                      id="salle-heure"
                      name="salle-heure"
                      type="time"
                      defaultValue={selected.heure_fermeture ?? ""}
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="salle-site">Site</FieldLabel>
                      <Select
                        value={editSiteId}
                        onValueChange={(v) => {
                          setEditSiteId(v ?? "");
                          setEditBatId("");
                        }}
                      >
                        <SelectTrigger id="salle-site" className="w-full">
                          <SelectValue placeholder="Choisir un site">
                            {(value: string | null) => {
                              if (!value) return "Choisir un site";
                              const s = sites.find((x) => String(x.id) === value);
                              return s ? s.nom : value;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {sites.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.nom}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="salle-bat">Bâtiment</FieldLabel>
                      <Select
                        value={editBatId}
                        onValueChange={(v) => setEditBatId(v ?? "")}
                        disabled={!editSiteId}
                      >
                        <SelectTrigger id="salle-bat" className="w-full">
                          <SelectValue placeholder="Choisir un bâtiment">
                            {(value: string | null) => {
                              if (!value) return "Choisir un bâtiment";
                              const b = batiments.find((x) => String(x.id) === value);
                              return b ? b.nom : value;
                            }}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {batimentsForSite(editSiteId).map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.nom}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>

                <Separator />

                <div className="flex flex-col gap-3">
                  <h3 className="font-heading text-sm font-medium text-primary">
                    Calculateurs liés
                  </h3>
                  {allCalcs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucun calculateur enregistré
                    </p>
                  ) : (
                    <Field>
                      <Select
                        multiple
                        value={selectedCalcIds}
                        onValueChange={(v) => setSelectedCalcIds(v as string[])}
                      >
                        <SelectTrigger className="w-full" aria-label="Calculateurs liés">
                          <SelectValue>
                            {(value: string[]) =>
                              !value || value.length === 0
                                ? "Aucun calculateur lié"
                                : `${value.length} calculateur${
                                    value.length > 1 ? "s" : ""
                                  } lié${value.length > 1 ? "s" : ""}`
                            }
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          <SelectGroup>
                            {allCalcs.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.nom} · {c.ip_adresse ?? "pas d'IP"}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                </div>

                <Button type="submit" className="mt-auto w-full" disabled={saving}>
                  {saving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
                  Enregistrer
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-muted-foreground">Sélectionnez une salle</p>
          </Card>
        )}
      </div>

      {/* ─── Planning des salles ─────────────────────────────────── */}
      <div className="px-4 pb-4">
        <Card>
          <CardHeader>
            <CardTitle>
              Planning{selected ? ` — ${selected.nom}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Planning
              events={planningEvents}
              onCreateHoraire={handleAddHoraire}
              emptyLabel="Aucun horaire de personnel enregistré."
              closingTime={selected?.heure_fermeture ?? null}
              personnelOptions={planningPersonnels.map((pp) => ({
                id: pp.id,
                label: `${pp.prenom} ${pp.nom}`,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
