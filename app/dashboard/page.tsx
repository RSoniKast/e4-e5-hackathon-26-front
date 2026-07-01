"use client";

import * as React from "react";
import {
  MapPin,
  Building2,
  DoorClosed,
  ChevronRight,
  Search,
  Upload,
  Plus,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { SiteRead, BatimentRead, SalleRead } from "@/lib/types";
import {
  getSites,
  getBatiments,
  getSalles,
  createSite,
  updateSite,
  deleteSite,
  createBatiment,
  deleteBatiment,
  ApiError,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ScrollArea } from "@/components/ui/scroll-area";
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

type TreeNode =
  | { type: "site"; data: SiteRead }
  | { type: "batiment"; data: BatimentRead }
  | { type: "salle"; data: SalleRead };

function TreeRow({
  depth,
  icon: Icon,
  label,
  hasChildren,
  expanded,
  selected,
  muted,
  onClick,
}: {
  depth: number;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hasChildren?: boolean;
  expanded?: boolean;
  selected?: boolean;
  muted?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      className={cn(
        "flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm transition-colors",
        selected
          ? "bg-accent font-medium text-accent-foreground"
          : "hover:bg-muted",
        muted && !selected && "text-muted-foreground"
      )}
    >
      <ChevronRight
        className={cn(
          "size-4 shrink-0 text-muted-foreground transition-transform",
          !hasChildren && "invisible",
          expanded && "rotate-90"
        )}
      />
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function SitesBatimentsPage() {
  const [sites, setSites] = React.useState<SiteRead[]>([]);
  const [batimentsMap, setBatimentsMap] = React.useState<Record<number, BatimentRead[]>>({});
  const [sallesMap, setSallesMap] = React.useState<Record<number, SalleRead[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Create site dialog state
  const [createOpen, setCreateOpen] = React.useState(false);

  // Load sites
  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const sitesData = await getSites();
      setSites(sitesData);

      // Load batiments for all sites
      const batResults: Record<number, BatimentRead[]> = {};
      const salleResults: Record<number, SalleRead[]> = {};

      for (const site of sitesData) {
        const bats = await getBatiments(site.id);
        batResults[site.id] = bats;
        for (const bat of bats) {
          const salles = await getSalles(bat.id);
          salleResults[bat.id] = salles;
        }
      }

      setBatimentsMap(batResults);
      setSallesMap(salleResults);

      // Auto-select first site (only if nothing selected — preserve current selection on refresh)
      if (sitesData.length > 0) {
        setSelected((prev) => prev || `site-${sitesData[0].id}`);
      }
    } catch (err) {
      toast.error("Erreur lors du chargement des données");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  // Parse selected node
  const selectedParts = selected.split("-");
  const selectedType = selectedParts[0];
  const selectedId = parseInt(selectedParts[1], 10);

  const selectedSite =
    selectedType === "site"
      ? sites.find((s) => s.id === selectedId)
      : selectedType === "batiment"
        ? sites.find((s) =>
            (batimentsMap[s.id] ?? []).some((b) => b.id === selectedId)
          )
        : selectedType === "salle"
          ? sites.find((s) =>
              (batimentsMap[s.id] ?? []).some((b) =>
                (sallesMap[b.id] ?? []).some((sl) => sl.id === selectedId)
              )
            )
          : sites[0];

  const site = selectedSite ?? sites[0];
  const siteBatiments = site ? batimentsMap[site.id] ?? [] : [];

  // Filter sites by search
  const filteredSites = searchQuery
    ? sites.filter(
        (s) =>
          s.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.ville.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (s.code_postal ?? "").includes(searchQuery)
      )
    : sites;

  // Handle save site
  async function handleSaveSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!site) return;

    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updateSite(site.id, {
        nom: formData.get("site-nom") as string,
        ville: formData.get("site-ville") as string,
        code_postal: (formData.get("site-cp") as string) || null,
        adresse: (formData.get("site-adresse") as string) || null,
        latitude: formData.get("site-lat") ? parseFloat(formData.get("site-lat") as string) : null,
        longitude: formData.get("site-long") ? parseFloat(formData.get("site-long") as string) : null,
      });
      toast.success(`Site ${formData.get("site-nom")} mis à jour`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Handle create site
  async function handleCreateSite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createSite({
        nom: formData.get("nom") as string,
        ville: formData.get("ville") as string,
        code_postal: (formData.get("code_postal") as string) || undefined,
        adresse: (formData.get("adresse") as string) || undefined,
      });
      toast.success("Site créé avec succès");
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la création");
    }
  }

  // Handle delete site
  async function handleDeleteSite() {
    if (!site) return;
    try {
      await deleteSite(site.id);
      toast.success(`Site ${site.nom} supprimé`);
      setSelected("");
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
        <h1 className="font-heading text-lg font-semibold">Sites &amp; Bâtiments</h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-56">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher ville, code postal…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus data-icon="inline-start" />
              Site
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateSite}>
                <DialogHeader>
                  <DialogTitle>Nouveau site</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations du nouveau site.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup className="py-4">
                  <Field>
                    <FieldLabel htmlFor="create-nom">Nom</FieldLabel>
                    <Input id="create-nom" name="nom" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-ville">Ville</FieldLabel>
                    <Input id="create-ville" name="ville" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-cp">Code postal</FieldLabel>
                    <Input id="create-cp" name="code_postal" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-adresse">Adresse</FieldLabel>
                    <Input id="create-adresse" name="adresse" />
                  </Field>
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

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Arbre hiérarchique */}
        <Card className="overflow-hidden p-0">
          <ScrollArea className="h-full max-h-[calc(100svh-9rem)]">
            <div className="flex flex-col gap-0.5 p-2">
              {filteredSites.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Aucun site trouvé
                </p>
              ) : (
                filteredSites.map((s) => {
                  const siteKey = `site-${s.id}`;
                  const bats = batimentsMap[s.id] ?? [];
                  return (
                    <React.Fragment key={siteKey}>
                      <TreeRow
                        depth={0}
                        icon={MapPin}
                        label={`${s.nom} — ${s.ville}`}
                        hasChildren={bats.length > 0}
                        expanded={expanded.has(siteKey)}
                        selected={selected === siteKey}
                        onClick={() => {
                          setSelected(siteKey);
                          if (bats.length > 0) toggle(siteKey);
                        }}
                      />
                      {expanded.has(siteKey) &&
                        bats.map((b) => {
                          const batKey = `batiment-${b.id}`;
                          const salles = sallesMap[b.id] ?? [];
                          return (
                            <React.Fragment key={batKey}>
                              <TreeRow
                                depth={1}
                                icon={Building2}
                                label={b.nom}
                                hasChildren={salles.length > 0}
                                expanded={expanded.has(batKey)}
                                selected={selected === batKey}
                                onClick={() => {
                                  setSelected(batKey);
                                  if (salles.length > 0) toggle(batKey);
                                }}
                              />
                              {expanded.has(batKey) &&
                                salles.map((salle) => {
                                  const salleKey = `salle-${salle.id}`;
                                  return (
                                    <TreeRow
                                      key={salleKey}
                                      depth={2}
                                      icon={DoorClosed}
                                      label={salle.nom}
                                      selected={selected === salleKey}
                                      muted
                                      onClick={() => setSelected(salleKey)}
                                    />
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Détail du site */}
        {site ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-primary">Détail du site</CardTitle>
              <ConfirmDialog
                title="Supprimer ce site ?"
                description={
                  <>
                    Le site {site.nom} sera définitivement supprimé. Cette
                    action est irréversible.
                  </>
                }
                onConfirm={handleDeleteSite}
                trigger={
                  <Button variant="destructive" size="sm">
                    <Trash2 className="size-4" data-icon="inline-start" />
                    Supprimer
                  </Button>
                }
              />
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-6">
                <form
                  key={site.id}
                  onSubmit={handleSaveSite}
                  className="flex flex-col gap-6"
                >
                  <FieldGroup>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="site-nom">Nom</FieldLabel>
                        <Input id="site-nom" name="site-nom" defaultValue={site.nom} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="site-ville">Ville</FieldLabel>
                        <Input id="site-ville" name="site-ville" defaultValue={site.ville} />
                      </Field>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field>
                        <FieldLabel htmlFor="site-cp">Code postal</FieldLabel>
                        <Input id="site-cp" name="site-cp" defaultValue={site.code_postal ?? ""} />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="site-adresse">Adresse</FieldLabel>
                        <Input
                          id="site-adresse"
                          name="site-adresse"
                          defaultValue={site.adresse ?? ""}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field>
                          <FieldLabel htmlFor="site-lat">Latitude</FieldLabel>
                          <Input
                            id="site-lat"
                            name="site-lat"
                            type="number"
                            step="any"
                            defaultValue={site.latitude ?? ""}
                          />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="site-long">Longitude</FieldLabel>
                          <Input
                            id="site-long"
                            name="site-long"
                            type="number"
                            step="any"
                            defaultValue={site.longitude ?? ""}
                          />
                        </Field>
                      </div>
                    </div>
                  </FieldGroup>

                  <Button type="submit" disabled={saving} className="self-end">
                    {saving && <Loader2 className="size-4 animate-spin" data-icon="inline-start" />}
                    Enregistrer
                  </Button>
                </form>

                <Separator />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-heading text-sm font-medium text-primary">
                      Bâtiments ({siteBatiments.length})
                    </h3>
                    <AddBatimentForm siteId={site.id} onCreated={loadData} />
                  </div>
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead className="w-24">Salles</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {siteBatiments.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={3}
                              className="text-center text-muted-foreground"
                            >
                              Aucun bâtiment
                            </TableCell>
                          </TableRow>
                        ) : (
                          siteBatiments.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell className="font-medium">{b.nom}</TableCell>
                              <TableCell>{(sallesMap[b.id] ?? []).length}</TableCell>
                              <TableCell>
                                <ConfirmDialog
                                  title="Supprimer ce bâtiment ?"
                                  description={
                                    <>
                                      Le bâtiment {b.nom} sera définitivement
                                      supprimé. Cette action est irréversible.
                                    </>
                                  }
                                  onConfirm={async () => {
                                    try {
                                      await deleteBatiment(b.id);
                                      toast.success(`Bâtiment ${b.nom} supprimé`);
                                      await loadData();
                                    } catch (err) {
                                      toast.error(
                                        err instanceof ApiError
                                          ? err.detail
                                          : "Erreur lors de la suppression"
                                      );
                                    }
                                  }}
                                  trigger={
                                    <Button variant="ghost" size="sm">
                                      <Trash2 className="size-4 text-destructive" />
                                    </Button>
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-muted-foreground">Sélectionnez un site dans l&apos;arbre</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function AddBatimentForm({
  siteId,
  onCreated,
}: {
  siteId: number;
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [nom, setNom] = React.useState("");
  const [creating, setCreating] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setCreating(true);
    try {
      await createBatiment({ site_id: siteId, nom: nom.trim() });
      toast.success(`Bâtiment ${nom} créé`);
      setNom("");
      setOpen(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la création");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus data-icon="inline-start" />
        Ajouter un bâtiment
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nouveau bâtiment</DialogTitle>
            <DialogDescription>
              Renseignez le nom du nouveau bâtiment.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="new-bat-nom">Nom</FieldLabel>
              <Input
                id="new-bat-nom"
                value={nom}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNom(e.target.value)
                }
                placeholder="Nom du bâtiment"
                autoFocus
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Annuler
            </DialogClose>
            <Button type="submit" disabled={creating || !nom.trim()}>
              {creating && (
                <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              )}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
