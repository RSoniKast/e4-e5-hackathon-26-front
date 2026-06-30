"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const ROLES = ["Professeure", "Surveillant", "Administration"];

type Horaire = { jour: string; creneau: string; salle: string };
type Personnel = {
  id: string;
  nom: string;
  prenom: string;
  role: string;
  email: string;
  identifiant: string;
  salles: { nom: string; bat: string }[];
  horaires: Horaire[];
  classes: string[];
};

const PERSONNELS: Personnel[] = [
  {
    id: "lefevre",
    nom: "Lefèvre",
    prenom: "Marie",
    role: "Professeure",
    email: "m.lefevre@ecole.fr",
    identifiant: "mlefevre",
    salles: [
      { nom: "A101", bat: "Bât. A" },
      { nom: "A102", bat: "Bât. A" },
    ],
    horaires: [
      { jour: "Lundi", creneau: "08:00 – 10:00", salle: "A101" },
      { jour: "Mardi", creneau: "10:00 – 12:00", salle: "A102" },
    ],
    classes: ["6e A", "5e B"],
  },
  {
    id: "girard",
    nom: "Girard",
    prenom: "Paul",
    role: "Surveillant",
    email: "p.girard@ecole.fr",
    identifiant: "pgirard",
    salles: [],
    horaires: [{ jour: "Lundi", creneau: "08:00 – 18:00", salle: "—" }],
    classes: [],
  },
  {
    id: "bernard",
    nom: "Bernard",
    prenom: "Sophie",
    role: "Professeure",
    email: "s.bernard@ecole.fr",
    identifiant: "sbernard",
    salles: [{ nom: "B201", bat: "Bât. B" }],
    horaires: [{ jour: "Jeudi", creneau: "14:00 – 16:00", salle: "B201" }],
    classes: ["4e C"],
  },
  {
    id: "haddad",
    nom: "Haddad",
    prenom: "Karim",
    role: "Administration",
    email: "k.haddad@ecole.fr",
    identifiant: "khaddad",
    salles: [],
    horaires: [],
    classes: [],
  },
];

export default function PersonnelsPage() {
  const [selectedId, setSelectedId] = React.useState<string>("lefevre");
  const p = PERSONNELS.find((x) => x.id === selectedId) ?? PERSONNELS[0];

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
            <InputGroupInput placeholder="Nom, identifiant…" />
          </InputGroup>
          <Button>
            <Plus data-icon="inline-start" />
            Personnel
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Liste */}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PERSONNELS.map((person) => (
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
                    {person.role}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Fiche */}
        <Card>
          <CardHeader>
            <CardTitle>
              Fiche —{" "}
              <span className="text-primary">
                {p.prenom} {p.nom}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs key={selectedId} defaultValue="info" className="gap-6">
              <TabsList variant="line" className="w-full justify-start">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="salles">Salles</TabsTrigger>
                <TabsTrigger value="horaires">Horaires</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <FieldGroup>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="p-nom">Nom</FieldLabel>
                      <Input id="p-nom" defaultValue={p.nom} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="p-prenom">Prénom</FieldLabel>
                      <Input id="p-prenom" defaultValue={p.prenom} />
                    </Field>
                  </div>
                  <Field>
                    <FieldLabel htmlFor="p-email">Email</FieldLabel>
                    <Input id="p-email" type="email" defaultValue={p.email} />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="p-id">Identifiant</FieldLabel>
                      <Input id="p-id" defaultValue={p.identifiant} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="p-role">Rôle</FieldLabel>
                      <Select defaultValue={p.role}>
                        <SelectTrigger id="p-role" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {ROLES.map((r) => (
                              <SelectItem key={r} value={r}>
                                {r}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                </FieldGroup>
              </TabsContent>

              <TabsContent value="salles">
                {p.salles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune salle rattachée.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {p.salles.map((s) => (
                      <Badge key={s.nom} variant="secondary">
                        {s.nom} · {s.bat}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="horaires">
                {p.horaires.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun horaire défini.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Jour</TableHead>
                          <TableHead>Créneau</TableHead>
                          <TableHead>Salle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {p.horaires.map((h, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">
                              {h.jour}
                            </TableCell>
                            <TableCell>{h.creneau}</TableCell>
                            <TableCell>{h.salle}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="classes">
                {p.classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune classe rattachée.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {p.classes.map((c) => (
                      <Badge key={c} variant="secondary">
                        {c}
                      </Badge>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={() =>
                  toast.success(`Fiche de ${p.prenom} ${p.nom} enregistrée`)
                }
              >
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
