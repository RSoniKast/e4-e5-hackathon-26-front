"use client";

import * as React from "react";
import {
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Search,
  Loader2,
  Server,
  Clock,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type {
  EtatCalculateurRead,
  CalculateurRead,
  SalleRead,
} from "@/lib/types";
import {
  getEtatCalculateurs,
  getCalculateurs,
  getSalles,
  ApiError,
} from "@/lib/api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

/** Merged row combining etat + CRUD calculateur + salle name */
type CalcRow = {
  calculateur_id: number;
  nom: string;
  en_ligne: boolean | null;
  change_at: string | null;
  ip_adresse: string | null;
  mac_adresse: string | null;
  salle_nom: string | null;
};

export default function MonitoringPage() {
  const [rows, setRows] = React.useState<CalcRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterStatus, setFilterStatus] = React.useState<
    "all" | "online" | "offline"
  >("all");

  const loadData = React.useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);

      const [etats, calcs, salles] = await Promise.all([
        getEtatCalculateurs(),
        getCalculateurs(),
        getSalles(),
      ]);

      // Build lookup maps
      const calcMap = new Map<number, CalculateurRead>();
      calcs.forEach((c) => calcMap.set(c.id, c));

      const salleMap = new Map<number, SalleRead>();
      salles.forEach((s) => salleMap.set(s.id, s));

      // Merge: start from etats, enrich with CRUD data
      const merged: CalcRow[] = etats.map((e) => {
        const crud = calcMap.get(e.calculateur_id);
        const salle =
          crud?.salle_id != null ? salleMap.get(crud.salle_id) : undefined;
        return {
          calculateur_id: e.calculateur_id,
          nom: e.nom,
          en_ligne: e.en_ligne,
          change_at: e.change_at,
          ip_adresse: crud?.ip_adresse ?? null,
          mac_adresse: crud?.mac_adresse ?? null,
          salle_nom: salle?.nom ?? null,
        };
      });

      setRows(merged);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.detail
          : "Erreur lors du chargement des calculateurs"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30s
  React.useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter rows
  const filtered = rows.filter((c) => {
    const q = searchQuery.toLowerCase();
    if (
      q &&
      !c.nom.toLowerCase().includes(q) &&
      !(c.ip_adresse ?? "").toLowerCase().includes(q) &&
      !(c.mac_adresse ?? "").toLowerCase().includes(q) &&
      !(c.salle_nom ?? "").toLowerCase().includes(q)
    )
      return false;
    if (filterStatus === "online" && c.en_ligne !== true) return false;
    if (filterStatus === "offline" && c.en_ligne !== false) return false;
    return true;
  });

  const totalCount = rows.length;
  const onlineCount = rows.filter((c) => c.en_ligne === true).length;
  const offlineCount = rows.filter((c) => c.en_ligne === false).length;
  const unknownCount = rows.filter((c) => c.en_ligne == null).length;

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
        <h1 className="font-heading text-lg font-semibold">
          Monitoring centrales
        </h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-56">
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("size-4", refreshing && "animate-spin")}
              data-icon="inline-start"
            />
            Actualiser
          </Button>
        </div>
      </header>

      <div className="flex flex-col gap-4 p-4">
        {/* Stat cards — clickable filters */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Card
            className={cn(
              "cursor-pointer transition-shadow hover:shadow-md",
              filterStatus === "all" && "ring-2 ring-primary"
            )}
            onClick={() => setFilterStatus("all")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
              <Server className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">calculateurs</p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-shadow hover:shadow-md",
              filterStatus === "online" && "ring-2 ring-primary"
            )}
            onClick={() => setFilterStatus("online")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En ligne
              </CardTitle>
              <Wifi className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {onlineCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0
                  ? `${Math.round((onlineCount / totalCount) * 100)}%`
                  : "0%"}{" "}
                du total
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "cursor-pointer transition-shadow hover:shadow-md",
              filterStatus === "offline" && "ring-2 ring-primary"
            )}
            onClick={() => setFilterStatus("offline")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Hors ligne
              </CardTitle>
              <WifiOff className="size-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                {offlineCount}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalCount > 0
                  ? `${Math.round((offlineCount / totalCount) * 100)}%`
                  : "0%"}{" "}
                du total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Inconnu
              </CardTitle>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-muted-foreground">
                {unknownCount}
              </div>
              <p className="text-xs text-muted-foreground">pas de signal</p>
            </CardContent>
          </Card>
        </div>

        {/* Table with all columns */}
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Etat</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse IP</TableHead>
                <TableHead>Adresse MAC</TableHead>
                <TableHead>Salle</TableHead>
                <TableHead>Dernier ping</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground"
                  >
                    Aucun calculateur trouvé
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.calculateur_id}>
                    {/* Etat */}
                    <TableCell>
                      {c.en_ligne === true ? (
                        <Badge className="bg-primary text-primary-foreground">
                          <Wifi className="mr-1 size-3" />
                          En ligne
                        </Badge>
                      ) : c.en_ligne === false ? (
                        <Badge variant="destructive">
                          <WifiOff className="mr-1 size-3" />
                          Hors ligne
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Activity className="mr-1 size-3" />
                          Inconnu
                        </Badge>
                      )}
                    </TableCell>
                    {/* Nom */}
                    <TableCell className="font-medium">{c.nom}</TableCell>
                    {/* IP */}
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {c.ip_adresse ?? "—"}
                    </TableCell>
                    {/* MAC */}
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {c.mac_adresse ?? "—"}
                    </TableCell>
                    {/* Salle */}
                    <TableCell>
                      {c.salle_nom ? (
                        <Badge variant="secondary">{c.salle_nom}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {/* Dernier ping */}
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="size-3.5" />
                        {formatDate(c.change_at)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
