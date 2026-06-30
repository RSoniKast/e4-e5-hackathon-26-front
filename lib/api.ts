import type {
  Token,
  UserRead,
  SiteRead,
  SiteCreate,
  SiteUpdate,
  BatimentRead,
  BatimentCreate,
  BatimentUpdate,
  SalleRead,
  SalleCreate,
  SalleUpdate,
  CalculateurRead,
  CalculateurCreate,
  CalculateurUpdate,
  PersonnelRead,
  PersonnelCreate,
  PersonnelUpdate,
  HoraireRead,
  HoraireCreate,
  ClasseRead,
  ClasseCreate,
  ClasseUpdate,
  EleveRead,
  EleveCreate,
  EleveUpdate,
  EleveImportResult,
  ClasseEleveAffectation,
  PersonnelClasseAffectation,
  PersonnelClasseRead,
  EtatCalculateurRead,
  MesuresSalle,
} from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ─── Token helpers ───────────────────────────────────────────────
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

export function setToken(token: string): void {
  localStorage.setItem("access_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("access_token");
}

// ─── Generic fetch wrapper ──────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON bodies (not FormData)
  if (options.body && !(options.body instanceof FormData) && !(options.body instanceof URLSearchParams)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 204) {
    return undefined as T;
  }

  if (!res.ok) {
    let detail = `Erreur ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? JSON.stringify(body);
    } catch {
      // ignore parse error
    }
    throw new ApiError(res.status, detail);
  }

  return res.json() as Promise<T>;
}

// ─── Auth ────────────────────────────────────────────────────────
export async function login(username: string, password: string): Promise<Token> {
  const body = new URLSearchParams({ username, password });
  return request<Token>("/api/auth/login", {
    method: "POST",
    body,
  });
}

export async function register(username: string, password: string): Promise<UserRead> {
  return request<UserRead>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function getMe(): Promise<UserRead> {
  return request<UserRead>("/api/auth/me");
}

// ─── Sites ───────────────────────────────────────────────────────
export async function getSites(): Promise<SiteRead[]> {
  return request<SiteRead[]>("/api/sites");
}

export async function getSite(id: number): Promise<SiteRead> {
  return request<SiteRead>(`/api/sites/${id}`);
}

export async function createSite(data: SiteCreate): Promise<SiteRead> {
  return request<SiteRead>("/api/sites", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSite(id: number, data: SiteUpdate): Promise<SiteRead> {
  return request<SiteRead>(`/api/sites/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSite(id: number): Promise<void> {
  return request<void>(`/api/sites/${id}`, { method: "DELETE" });
}

// ─── Batiments ───────────────────────────────────────────────────
export async function getBatiments(siteId?: number): Promise<BatimentRead[]> {
  const params = siteId != null ? `?site_id=${siteId}` : "";
  return request<BatimentRead[]>(`/api/batiments${params}`);
}

export async function getBatiment(id: number): Promise<BatimentRead> {
  return request<BatimentRead>(`/api/batiments/${id}`);
}

export async function createBatiment(data: BatimentCreate): Promise<BatimentRead> {
  return request<BatimentRead>("/api/batiments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateBatiment(id: number, data: BatimentUpdate): Promise<BatimentRead> {
  return request<BatimentRead>(`/api/batiments/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteBatiment(id: number): Promise<void> {
  return request<void>(`/api/batiments/${id}`, { method: "DELETE" });
}

// ─── Salles ──────────────────────────────────────────────────────
export async function getSalles(batimentId?: number): Promise<SalleRead[]> {
  const params = batimentId != null ? `?batiment_id=${batimentId}` : "";
  return request<SalleRead[]>(`/api/salles${params}`);
}

export async function getSalle(id: number): Promise<SalleRead> {
  return request<SalleRead>(`/api/salles/${id}`);
}

export async function createSalle(data: SalleCreate): Promise<SalleRead> {
  return request<SalleRead>("/api/salles", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSalle(id: number, data: SalleUpdate): Promise<SalleRead> {
  return request<SalleRead>(`/api/salles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteSalle(id: number): Promise<void> {
  return request<void>(`/api/salles/${id}`, { method: "DELETE" });
}

// ─── Calculateurs ────────────────────────────────────────────────
export async function getCalculateurs(salleId?: number): Promise<CalculateurRead[]> {
  const params = salleId != null ? `?salle_id=${salleId}` : "";
  return request<CalculateurRead[]>(`/api/calculateurs${params}`);
}

export async function getCalculateur(id: number): Promise<CalculateurRead> {
  return request<CalculateurRead>(`/api/calculateurs/${id}`);
}

export async function createCalculateur(data: CalculateurCreate): Promise<CalculateurRead> {
  return request<CalculateurRead>("/api/calculateurs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateCalculateur(id: number, data: CalculateurUpdate): Promise<CalculateurRead> {
  return request<CalculateurRead>(`/api/calculateurs/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCalculateur(id: number): Promise<void> {
  return request<void>(`/api/calculateurs/${id}`, { method: "DELETE" });
}

// ─── Personnels ──────────────────────────────────────────────────
export async function getPersonnels(): Promise<PersonnelRead[]> {
  return request<PersonnelRead[]>("/api/personnels");
}

export async function getPersonnel(id: number): Promise<PersonnelRead> {
  return request<PersonnelRead>(`/api/personnels/${id}`);
}

export async function createPersonnel(data: PersonnelCreate): Promise<PersonnelRead> {
  return request<PersonnelRead>("/api/personnels", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePersonnel(id: number, data: PersonnelUpdate): Promise<PersonnelRead> {
  return request<PersonnelRead>(`/api/personnels/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePersonnel(id: number): Promise<void> {
  return request<void>(`/api/personnels/${id}`, { method: "DELETE" });
}

export async function getHoraires(personnelId: number): Promise<HoraireRead[]> {
  return request<HoraireRead[]>(`/api/personnels/${personnelId}/horaires`);
}

export async function createHoraire(personnelId: number, data: HoraireCreate): Promise<HoraireRead> {
  return request<HoraireRead>(`/api/personnels/${personnelId}/horaires`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// ─── Classes ─────────────────────────────────────────────────────
export async function getClasses(anneeScolaire?: string): Promise<ClasseRead[]> {
  const params = anneeScolaire ? `?annee_scolaire=${encodeURIComponent(anneeScolaire)}` : "";
  return request<ClasseRead[]>(`/api/classes${params}`);
}

export async function getClasse(id: number): Promise<ClasseRead> {
  return request<ClasseRead>(`/api/classes/${id}`);
}

export async function createClasse(data: ClasseCreate): Promise<ClasseRead> {
  return request<ClasseRead>("/api/classes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateClasse(id: number, data: ClasseUpdate): Promise<ClasseRead> {
  return request<ClasseRead>(`/api/classes/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteClasse(id: number): Promise<void> {
  return request<void>(`/api/classes/${id}`, { method: "DELETE" });
}

export async function getClasseEleves(classeId: number): Promise<EleveRead[]> {
  return request<EleveRead[]>(`/api/classes/${classeId}/eleves`);
}

export async function affecterEleveClasse(classeId: number, data: ClasseEleveAffectation): Promise<void> {
  return request<void>(`/api/classes/${classeId}/eleves`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function retirerEleveClasse(classeId: number, eleveId: number): Promise<void> {
  return request<void>(`/api/classes/${classeId}/eleves/${eleveId}`, { method: "DELETE" });
}

export async function affecterPersonnelClasse(classeId: number, data: PersonnelClasseAffectation): Promise<void> {
  return request<void>(`/api/classes/${classeId}/personnels`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getClassePersonnels(classeId: number): Promise<PersonnelClasseRead[]> {
  return request<PersonnelClasseRead[]>(`/api/classes/${classeId}/personnels`);
}

export async function retirerPersonnelClasse(classeId: number, personnelId: number): Promise<void> {
  return request<void>(`/api/classes/${classeId}/personnels/${personnelId}`, { method: "DELETE" });
}

// ─── Eleves ──────────────────────────────────────────────────────
export async function getEleves(): Promise<EleveRead[]> {
  return request<EleveRead[]>("/api/eleves");
}

export async function getEleve(id: number): Promise<EleveRead> {
  return request<EleveRead>(`/api/eleves/${id}`);
}

export async function createEleve(data: EleveCreate): Promise<EleveRead> {
  return request<EleveRead>("/api/eleves", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEleve(id: number, data: EleveUpdate): Promise<EleveRead> {
  return request<EleveRead>(`/api/eleves/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEleve(id: number): Promise<void> {
  return request<void>(`/api/eleves/${id}`, { method: "DELETE" });
}

export async function importEleves(file: File): Promise<EleveImportResult> {
  const formData = new FormData();
  formData.append("file", file);
  return request<EleveImportResult>("/api/eleves/import", {
    method: "POST",
    body: formData,
  });
}

// ─── Monitoring ──────────────────────────────────────────────────
export async function getEtatCalculateurs(): Promise<EtatCalculateurRead[]> {
  return request<EtatCalculateurRead[]>("/api/calculateurs/etat");
}

export async function getMesuresSalle(salleId: number): Promise<MesuresSalle> {
  return request<MesuresSalle>(`/api/salles/${salleId}/mesures`);
}
