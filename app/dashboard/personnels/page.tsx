"use client";

import * as React from "react";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { PersonnelRead, HoraireRead } from "@/lib/types";
import {
  getPersonnels,
  getHoraires,
  createHoraire,
  createPersonnel,
  updatePersonnel,
  deletePersonnel,
  ApiError,
} from "@/lib/api";
import { Planning } from "@/components/planning/planning";
import { horairesToEvents, type HoraireDraft } from "@/lib/planning";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
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

export default function PersonnelsPage() {
  const [personnels, setPersonnels] = React.useState<PersonnelRead[]>([]);
  const [horairesMap, setHorairesMap] = React.useState<Record<number, HoraireRead[]>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [selectedId, setSelectedId] = React.useState<number | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [createOpen, setCreateOpen] = React.useState(false);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPersonnels();
      setPersonnels(data);

      // Load horaires for all personnels
      const horaires: Record<number, HoraireRead[]> = {};
      for (const p of data) {
        try {
          horaires[p.id] = await getHoraires(p.id);
        } catch {
          horaires[p.id] = [];
        }
      }
      setHorairesMap(horaires);

      if (data.length > 0) {
        setSelectedId((prev) => prev ?? data[0].id);
      }
    } catch {
      toast.error("Erreur lors du chargement des personnels");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const p = personnels.find((x) => x.id === selectedId) ?? personnels[0];
  const horaires = p ? horairesMap[p.id] ?? [] : [];
  const planningEvents = React.useMemo(
    () =>
      horairesToEvents(horaires, {
        title: "Présence",
        colorIndex: 0,
        keyPrefix: p ? `p${p.id}` : "p",
      }),
    [horaires, p]
  );

  // Filter
  const filteredPersonnels = searchQuery
    ? personnels.filter(
        (person) =>
          person.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
          person.identifiant.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : personnels;

  // Handle save
  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!p) return;
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      await updatePersonnel(p.id, {
        nom: formData.get("p-nom") as string,
        prenom: formData.get("p-prenom") as string,
        email: (formData.get("p-email") as string) || null,
        identifiant: formData.get("p-id") as string,
      });
      toast.success(`Fiche de ${formData.get("p-prenom")} ${formData.get("p-nom")} enregistrée`);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  // Handle create
  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createPersonnel({
        identifiant: formData.get("identifiant") as string,
        nom: formData.get("nom") as string,
        prenom: formData.get("prenom") as string,
        email: (formData.get("email") as string) || undefined,
      });
      toast.success("Personnel créé avec succès");
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la création");
    }
  }

  // Handle delete
  async function handleDelete() {
    if (!p) return;
    try {
      await deletePersonnel(p.id);
      toast.success(`${p.prenom} ${p.nom} supprimé`);
      setSelectedId(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.detail : "Erreur lors de la suppression");
    }
  }

  // Ajout d'un créneau depuis le planning → POST /api/personnels/{pid}/horaires
  async function handleCreateHoraire(draft: HoraireDraft) {
    if (!p) return;
    try {
      await createHoraire(p.id, draft);
      const fresh = await getHoraires(p.id);
      setHorairesMap((prev) => ({ ...prev, [p.id]: fresh }));
      toast.success("Créneau ajouté");
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
        <h1 className="font-heading text-lg font-semibold">Personnels</h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-56">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Nom, identifiant…"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
          </InputGroup>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button />}>
              <Plus data-icon="inline-start" />
              Personnel
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Nouveau personnel</DialogTitle>
                  <DialogDescription>
                    Renseignez les informations du nouveau membre du personnel.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup className="py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="create-nom">Nom</FieldLabel>
                      <Input id="create-nom" name="nom" required />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="create-prenom">Prénom</FieldLabel>
                      <Input id="create-prenom" name="prenom" required />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="create-identifiant">Identifiant</FieldLabel>
                    <Input id="create-identifiant" name="identifiant" required />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="create-email">Email</FieldLabel>
                    <Input id="create-email" name="email" type="email" />
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

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Liste */}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Identifiant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPersonnels.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Aucun personnel trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filteredPersonnels.map((person) => (
                  <TableRow
                    key={person.id}
                    onClick={() => setSelectedId(person.id)}
                    data-state={person.id === selectedId ? "selected" : undefined}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-medium">
                      {person.prenom} {person.nom}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {person.identifiant}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Fiche */}
        {p ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                Fiche —{" "}
                <span className="text-primary">
                  {p.prenom} {p.nom}
                </span>
              </CardTitle>
              <ConfirmDialog
                title="Supprimer ce personnel ?"
                description={
                  <>
                    {p.prenom} {p.nom} sera définitivement supprimé. Cette action
                    est irréversible.
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
              <Tabs key={selectedId} defaultValue="info" className="gap-6">
                <TabsList variant="line" className="w-full justify-start">
                  <TabsTrigger value="info">Informations</TabsTrigger>
                  <TabsTrigger value="planning">Planning</TabsTrigger>
                </TabsList>

                <TabsContent value="info">
                  <form onSubmit={handleSave}>
                    <FieldGroup>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Field>
                          <FieldLabel htmlFor="p-nom">Nom</FieldLabel>
                          <Input id="p-nom" name="p-nom" defaultValue={p.nom} />
                        </Field>
                        <Field>
                          <FieldLabel htmlFor="p-prenom">Prénom</FieldLabel>
                          <Input id="p-prenom" name="p-prenom" defaultValue={p.prenom} />
                        </Field>
                      </div>
                      <Field>
                        <FieldLabel htmlFor="p-email">Email</FieldLabel>
                        <Input
                          id="p-email"
                          name="p-email"
                          type="email"
                          defaultValue={p.email ?? ""}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="p-id">Identifiant</FieldLabel>
                        <Input id="p-id" name="p-id" defaultValue={p.identifiant} />
                      </Field>
                    </FieldGroup>
                    <div className="mt-6 flex justify-end">
                      <Button type="submit" disabled={saving}>
                        {saving && (
                          <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
                        )}
                        Enregistrer
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="planning">
                  <Planning
                    events={planningEvents}
                    onCreateHoraire={handleCreateHoraire}
                    emptyLabel="Aucun horaire défini pour ce personnel."
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center">
            <p className="text-muted-foreground">Sélectionnez un personnel</p>
          </Card>
        )}
      </div>
    </div>
  );
}
