// ========================== Auth ==========================
export interface Token {
  access_token: string;
  token_type: string;
}

export interface UserRead {
  id: number;
  username: string;
  role: "utilisateur" | "administrateur";
  created_at: string;
}

// ========================== Sites ==========================
export interface SiteRead {
  id: number;
  nom: string;
  adresse: string | null;
  ville: string;
  code_postal: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface SiteCreate {
  nom: string;
  adresse?: string | null;
  ville: string;
  code_postal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface SiteUpdate {
  nom?: string | null;
  adresse?: string | null;
  ville?: string | null;
  code_postal?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

// ======================== Batiments ========================
export interface BatimentRead {
  id: number;
  site_id: number;
  nom: string;
  created_at: string;
}

export interface BatimentCreate {
  site_id: number;
  nom: string;
}

export interface BatimentUpdate {
  site_id?: number | null;
  nom?: string | null;
}

// ========================== Salles ==========================
export interface SalleRead {
  id: number;
  batiment_id: number;
  nom: string;
  capacite: number | null;
  heure_fermeture: string | null;
  created_at: string;
}

export interface SalleCreate {
  batiment_id: number;
  nom: string;
  capacite?: number | null;
  heure_fermeture?: string | null;
}

export interface SalleUpdate {
  batiment_id?: number | null;
  nom?: string | null;
  capacite?: number | null;
  heure_fermeture?: string | null;
}

// ====================== Calculateurs ======================
export interface CalculateurRead {
  id: number;
  salle_id: number | null;
  nom: string;
  ip_adresse: string | null;
  mac_adresse: string | null;
  created_at: string;
}

export interface CalculateurCreate {
  salle_id?: number | null;
  nom: string;
  ip_adresse?: string | null;
  mac_adresse?: string | null;
}

export interface CalculateurUpdate {
  salle_id?: number | null;
  nom?: string | null;
  ip_adresse?: string | null;
  mac_adresse?: string | null;
}

// ======================== Personnels ========================
export interface PersonnelRead {
  id: number;
  identifiant: string;
  nom: string;
  prenom: string;
  email: string | null;
  created_at: string;
}

export interface PersonnelCreate {
  identifiant: string;
  nom: string;
  prenom: string;
  email?: string | null;
}

export interface PersonnelUpdate {
  identifiant?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
}

// ========================= Horaires =========================
export interface HoraireRead {
  id: number;
  personnel_id: number;
  jour: number;
  heure_debut: string;
  heure_fin: string;
}

export interface HoraireCreate {
  jour: number;
  heure_debut: string;
  heure_fin: string;
}

// ========================== Classes ==========================
export interface ClasseRead {
  id: number;
  nom: string;
  niveau: string | null;
  annee_scolaire: string;
  professeur_principal_id: number | null;
  created_at: string;
}

export interface ClasseCreate {
  nom: string;
  niveau?: string | null;
  annee_scolaire: string;
  professeur_principal_id?: number | null;
}

export interface ClasseUpdate {
  nom?: string | null;
  niveau?: string | null;
  annee_scolaire?: string | null;
  professeur_principal_id?: number | null;
}

// ========================== Eleves ==========================
export interface EleveRead {
  id: number;
  identifiant: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  created_at: string;
}

export interface EleveCreate {
  identifiant: string;
  nom: string;
  prenom: string;
  email?: string | null;
  telephone?: string | null;
}

export interface EleveUpdate {
  identifiant?: string | null;
  nom?: string | null;
  prenom?: string | null;
  email?: string | null;
  telephone?: string | null;
}

export interface EleveImportResult {
  importes: number;
  ignores: number;
  erreurs: string[];
}

// ======================= Affectations =======================
export interface ClasseEleveAffectation {
  eleve_id: number;
  annee_scolaire: string;
}

export interface PersonnelClasseAffectation {
  personnel_id: number;
  matiere: string;
}

export interface PersonnelClasseRead {
  personnel_id: number;
  nom: string;
  prenom: string;
  matiere: string;
}

// ========================= Sensors =========================
export interface EtatCalculateurRead {
  calculateur_id: number;
  nom: string;
  en_ligne: boolean | null;
  change_at: string | null;
}

export interface ReleveRead {
  id: number;
  calculateur_id: number;
  temperature: number | null;
  luminosite: number | null;
  presence: boolean | null;
  fenetre_ouverte: boolean | null;
  porte_ouverte: boolean | null;
  mesure_at: string;
}

export interface MesuresSalle {
  salle_id: number;
  nom: string;
  heure_fermeture: string | null;
  alerte_ouverture: boolean;
  derniere_mesure: ReleveRead | null;
  calculateurs: EtatCalculateurRead[];
}
