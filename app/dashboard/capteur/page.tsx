"use client";

import * as React from "react";
import {
  Radio,
  RadioTower,
  Thermometer,
  Sun,
  DoorOpen,
  DoorClosed,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Wind,
  Link2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const DEFAULT_URL = "http://192.168.2.101:81";

const REFRESH_OPTIONS = [
  { value: "0", label: "Manuel" },
  { value: "2000", label: "Toutes les 2s" },
  { value: "5000", label: "Toutes les 5s" },
  { value: "10000", label: "Toutes les 10s" },
];

/** Données brutes renvoyées par le capteur (partie opérative). */
interface CapteurRaw {
  id: number;
  t: number;
  l: number;
  p: number;
  f: number;
  o: number;
}

/** Mesure normalisée, alignée sur les champs du backend (ReleveRead). */
interface CapteurMesure {
  calculateur_id: number;
  temperature: number;
  luminosite: number;
  presence: boolean;
  fenetre_ouverte: boolean;
  porte_ouverte: boolean;
}

function mapCapteur(raw: CapteurRaw): CapteurMesure {
  return {
    calculateur_id: raw.id,
    temperature: raw.t,
    luminosite: raw.l,
    presence: raw.p === 1,
    fenetre_ouverte: raw.f === 1,
    porte_ouverte: raw.o === 1,
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function CapteurPage() {
  const [url, setUrl] = React.useState(DEFAULT_URL);
  const [data, setData] = React.useState<CapteurMesure | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastFetch, setLastFetch] = React.useState<string | null>(null);
  const [refreshMs, setRefreshMs] = React.useState("0");

  const fetchData = React.useCallback(
    async (silent = false) => {
      const target = url.trim();
      if (!target) {
        toast.error("Entrez une URL de capteur");
        return;
      }
      try {
        if (!silent) setLoading(true);
        const res = await fetch(target, { cache: "no-store" });
        if (!res.ok) throw new Error(`Réponse HTTP ${res.status}`);
        const raw: CapteurRaw = await res.json();
        setData(mapCapteur(raw));
        setLastFetch(new Date().toISOString());
        setError(null);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Impossible de contacter le capteur";
        setError(msg);
        if (!silent) toast.error(`Erreur de lecture : ${msg}`);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [url]
  );

  // Auto-refresh (uniquement si un intervalle est sélectionné)
  React.useEffect(() => {
    const ms = parseInt(refreshMs, 10);
    if (!ms) return;
    const interval = setInterval(() => fetchData(true), ms);
    return () => clearInterval(interval);
  }, [refreshMs, fetchData]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <SidebarTrigger />
        <h1 className="font-heading text-lg font-semibold">
          Capteur
        </h1>
        <form
          className="ms-auto flex flex-wrap items-center gap-2"
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            fetchData();
          }}
        >
          <InputGroup className="w-72">
            <InputGroupAddon>
              <Link2 />
            </InputGroupAddon>
            <InputGroupInput
              placeholder={DEFAULT_URL}
              value={url}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setUrl(e.target.value)
              }
              aria-label="URL du capteur"
            />
          </InputGroup>
          <Button type="submit" variant="outline" size="sm" disabled={loading}>
            <RefreshCw
              className={cn("size-4", loading && "animate-spin")}
              data-icon="inline-start"
            />
            Lire
          </Button>
          <Select value={refreshMs} onValueChange={(v) => setRefreshMs(v ?? "0")}>
            <SelectTrigger className="w-40" aria-label="Fréquence de lecture">
              <SelectValue placeholder="Manuel">
                {(value: string | null) => {
                  const opt = REFRESH_OPTIONS.find((o) => o.value === value);
                  return opt ? opt.label : "Manuel";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {REFRESH_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </form>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
        {/* Bandeau capteur */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <RadioTower className="size-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-primary">
                  {data ? `Calculateur #${data.calculateur_id}` : "Capteur"}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{url}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {parseInt(refreshMs, 10) > 0 && (
                <Badge variant="secondary" className="gap-1.5">
                  <span className="inline-block size-2 animate-pulse rounded-full bg-primary" />
                  Auto {parseInt(refreshMs, 10) / 1000}s
                </Badge>
              )}
              <Badge
                variant={error ? "destructive" : data ? "default" : "secondary"}
                className={cn(
                  "gap-1",
                  !error && data && "bg-primary text-primary-foreground"
                )}
              >
                {error ? (
                  <>
                    <AlertTriangle className="size-3" />
                    Hors ligne
                  </>
                ) : data ? (
                  <>
                    <Radio className="size-3" />
                    En ligne
                  </>
                ) : (
                  "En attente"
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Dernière lecture :{" "}
              <span className="font-medium text-foreground">
                {formatDate(lastFetch)}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Cartes capteurs */}
        {data ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
            {/* Temperature */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Temperature
                </CardTitle>
                <Thermometer className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.temperature}°C</div>
                <p className="text-xs text-muted-foreground">
                  {data.temperature > 25
                    ? "Au-dessus de la normale"
                    : data.temperature < 18
                      ? "En dessous de la normale"
                      : "Normal"}
                </p>
              </CardContent>
            </Card>

            {/* Luminosite */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Luminosite
                </CardTitle>
                <Sun className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.luminosite}</div>
                <p className="text-xs text-muted-foreground">lux</p>
              </CardContent>
            </Card>

            {/* Presence */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Presence
                </CardTitle>
                {data.presence ? (
                  <UserCheck className="size-4 text-primary" />
                ) : (
                  <UserX className="size-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.presence ? "Oui" : "Non"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.presence ? "Salle occupee" : "Salle vide"}
                </p>
              </CardContent>
            </Card>

            {/* Fenetre */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Fenetre
                </CardTitle>
                <Wind className="size-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.fenetre_ouverte ? "Ouverte" : "Fermee"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.fenetre_ouverte
                    ? "Ventilation active"
                    : "Ventilation fermee"}
                </p>
              </CardContent>
            </Card>

            {/* Porte */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Porte
                </CardTitle>
                {data.porte_ouverte ? (
                  <DoorOpen className="size-4 text-primary" />
                ) : (
                  <DoorClosed className="size-4 text-muted-foreground" />
                )}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {data.porte_ouverte ? "Ouverte" : "Fermee"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.porte_ouverte ? "Acces ouvert" : "Acces ferme"}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : error ? (
          <Card className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertTriangle className="size-10 text-destructive/60" />
              <p className="font-medium">Lecture impossible</p>
              <p className="max-w-md text-sm text-muted-foreground">{error}</p>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <RadioTower className="size-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Entrez l&apos;URL du capteur puis cliquez sur « Lire »
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
