"use client";

import * as React from "react";
import {
  Eye,
  Thermometer,
  Sun,
  DoorOpen,
  DoorClosed,
  Search,
  Loader2,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  UserX,
  Wind,
  FilterX,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { SalleRead, MesuresSalle, BatimentRead, SiteRead } from "@/lib/types";
import {
  getSalles,
  getBatiments,
  getSites,
  getMesuresSalle,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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

export default function VisualisationPage() {
  const [salles, setSalles] = React.useState<SalleRead[]>([]);
  const [batiments, setBatiments] = React.useState<BatimentRead[]>([]);
  const [sites, setSites] = React.useState<SiteRead[]>([]);
  const [mesuresMap, setMesuresMap] = React.useState<
    Record<number, MesuresSalle>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedSalleId, setSelectedSalleId] = React.useState<number | null>(
    null
  );
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterSiteId, setFilterSiteId] = React.useState<string>("");
  const [filterBatimentId, setFilterBatimentId] = React.useState<string>("");
  const [filterPresence, setFilterPresence] = React.useState<string>("");
  const [filterFenetre, setFilterFenetre] = React.useState<string>("");
  const [filterPorte, setFilterPorte] = React.useState<string>("");

  const loadData = React.useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        const [sallesData, batimentsData, sitesData] = await Promise.all([
          getSalles(),
          getBatiments(),
          getSites(),
        ]);
        setSalles(sallesData);
        setBatiments(batimentsData);
        setSites(sitesData);

        // Load mesures for all salles
        const mesures: Record<number, MesuresSalle> = {};
        const results = await Promise.allSettled(
          sallesData.map((s) => getMesuresSalle(s.id))
        );
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            mesures[sallesData[index].id] = result.value;
          }
        });
        setMesuresMap(mesures);

        if (sallesData.length > 0 && selectedSalleId === null) {
          setSelectedSalleId(sallesData[0].id);
        }
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.detail
            : "Erreur lors du chargement des salles"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 30s
  React.useEffect(() => {
    const interval = setInterval(() => loadData(true), 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const getBatimentName = (batimentId: number) =>
    batiments.find((b) => b.id === batimentId)?.nom ?? "—";

  const getSiteName = (batimentId: number) => {
    const bat = batiments.find((b) => b.id === batimentId);
    if (!bat) return "—";
    return sites.find((s) => s.id === bat.site_id)?.nom ?? "—";
  };

  const batimentOptions = filterSiteId
    ? batiments.filter((b) => b.site_id === parseInt(filterSiteId))
    : batiments;

  const hasActiveFilters =
    !!searchQuery ||
    !!filterSiteId ||
    !!filterBatimentId ||
    !!filterPresence ||
    !!filterFenetre ||
    !!filterPorte;

  const resetFilters = () => {
    setSearchQuery("");
    setFilterSiteId("");
    setFilterBatimentId("");
    setFilterPresence("");
    setFilterFenetre("");
    setFilterPorte("");
  };

  const filteredSalles = salles.filter((s) => {
    if (searchQuery && !s.nom.toLowerCase().includes(searchQuery.toLowerCase()))
      return false;
    if (filterSiteId) {
      const bat = batiments.find((b) => b.id === s.batiment_id);
      if (!bat || bat.site_id !== parseInt(filterSiteId)) return false;
    }
    if (filterBatimentId && s.batiment_id !== parseInt(filterBatimentId))
      return false;
    const m = mesuresMap[s.id]?.derniere_mesure;
    if (filterPresence) {
      if (!m || m.presence !== (filterPresence === "1")) return false;
    }
    if (filterFenetre) {
      if (!m || m.fenetre_ouverte !== (filterFenetre === "1")) return false;
    }
    if (filterPorte) {
      if (!m || m.porte_ouverte !== (filterPorte === "1")) return false;
    }
    return true;
  });

  const selectedMesures = selectedSalleId
    ? mesuresMap[selectedSalleId]
    : null;
  const selectedSalle = salles.find((s) => s.id === selectedSalleId);

  function formatDate(dateStr: string | null | undefined) {
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
          Visualisation salles
        </h1>
        <div className="ms-auto flex flex-wrap items-center gap-2">
          <InputGroup className="w-52">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Rechercher une salle..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
            />
          </InputGroup>
          <Select
            value={filterSiteId}
            onValueChange={(v) => {
              setFilterSiteId(v ?? "");
              setFilterBatimentId("");
            }}
          >
            <SelectTrigger className="w-36" aria-label="Filtrer par site">
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
          <Select
            value={filterBatimentId}
            onValueChange={(v) => setFilterBatimentId(v ?? "")}
          >
            <SelectTrigger className="w-36" aria-label="Filtrer par bâtiment">
              <SelectValue placeholder="Bâtiment">
                {(value: string | null) => {
                  if (!value) return "Bâtiment";
                  const b = batiments.find((x) => String(x.id) === value);
                  return b ? b.nom : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {batimentOptions.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.nom}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={filterPresence}
            onValueChange={(v) => setFilterPresence(v ?? "")}
          >
            <SelectTrigger className="w-32" aria-label="Filtrer par présence">
              <SelectValue placeholder="Présence">
                {(value: string | null) =>
                  value ? (value === "1" ? "Occupée" : "Vide") : "Présence"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">Occupée</SelectItem>
                <SelectItem value="0">Vide</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={filterFenetre}
            onValueChange={(v) => setFilterFenetre(v ?? "")}
          >
            <SelectTrigger className="w-32" aria-label="Filtrer par fenêtre">
              <SelectValue placeholder="Fenêtre">
                {(value: string | null) =>
                  value ? (value === "1" ? "Ouverte" : "Fermée") : "Fenêtre"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">Ouverte</SelectItem>
                <SelectItem value="0">Fermée</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            value={filterPorte}
            onValueChange={(v) => setFilterPorte(v ?? "")}
          >
            <SelectTrigger className="w-32" aria-label="Filtrer par porte">
              <SelectValue placeholder="Porte">
                {(value: string | null) =>
                  value ? (value === "1" ? "Ouverte" : "Fermée") : "Porte"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="1">Ouverte</SelectItem>
                <SelectItem value="0">Fermée</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              aria-label="Réinitialiser les filtres"
            >
              <FilterX className="size-4" data-icon="inline-start" />
              Réinitialiser
            </Button>
          )}
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

      <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[minmax(260px,340px)_1fr]">
        {/* Salle list */}
        <Card className="overflow-hidden p-0">
          <ScrollArea className="h-full max-h-[calc(100svh-9rem)]">
            <div className="flex flex-col gap-0.5 p-2">
              {filteredSalles.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  Aucune salle trouvée
                </p>
              ) : (
                filteredSalles.map((s) => {
                  const mesures = mesuresMap[s.id];
                  const hasAlert = mesures?.alerte_ouverture === true;
                  const hasData = !!mesures?.derniere_mesure;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSalleId(s.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        s.id === selectedSalleId
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="font-medium">{s.nom}</span>
                        <span
                          className={cn(
                            "text-xs",
                            s.id === selectedSalleId
                              ? "text-primary-foreground/70"
                              : "text-muted-foreground"
                          )}
                        >
                          {getBatimentName(s.batiment_id)} ·{" "}
                          {getSiteName(s.batiment_id)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {hasAlert && (
                          <AlertTriangle className="size-4 text-destructive" />
                        )}
                        {hasData && mesures?.derniere_mesure?.temperature != null && (
                          <span
                            className={cn(
                              "text-xs tabular-nums font-medium",
                              s.id === selectedSalleId
                                ? "text-primary-foreground/80"
                                : "text-foreground"
                            )}
                          >
                            {mesures.derniere_mesure.temperature}°C
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Detail panel */}
        {selectedSalle && selectedMesures ? (
          <div className="flex flex-col gap-4">
            {/* Header with salle info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-primary">
                    {selectedSalle.nom}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {getBatimentName(selectedSalle.batiment_id)} ·{" "}
                    {getSiteName(selectedSalle.batiment_id)}
                    {selectedSalle.capacite &&
                      ` · Capacité : ${selectedSalle.capacite}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedMesures.alerte_ouverture && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="size-3" />
                      Alerte ouverture
                    </Badge>
                  )}
                  {selectedSalle.heure_fermeture && (
                    <Badge variant="secondary" className="gap-1">
                      Fermeture : {selectedSalle.heure_fermeture}
                    </Badge>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Sensor data cards */}
            {selectedMesures.derniere_mesure ? (
              <>
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
                      <div className="text-3xl font-bold">
                        {selectedMesures.derniere_mesure.temperature != null
                          ? `${selectedMesures.derniere_mesure.temperature}°C`
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedMesures.derniere_mesure.temperature != null &&
                        selectedMesures.derniere_mesure.temperature > 25
                          ? "Au-dessus de la normale"
                          : selectedMesures.derniere_mesure.temperature != null &&
                              selectedMesures.derniere_mesure.temperature < 18
                            ? "En dessous de la normale"
                            : "Normal"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Luminosity */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Luminosite
                      </CardTitle>
                      <Sun className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {selectedMesures.derniere_mesure.luminosite != null
                          ? `${selectedMesures.derniere_mesure.luminosite}`
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        lux
                      </p>
                    </CardContent>
                  </Card>

                  {/* Presence */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Presence
                      </CardTitle>
                      {selectedMesures.derniere_mesure.presence ? (
                        <UserCheck className="size-4 text-primary" />
                      ) : (
                        <UserX className="size-4 text-muted-foreground" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {selectedMesures.derniere_mesure.presence != null
                          ? selectedMesures.derniere_mesure.presence
                            ? "Oui"
                            : "Non"
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedMesures.derniere_mesure.presence
                          ? "Salle occupee"
                          : "Salle vide"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Window */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Fenetre
                      </CardTitle>
                      <Wind className="size-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {selectedMesures.derniere_mesure.fenetre_ouverte != null
                          ? selectedMesures.derniere_mesure.fenetre_ouverte
                            ? "Ouverte"
                            : "Fermee"
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedMesures.derniere_mesure.fenetre_ouverte
                          ? "Ventilation active"
                          : "Ventilation fermee"}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Door */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Porte
                      </CardTitle>
                      {selectedMesures.derniere_mesure.porte_ouverte ? (
                        <DoorOpen className="size-4 text-primary" />
                      ) : (
                        <DoorClosed className="size-4 text-muted-foreground" />
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {selectedMesures.derniere_mesure.porte_ouverte != null
                          ? selectedMesures.derniere_mesure.porte_ouverte
                            ? "Ouverte"
                            : "Fermee"
                          : "—"}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedMesures.derniere_mesure.porte_ouverte
                          ? "Acces ouvert"
                          : "Acces ferme"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Derniere mesure :{" "}
                      <span className="font-medium text-foreground">
                        {formatDate(
                          selectedMesures.derniere_mesure.mesure_at
                        )}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Eye className="size-10 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    Aucune mesure disponible pour cette salle
                  </p>
                </div>
              </Card>
            )}

            {/* Calculateurs associes */}
            {selectedMesures.calculateurs &&
              selectedMesures.calculateurs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Calculateurs associes ({selectedMesures.calculateurs.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {selectedMesures.calculateurs.map((c) => (
                        <Badge
                          key={c.calculateur_id}
                          variant={c.en_ligne ? "default" : "secondary"}
                          className={cn(
                            "gap-1.5",
                            c.en_ligne
                              ? "bg-primary text-primary-foreground"
                              : ""
                          )}
                        >
                          <span
                            className={cn(
                              "inline-block size-2 rounded-full",
                              c.en_ligne ? "bg-green-300" : "bg-muted-foreground"
                            )}
                          />
                          {c.nom}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        ) : selectedSalle ? (
          <Card className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <Eye className="size-10 text-muted-foreground/50" />
              <p className="text-muted-foreground">
                Aucune donnee disponible pour cette salle
              </p>
            </div>
          </Card>
        ) : (
          <Card className="flex flex-1 items-center justify-center">
            <p className="text-muted-foreground">
              Selectionnez une salle pour voir ses mesures
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
