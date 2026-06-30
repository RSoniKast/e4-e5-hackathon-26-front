"use client";

import * as React from "react";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { SalleRead, BatimentRead, CalculateurRead, SiteRead } from "@/lib/types";
import {
  getSalles,
  getBatiments,
  getSites,
  getCalculateurs,
  createSalle,
  updateSalle,
  deleteSalle,
  updateCalculateur,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  const salleCalcs = calculateurs.filter((c) => c.salle_id === selected?.id);
  const allCalcs = calculateurs;

  // Filter batiments by site for create dialog
  const filteredBatimentsForFilter = filterSiteId
    ? batiments.filter((b) => b.site_id === parseInt(filterSiteId))
    : batiments;

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
        batiment_id: formData.get("salle-bat") ? parseInt(formData.get("salle-bat") as string) : undefined,
        heure_fermeture: (formData.get("salle-heure") as string) || null,
      });

      // Update calculateur links: assign salle_id to checked calculateurs, remove from unchecked
      const checkedCalcIds = new Set(
        Array.from(formData.getAll("calc")).map((v) => parseInt(v as string))
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
    try {
      await createSalle({
        nom: formData.get("nom") as string,
        batiment_id: parseInt(formData.get("batiment_id") as string),
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
            <SelectTrigger className="w-28" aria-label="Filtrer par site">
              <SelectValue placeholder="Site">
                {(value: string | null) => {
                  if (!value) return "Site";
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
          <Select value={filterBatimentId} onValueChange={(v) => setFilterBatimentId(v ?? "")}>
            <SelectTrigger className="w-32" aria-label="Filtrer par bâtiment">
              <SelectValue placeholder="Bâtiment">
                {(value: string | null) => {
                  if (!value) return "Bâtiment";
                  const b = filteredBatimentsForFilter.find((x) => String(x.id) === value);
                  return b ? b.nom : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {filteredBatimentsForFilter.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                    <FieldLabel htmlFor="create-salle-bat">Bâtiment</FieldLabel>
                    <Select name="batiment_id" required>
                      <SelectTrigger id="create-salle-bat" className="w-full">
                        <SelectValue placeholder="Choisir un bâtiment">
                          {(value: string | null) => {
                            if (!value) return "Choisir un bâtiment";
                            const b = batiments.find((x) => String(x.id) === value);
                            return b ? `${b.nom} — ${getSiteName(b.id)}` : value;
                          }}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {batiments.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.nom} — {getSiteName(b.id)}
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
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="size-4" data-icon="inline-start" />
                Supprimer
              </Button>
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
                  <Field>
                    <FieldLabel htmlFor="salle-bat">Bâtiment</FieldLabel>
                    <select
                      id="salle-bat"
                      name="salle-bat"
                      defaultValue={String(selected.batiment_id)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {batiments.map((b) => (
                        <option key={b.id} value={String(b.id)}>
                          {b.nom}
                        </option>
                      ))}
                    </select>
                  </Field>
                </FieldGroup>

                <Separator />

                <div className="flex flex-col gap-3">
                  <h3 className="font-heading text-sm font-medium text-primary">
                    Calculateurs liés
                  </h3>
                  <FieldGroup>
                    {allCalcs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun calculateur enregistré
                      </p>
                    ) : (
                      allCalcs.map((c) => {
                        const checked = c.salle_id === selected.id;
                        return (
                          <Field key={c.id} orientation="horizontal">
                            <Checkbox
                              id={`calc-${c.id}`}
                              name="calc"
                              value={String(c.id)}
                              defaultChecked={checked}
                            />
                            <FieldLabel
                              htmlFor={`calc-${c.id}`}
                              className="font-normal"
                            >
                              {c.nom} · {c.ip_adresse ?? "pas d'IP"}
                            </FieldLabel>
                          </Field>
                        );
                      })
                    )}
                  </FieldGroup>
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
    </div>
  );
}
