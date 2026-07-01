"use client";

import * as React from "react";
import {
  Search,
  Plus,
  Loader2,
  Trash2,
  Upload,
  Download,
  UserPlus,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";

import type {
  ClasseRead,
  EleveRead,
  PersonnelRead,
  PersonnelClasseRead,
} from "@/lib/types";
import {
  getClasses,
  createClasse,
  updateClasse,
  deleteClasse,
  getClasseEleves,
  affecterEleveClasse,
  retirerEleveClasse,
  getClassePersonnels,
  affecterPersonnelClasse,
  retirerPersonnelClasse,
  getEleves,
  getPersonnels,
  getHoraires,
  importEleves,
  createEleve,
  updateEleve,
  ApiError,
} from "@/lib/api";
import { Planning } from "@/components/planning/planning";
import { horairesToEvents, type PlanningEvent } from "@/lib/planning";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Telephone : chiffres, espaces et + autorises, au moins un chiffre
const TEL_PATTERN = "[+0-9 ]*[0-9][+0-9 ]*";
const TEL_TITLE = "Chiffres, espaces et + autorises";

// Generate school year options (current +-2)
function getAnneeScolaireOptions(): string[] {
  const currentYear = new Date().getFullYear();
  const options: string[] = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) {
    options.push(`${y}-${y + 1}`);
  }
  return options;
}

export default function ClassesElevesPage() {
  const [classes, setClasses] = React.useState<ClasseRead[]>([]);
  const [elevesMap, setElevesMap] = React.useState<
    Record<number, EleveRead[]>
  >({});
  const [personnelsMap, setPersonnelsMap] = React.useState<
    Record<number, PersonnelClasseRead[]>
  >({});
  const [allEleves, setAllEleves] = React.useState<EleveRead[]>([]);
  const [allPersonnels, setAllPersonnels] = React.useState<PersonnelRead[]>(
    []
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const anneeOptions = React.useMemo(() => getAnneeScolaireOptions(), []);
  const [filterAnnee, setFilterAnnee] = React.useState(
    () => {
      const y = new Date().getFullYear();
      const m = new Date().getMonth(); // 0-indexed, 0=Jan
      // If before August, use previous year start
      return m < 7 ? `${y - 1}-${y}` : `${y}-${y + 1}`;
    }
  );

  const [createOpen, setCreateOpen] = React.useState(false);
  const [addProfOpen, setAddProfOpen] = React.useState(false);
  const [addEleveOpen, setAddEleveOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editEleve, setEditEleve] = React.useState<EleveRead | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const [classesData, elevesData, personnelsData] = await Promise.all([
        getClasses(filterAnnee),
        getEleves(),
        getPersonnels(),
      ]);
      setClasses(classesData);
      setAllEleves(elevesData);
      setAllPersonnels(personnelsData);

      // Load eleves & personnels for each class
      const eMap: Record<number, EleveRead[]> = {};
      const pMap: Record<number, PersonnelClasseRead[]> = {};
      await Promise.all(
        classesData.map(async (c) => {
          const [eleves, profs] = await Promise.all([
            getClasseEleves(c.id).catch(() => [] as EleveRead[]),
            getClassePersonnels(c.id).catch(() => [] as PersonnelClasseRead[]),
          ]);
          eMap[c.id] = eleves;
          pMap[c.id] = profs;
        })
      );
      setElevesMap(eMap);
      setPersonnelsMap(pMap);

      if (classesData.length > 0) {
        setSelectedId((prev) => prev ?? classesData[0].id);
      }
    } catch {
      toast.error("Erreur lors du chargement des classes");
    } finally {
      setLoading(false);
    }
  }, [filterAnnee]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const selected =
    classes.find((c) => c.id === selectedId) ?? classes[0] ?? null;
  const classeEleves = selected ? elevesMap[selected.id] ?? [] : [];
  const classeProfs = selected ? personnelsMap[selected.id] ?? [] : [];

  // Planning de la classe : horaires de chaque professeur affecté.
  const [planningEvents, setPlanningEvents] = React.useState<PlanningEvent[]>(
    []
  );
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selected) {
        setPlanningEvents([]);
        return;
      }
      const profs = personnelsMap[selected.id] ?? [];
      const lists = await Promise.all(
        profs.map((cp) => getHoraires(cp.personnel_id).catch(() => []))
      );
      if (cancelled) return;
      const evts = profs.flatMap((cp, i) =>
        horairesToEvents(lists[i], {
          title: cp.matiere || "Cours",
          subtitle: `${cp.prenom} ${cp.nom}`,
          colorIndex: i,
          keyPrefix: `c${selected.id}-p${cp.personnel_id}`,
        })
      );
      setPlanningEvents(evts);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected, personnelsMap]);

  // Filter classes
  const filteredClasses = searchQuery
    ? classes.filter(
      (c) =>
        c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.niveau ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    : classes;

  // ─── Handlers ──────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await updateClasse(selected.id, {
        nom: fd.get("c-nom") as string,
        niveau: (fd.get("c-niveau") as string) || null,
        annee_scolaire: fd.get("c-annee") as string,
      });
      toast.success(`Classe ${fd.get("c-nom")} enregistree`);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de la sauvegarde"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await createClasse({
        nom: fd.get("nom") as string,
        niveau: (fd.get("niveau") as string) || undefined,
        annee_scolaire: fd.get("annee_scolaire") as string,
      });
      toast.success("Classe creee avec succes");
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de la creation"
      );
    }
  }

  async function handleDelete() {
    if (!selected) return;
    try {
      await deleteClasse(selected.id);
      toast.success(`Classe ${selected.nom} supprimee`);
      setSelectedId(null);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Erreur lors de la suppression"
      );
    }
  }

  async function handleAddProf(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    try {
      await affecterPersonnelClasse(selected.id, {
        personnel_id: parseInt(fd.get("personnel_id") as string),
        matiere: (fd.get("matiere") as string) || "",
      });
      toast.success("Professeur affecte");
      setAddProfOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de l'affectation"
      );
    }
  }

  async function handleRemoveProf(personnelId: number) {
    if (!selected) return;
    try {
      await retirerPersonnelClasse(selected.id, personnelId);
      toast.success("Professeur retire");
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors du retrait"
      );
    }
  }

  async function handleAddEleve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const fd = new FormData(e.currentTarget);
    try {
      const newEleve = await createEleve({
        identifiant: fd.get("identifiant") as string,
        nom: fd.get("nom") as string,
        prenom: fd.get("prenom") as string,
        email: (fd.get("email") as string) || undefined,
        telephone: (fd.get("telephone") as string) || undefined,
      });
      await affecterEleveClasse(selected.id, {
        eleve_id: newEleve.id,
        annee_scolaire: selected.annee_scolaire,
      });
      toast.success(`${newEleve.prenom} ${newEleve.nom} cree et affecte a la classe`);
      setAddEleveOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de la creation"
      );
    }
  }

  async function handleEditEleve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editEleve) return;
    const fd = new FormData(e.currentTarget);
    try {
      await updateEleve(editEleve.id, {
        identifiant: fd.get("identifiant") as string,
        nom: fd.get("nom") as string,
        prenom: fd.get("prenom") as string,
        email: (fd.get("email") as string) || null,
        telephone: (fd.get("telephone") as string) || null,
      });
      toast.success(
        `${fd.get("prenom")} ${fd.get("nom")} modifie`
      );
      setEditEleve(null);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de la modification"
      );
    }
  }

  async function handleRemoveEleve(eleveId: number) {
    if (!selected) return;
    try {
      await retirerEleveClasse(selected.id, eleveId);
      toast.success("Eleve retire de la classe");
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors du retrait"
      );
    }
  }

  async function handleImportCSV(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File;
    if (!file || !file.name) return;
    try {
      const result = await importEleves(file);
      toast.success(
        `Import : ${result.importes} importe(s), ${result.ignores} ignore(s)${result.erreurs.length > 0
          ? `, ${result.erreurs.length} erreur(s)`
          : ""
        }`
      );
      setImportOpen(false);
      await loadData();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.detail : "Erreur lors de l'import"
      );
    }
  }

  function handleExportList() {
    if (!selected || classeEleves.length === 0) {
      toast.error("Aucun eleve a exporter");
      return;
    }
    const headers = ["identifiant", "nom", "prenom", "email", "telephone"];
    const csvRows = [headers.join(",")];
    for (const e of classeEleves) {
      csvRows.push(
        [
          e.identifiant,
          e.nom,
          e.prenom,
          e.email ?? "",
          e.telephone ?? "",
        ]
          .map((v) => `"${v.replace(/"/g, '""')}"`)
          .join(",")
      );
    }
    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selected.nom}_eleves.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export telecharge");
  }

  if (loading && classes.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ─── Header ──────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <SidebarTrigger />
        <h1 className="font-heading text-lg font-semibold">
          Classes &amp; Eleves
        </h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-48">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
            />
          </InputGroup>

          {/* Year dropdown */}
          <Select value={filterAnnee} onValueChange={(v) => { if (v) setFilterAnnee(v); }}>
            <SelectTrigger className="w-36" aria-label="Filtrer par annee">
              <SelectValue placeholder="Annee" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {anneeOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          {/* Export button */}
          <Button variant="outline" size="sm" onClick={handleExportList}>
            <Download className="size-4" data-icon="inline-start" />
            Export liste
          </Button>

          {/* Create class dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus data-icon="inline-start" />
              Classe
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Nouvelle classe</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations de la nouvelle classe.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup className="py-4">
                  <Field>
                    <FieldLabel htmlFor="create-classe-nom">Nom</FieldLabel>
                    <Input
                      id="create-classe-nom"
                      name="nom"
                      required
                      placeholder="Ex: 3eme A"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-classe-niveau">
                      Niveau
                    </FieldLabel>
                    <Input
                      id="create-classe-niveau"
                      name="niveau"
                      placeholder="Ex: 3eme"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-classe-annee">
                      Annee scolaire
                    </FieldLabel>
                    <Select name="annee_scolaire" required defaultValue={filterAnnee}>
                      <SelectTrigger
                        id="create-classe-annee"
                        className="w-full"
                      >
                        <SelectValue placeholder="Annee" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {anneeOptions.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
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
                  <Button type="submit">Creer</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Classes table (left) */}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Classe</TableHead>
                <TableHead>Niveau</TableHead>
                <TableHead className="w-16 text-right">Eleves</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground"
                  >
                    Aucune classe trouvee
                  </TableCell>
                </TableRow>
              ) : (
                filteredClasses.map((c) => (
                  <TableRow
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    data-state={c.id === selectedId ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.niveau ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(elevesMap[c.id] ?? []).length}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Detail (right) */}
        {selected ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Classe —{" "}
                <span className="text-primary">{selected.nom}</span>
              </CardTitle>
              <ConfirmDialog
                title="Supprimer cette classe ?"
                description={
                  <>
                    La classe {selected.nom} sera définitivement supprimée.
                    Cette action est irréversible.
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
              <Tabs
                key={selected.id}
                defaultValue="classe"
                className="gap-6"
              >
                <TabsList variant="line" className="w-full justify-start">
                  <TabsTrigger value="classe">Classe</TabsTrigger>
                  <TabsTrigger value="planning">Planning</TabsTrigger>
                  <TabsTrigger value="eleves">Élèves</TabsTrigger>
                </TabsList>

                {/* ─── Onglet Classe : paramètres ─────────────────── */}
                <TabsContent value="classe">
                  <form onSubmit={handleSave} className="flex flex-col gap-4">
                    <FieldGroup>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <Field>
                          <FieldLabel htmlFor="c-nom">Nom</FieldLabel>
                          <Input
                            id="c-nom"
                            name="c-nom"
                            defaultValue={selected.nom}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-niveau">Niveau</FieldLabel>
                          <Input
                            id="c-niveau"
                            name="c-niveau"
                            defaultValue={selected.niveau ?? ""}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="c-annee">
                            Annee scolaire
                          </FieldLabel>
                          <Input
                            id="c-annee"
                            name="c-annee"
                            defaultValue={selected.annee_scolaire}
                          />
                        </Field>
                      </div>
                    </FieldGroup>
                    <div className="flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving && (
                          <Loader2
                            className="size-4 animate-spin"
                            data-icon="inline-start"
                          />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* ─── Onglet Planning : professeurs + planning ───── */}
                <TabsContent
                  value="planning"
                  className="flex flex-col gap-6"
                >
                  {/* ─── Professeurs section ──────────────────────── */}
                  <div className="flex flex-col gap-3">
                    <h3 className="font-heading text-sm font-medium text-primary">
                      Professeurs
                    </h3>
                    <div className="flex flex-wrap items-center gap-2">
                      {classeProfs.map((cp) => (
                        <Badge
                          key={`${cp.personnel_id}-${cp.matiere}`}
                          variant="secondary"
                          className="gap-3 py-3 pl-3 pr-2 text-sm"
                        >
                          {cp.nom} {cp.prenom}
                          {cp.matiere ? ` - ${cp.matiere}` : ""}
                          <ConfirmDialog
                            title="Retirer ce professeur ?"
                            description={
                              <>
                                {cp.nom} {cp.prenom} sera retiré de la classe
                                {selected ? ` ${selected.nom}` : ""}.
                              </>
                            }
                            confirmLabel="Retirer"
                            onConfirm={() =>
                              handleRemoveProf(cp.personnel_id)
                            }
                            trigger={
                              <button
                                type="button"
                                className="ml-1 rounded-full p-1 hover:bg-primary/20"
                              >
                                <Trash2 className="size-3" />
                              </button>
                            }
                          />
                        </Badge>
                      ))}

                      <Dialog open={addProfOpen} onOpenChange={setAddProfOpen}>
                        <DialogTrigger
                          render={
                            <Button variant="outline" size="sm" className="h-7 gap-1 rounded-full px-3 text-xs" />
                          }
                        >
                          <Plus className="size-3" />
                          Ajouter un professeur
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleAddProf}>
                            <DialogHeader>
                              <DialogTitle>Affecter un professeur</DialogTitle>
                              <DialogDescription>
                                Choisissez un professeur et sa matiere pour cette
                                classe.
                              </DialogDescription>
                            </DialogHeader>
                            <FieldGroup className="py-4">
                              <Field>
                                <FieldLabel htmlFor="add-prof-id">
                                  Professeur
                                </FieldLabel>
                                <Select name="personnel_id" required>
                                  <SelectTrigger
                                    id="add-prof-id"
                                    className="w-full"
                                  >
                                    <SelectValue placeholder="Choisir un professeur">
                                      {(value: string | null) => {
                                        if (!value) return "Choisir un professeur";
                                        const p = allPersonnels.find((x) => String(x.id) === value);
                                        return p ? `${p.prenom} ${p.nom}` : value;
                                      }}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      {allPersonnels.map((p) => (
                                        <SelectItem
                                          key={p.id}
                                          value={String(p.id)}
                                        >
                                          {p.prenom} {p.nom}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="add-prof-matiere">
                                  Matiere
                                </FieldLabel>
                                <Input
                                  id="add-prof-matiere"
                                  name="matiere"
                                  placeholder="Ex: Mathematiques"
                                />
                              </Field>
                            </FieldGroup>
                            <DialogFooter>
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Annuler
                              </DialogClose>
                              <Button type="submit">Affecter</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <Separator />

                  {/* ─── Planning section ─────────────────────────── */}
                  <div className="flex flex-col gap-3">
                    <h3 className="font-heading text-sm font-medium text-primary">
                      Planning de la classe
                    </h3>
                    <Planning
                      events={planningEvents}
                      emptyLabel="Aucun horaire de cours. Affectez des professeurs disposant d'horaires."
                    />
                  </div>
                </TabsContent>

                {/* ─── Onglet Élèves : liste + import ─────────────── */}
                <TabsContent value="eleves">
                  <div className="flex flex-col gap-3">
                    <h3 className="font-heading text-sm font-medium text-primary">
                      Eleves ({classeEleves.length})
                    </h3>

                    {classeEleves.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun eleve affecte a cette classe.
                      </p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Nom</TableHead>
                              <TableHead>Identifiant</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Telephone</TableHead>
                              <TableHead className="w-24"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {classeEleves.map((eleve) => (
                              <TableRow key={eleve.id}>
                                <TableCell className="font-medium">
                                  {eleve.prenom} {eleve.nom}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {eleve.identifiant}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {eleve.email ?? "—"}
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  {eleve.telephone ?? "—"}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setEditEleve(eleve)}
                                      aria-label="Modifier l'eleve"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                    <ConfirmDialog
                                      title="Retirer cet élève ?"
                                      description={
                                        <>
                                          {eleve.prenom} {eleve.nom} sera retiré
                                          de la classe
                                          {selected ? ` ${selected.nom}` : ""}.
                                        </>
                                      }
                                      confirmLabel="Retirer"
                                      onConfirm={() =>
                                        handleRemoveEleve(eleve.id)
                                      }
                                      trigger={
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="size-4 text-destructive" />
                                        </Button>
                                      }
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Action buttons under eleves table */}
                    <div className="flex flex-wrap gap-2">
                      {/* Import CSV dialog */}
                      <Dialog open={importOpen} onOpenChange={setImportOpen}>
                        <DialogTrigger
                          render={<Button variant="outline" size="sm" />}
                        >
                          <Upload
                            className="size-4"
                            data-icon="inline-start"
                          />
                          Importer eleves CSV
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleImportCSV}>
                            <DialogHeader>
                              <DialogTitle>Importer des eleves (CSV)</DialogTitle>
                              <DialogDescription>
                                Le fichier CSV doit contenir les colonnes :
                                identifiant, nom, prenom, email, telephone.
                              </DialogDescription>
                            </DialogHeader>
                            <FieldGroup className="py-4">
                              <Field>
                                <FieldLabel htmlFor="import-file">
                                  Fichier CSV
                                </FieldLabel>
                                <Input
                                  id="import-file"
                                  name="file"
                                  type="file"
                                  accept=".csv"
                                  required
                                />
                              </Field>
                            </FieldGroup>
                            <DialogFooter>
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Annuler
                              </DialogClose>
                              <Button type="submit">Importer</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>

                      {/* Ajouter eleve dialog */}
                      <Dialog open={addEleveOpen} onOpenChange={setAddEleveOpen}>
                        <DialogTrigger render={<Button size="sm" />}>
                          <Plus
                            className="size-4"
                            data-icon="inline-start"
                          />
                          Affecter un eleve
                        </DialogTrigger>
                        <DialogContent>
                          <form onSubmit={handleAddEleve}>
                            <DialogHeader>
                              <DialogTitle>Nouvel eleve</DialogTitle>
                              <DialogDescription>
                                Creez un eleve et affectez-le directement a la
                                classe {selected.nom}.
                              </DialogDescription>
                            </DialogHeader>
                            <FieldGroup className="py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Field>
                                  <FieldLabel htmlFor="add-eleve-nom">
                                    Nom
                                  </FieldLabel>
                                  <Input
                                    id="add-eleve-nom"
                                    name="nom"
                                    required
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor="add-eleve-prenom">
                                    Prenom
                                  </FieldLabel>
                                  <Input
                                    id="add-eleve-prenom"
                                    name="prenom"
                                    required
                                  />
                                </Field>
                              </div>
                              <Field>
                                <FieldLabel htmlFor="add-eleve-identifiant">
                                  Identifiant
                                </FieldLabel>
                                <Input
                                  id="add-eleve-identifiant"
                                  name="identifiant"
                                  required
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="add-eleve-email">
                                  Email
                                </FieldLabel>
                                <Input
                                  id="add-eleve-email"
                                  name="email"
                                  type="email"
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="add-eleve-tel">
                                  Telephone
                                </FieldLabel>
                                <Input
                                  id="add-eleve-tel"
                                  name="telephone"
                                  type="tel"
                                  inputMode="tel"
                                  pattern={TEL_PATTERN}
                                  title={TEL_TITLE}
                                  placeholder="+33 6 12 34 56 78"
                                />
                              </Field>
                            </FieldGroup>
                            <DialogFooter>
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Annuler
                              </DialogClose>
                              <Button type="submit">Creer et affecter</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {/* Modifier eleve dialog */}
                    <Dialog
                      open={editEleve !== null}
                      onOpenChange={(o) => {
                        if (!o) setEditEleve(null);
                      }}
                    >
                      <DialogContent>
                        {editEleve && (
                          <form onSubmit={handleEditEleve} key={editEleve.id}>
                            <DialogHeader>
                              <DialogTitle>Modifier l&apos;eleve</DialogTitle>
                              <DialogDescription>
                                Modifiez les informations de {editEleve.prenom}{" "}
                                {editEleve.nom}.
                              </DialogDescription>
                            </DialogHeader>
                            <FieldGroup className="py-4">
                              <div className="grid grid-cols-2 gap-4">
                                <Field>
                                  <FieldLabel htmlFor="edit-eleve-nom">
                                    Nom
                                  </FieldLabel>
                                  <Input
                                    id="edit-eleve-nom"
                                    name="nom"
                                    defaultValue={editEleve.nom}
                                    required
                                  />
                                </Field>
                                <Field>
                                  <FieldLabel htmlFor="edit-eleve-prenom">
                                    Prenom
                                  </FieldLabel>
                                  <Input
                                    id="edit-eleve-prenom"
                                    name="prenom"
                                    defaultValue={editEleve.prenom}
                                    required
                                  />
                                </Field>
                              </div>
                              <Field>
                                <FieldLabel htmlFor="edit-eleve-identifiant">
                                  Identifiant
                                </FieldLabel>
                                <Input
                                  id="edit-eleve-identifiant"
                                  name="identifiant"
                                  defaultValue={editEleve.identifiant}
                                  required
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="edit-eleve-email">
                                  Email
                                </FieldLabel>
                                <Input
                                  id="edit-eleve-email"
                                  name="email"
                                  type="email"
                                  defaultValue={editEleve.email ?? ""}
                                />
                              </Field>
                              <Field>
                                <FieldLabel htmlFor="edit-eleve-tel">
                                  Telephone
                                </FieldLabel>
                                <Input
                                  id="edit-eleve-tel"
                                  name="telephone"
                                  type="tel"
                                  inputMode="tel"
                                  pattern={TEL_PATTERN}
                                  title={TEL_TITLE}
                                  placeholder="+33 6 12 34 56 78"
                                  defaultValue={editEleve.telephone ?? ""}
                                />
                              </Field>
                            </FieldGroup>
                            <DialogFooter>
                              <DialogClose
                                render={<Button variant="outline" />}
                              >
                                Annuler
                              </DialogClose>
                              <Button type="submit">Enregistrer</Button>
                            </DialogFooter>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-muted-foreground">
              Selectionnez une classe
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
