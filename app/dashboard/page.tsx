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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

type Salle = { id: string; name: string };
type Batiment = {
  id: string;
  name: string;
  rooms: number;
  floors: number;
  salles: Salle[];
};
type Site = {
  id: string;
  name: string;
  city: string;
  postal: string;
  address: string;
  latlong: string;
  batiments: Batiment[];
};

const SITES: Site[] = [
  {
    id: "voltaire",
    name: "Lycée Voltaire",
    city: "Paris",
    postal: "75011",
    address: "12 rue de la République",
    latlong: "48.8 / 2.3",
    batiments: [
      {
        id: "a",
        name: "Bâtiment A",
        rooms: 8,
        floors: 3,
        salles: [
          { id: "a101", name: "Salle A101" },
          { id: "a102", name: "Salle A102" },
        ],
      },
      { id: "b", name: "Bâtiment B", rooms: 5, floors: 2, salles: [] },
    ],
  },
  {
    id: "curie",
    name: "Collège Curie",
    city: "Lyon",
    postal: "69001",
    address: "5 place Bellecour",
    latlong: "45.7 / 4.8",
    batiments: [
      { id: "c", name: "Bâtiment C", rooms: 6, floors: 2, salles: [] },
    ],
  },
  {
    id: "moulin",
    name: "Site Jean Moulin",
    city: "Lille",
    postal: "59000",
    address: "8 boulevard de la Liberté",
    latlong: "50.6 / 3.0",
    batiments: [],
  },
];

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
  const [expanded, setExpanded] = React.useState<Set<string>>(
    new Set(["voltaire", "voltaire/a"])
  );
  const [selected, setSelected] = React.useState<string>("voltaire/a/a101");

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

  const selectedSiteId = selected.split("/")[0];
  const site = SITES.find((s) => s.id === selectedSiteId) ?? SITES[0];

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
            <InputGroupInput placeholder="Rechercher ville, code postal…" />
          </InputGroup>
          <Button variant="outline">
            <Upload data-icon="inline-start" />
            Import .cro
          </Button>
          <Button>
            <Plus data-icon="inline-start" />
            Site
          </Button>
        </div>
      </header>

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(280px,360px)_1fr]">
        {/* Arbre hiérarchique */}
        <Card className="overflow-hidden p-0">
          <ScrollArea className="h-full max-h-[calc(100svh-9rem)]">
            <div className="flex flex-col gap-0.5 p-2">
              {SITES.map((s) => (
                <React.Fragment key={s.id}>
                  <TreeRow
                    depth={0}
                    icon={MapPin}
                    label={`${s.name} — ${s.city}`}
                    hasChildren={s.batiments.length > 0}
                    expanded={expanded.has(s.id)}
                    selected={selected === s.id}
                    onClick={() => {
                      setSelected(s.id);
                      if (s.batiments.length > 0) toggle(s.id);
                    }}
                  />
                  {expanded.has(s.id) &&
                    s.batiments.map((b) => {
                      const bId = `${s.id}/${b.id}`;
                      return (
                        <React.Fragment key={bId}>
                          <TreeRow
                            depth={1}
                            icon={Building2}
                            label={b.name}
                            hasChildren={b.salles.length > 0}
                            expanded={expanded.has(bId)}
                            selected={selected === bId}
                            onClick={() => {
                              setSelected(bId);
                              if (b.salles.length > 0) toggle(bId);
                            }}
                          />
                          {expanded.has(bId) &&
                            b.salles.map((salle) => {
                              const sId = `${bId}/${salle.id}`;
                              return (
                                <TreeRow
                                  key={sId}
                                  depth={2}
                                  icon={DoorClosed}
                                  label={salle.name}
                                  selected={selected === sId}
                                  muted
                                  onClick={() => setSelected(sId)}
                                />
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Détail du site */}
        <Card>
          <CardHeader>
            <CardTitle className="text-primary">Détail du site</CardTitle>
          </CardHeader>
          <CardContent key={site.id} className="flex flex-col gap-6">
            <FieldGroup>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="site-nom">Nom</FieldLabel>
                  <Input id="site-nom" defaultValue={site.name} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-ville">Ville</FieldLabel>
                  <Input id="site-ville" defaultValue={site.city} />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Field>
                  <FieldLabel htmlFor="site-cp">Code postal</FieldLabel>
                  <Input id="site-cp" defaultValue={site.postal} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-adresse">Adresse</FieldLabel>
                  <Input id="site-adresse" defaultValue={site.address} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="site-latlong">Lat / Long</FieldLabel>
                  <Input id="site-latlong" defaultValue={site.latlong} />
                </Field>
              </div>
            </FieldGroup>

            <Separator />

            <div className="flex flex-col gap-3">
              <h3 className="font-heading text-sm font-medium text-primary">
                Bâtiments ({site.batiments.length})
              </h3>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead className="w-24">Salles</TableHead>
                      <TableHead className="w-24">Étages</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {site.batiments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={3}
                          className="text-center text-muted-foreground"
                        >
                          Aucun bâtiment
                        </TableCell>
                      </TableRow>
                    ) : (
                      site.batiments.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">{b.name}</TableCell>
                          <TableCell>{b.rooms}</TableCell>
                          <TableCell>{b.floors}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
