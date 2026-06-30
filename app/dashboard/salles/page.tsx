"use client";

import * as React from "react";
import { Search, Plus } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
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

const CALCULATEURS = [
  { id: "CAL-001", ip: "192.168.1.21" },
  { id: "CAL-014", ip: "192.168.1.34" },
  { id: "CAL-022", ip: "192.168.1.58" },
];

const BATIMENTS = ["Bâtiment A", "Bâtiment B"];

type Salle = {
  id: string;
  nom: string;
  capacite: number;
  batiment: string;
  site: string;
  calc: string[];
};

const SALLES: Salle[] = [
  { id: "a101", nom: "A101", capacite: 30, batiment: "Bâtiment A", site: "Voltaire", calc: ["CAL-001", "CAL-014"] },
  { id: "a102", nom: "A102", capacite: 28, batiment: "Bâtiment A", site: "Voltaire", calc: ["CAL-001"] },
  { id: "b201", nom: "B201", capacite: 35, batiment: "Bâtiment B", site: "Voltaire", calc: [] },
  { id: "labo1", nom: "Labo 1", capacite: 24, batiment: "Bâtiment B", site: "Voltaire", calc: ["CAL-001", "CAL-014", "CAL-022"] },
];

export default function SallesPage() {
  const [selectedId, setSelectedId] = React.useState<string>("a101");
  const [links, setLinks] = React.useState<Record<string, string[]>>(() =>
    Object.fromEntries(SALLES.map((s) => [s.id, s.calc]))
  );

  const selected = SALLES.find((s) => s.id === selectedId) ?? SALLES[0];

  const toggleCalc = (calcId: string) =>
    setLinks((prev) => {
      const current = prev[selectedId] ?? [];
      const next = current.includes(calcId)
        ? current.filter((c) => c !== calcId)
        : [...current, calcId];
      return { ...prev, [selectedId]: next };
    });

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
            <InputGroupInput placeholder="Rechercher une salle…" />
          </InputGroup>
          <Select>
            <SelectTrigger className="w-28" aria-label="Filtrer par site">
              <SelectValue placeholder="Site" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="voltaire">Voltaire</SelectItem>
                <SelectItem value="curie">Curie</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="w-32" aria-label="Filtrer par bâtiment">
              <SelectValue placeholder="Bâtiment" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {BATIMENTS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button>
            <Plus data-icon="inline-start" />
            Salle
          </Button>
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
              {SALLES.map((s) => (
                <TableRow
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  data-state={s.id === selectedId ? "selected" : undefined}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">{s.nom}</TableCell>
                  <TableCell>{s.capacite}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.batiment.replace("Bâtiment", "Bât.")} · {s.site}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {(links[s.id] ?? []).length}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Détail */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Salle {selected.nom}</CardTitle>
          </CardHeader>
          <CardContent
            key={selectedId}
            className="flex flex-1 flex-col gap-6"
          >
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="salle-nom">Nom</FieldLabel>
                  <Input id="salle-nom" defaultValue={selected.nom} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="salle-cap">Capacité</FieldLabel>
                  <Input
                    id="salle-cap"
                    type="number"
                    defaultValue={selected.capacite}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="salle-bat">Bâtiment</FieldLabel>
                <Select defaultValue={selected.batiment}>
                  <SelectTrigger id="salle-bat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {BATIMENTS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>

            <Separator />

            <div className="flex flex-col gap-3">
              <h3 className="font-heading text-sm font-medium text-primary">
                Calculateurs liés
              </h3>
              <FieldGroup>
                {CALCULATEURS.map((c) => {
                  const checked = (links[selectedId] ?? []).includes(c.id);
                  return (
                    <Field key={c.id} orientation="horizontal">
                      <Checkbox
                        id={`calc-${c.id}`}
                        checked={checked}
                        onCheckedChange={() => toggleCalc(c.id)}
                      />
                      <FieldLabel
                        htmlFor={`calc-${c.id}`}
                        className="font-normal"
                      >
                        {c.id} · {c.ip}
                      </FieldLabel>
                    </Field>
                  );
                })}
              </FieldGroup>
            </div>

            <Button
              className="mt-auto w-full"
              onClick={() => toast.success(`Salle ${selected.nom} enregistrée`)}
            >
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
