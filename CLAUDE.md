@AGENTS.md

# ClassroomObserv — Frontend

## Présentation

ClassroomObserv est une application de **gestion et de supervision des infrastructures
scolaires** : sites, bâtiments, salles, personnels, élèves, classes et calculateurs
(capteurs/centrales IoT). C'est à la fois un outil d'**administration** (CRUD sur toutes
les entités) et un outil de **supervision temps réel** (état réseau des centrales, mesures
des salles : température, luminosité, présence, ouverture porte/fenêtre).

> À l'origine, ClassroomObserv est une application **WinForms** reliée à une base
> relationnelle et à une partie opérative en réseau. **Ce dépôt en est la réécriture web**
> (React/Next.js) : uniquement l'interface. Toute la logique métier et les données vivent
> dans le backend.

## Contraintes fermes (à ne jamais violer)

1. **NE PAS modifier le backend.** Le backend (`../e4-e5-hackathon-26-back`, FastAPI +
   PostgreSQL) est figé. On ne touche ni à son code, ni à son schéma, ni à ses routes.
2. **Toutes les données passent par des appels API** (`lib/api.ts`). Aucune donnée en dur,
   aucun accès direct à la base. Si un besoin exige un endpoint absent, on **demande** —
   on ne suppose pas son existence, et on ne l'invente pas côté back.
3. **Stack imposée** : ReactJS + shadcn/ui. Pas d'autre lib UI.
4. **Deux zones** : la page de **connexion** (`/`, + `/register`) et le **dashboard**
   (`/dashboard/*`). Tout le reste est du dashboard.

## Stack

| Élément        | Version / Détail                                                    |
| -------------- | ------------------------------------------------------------------- |
| Framework      | **Next.js 16.2.9**, App Router, RSC activé                          |
| React          | **19.2.4**                                                          |
| Styling        | **Tailwind CSS v4** (config dans `app/globals.css`, pas de `tailwind.config`) |
| Composants     | **shadcn/ui**, style `base-nova`                                    |
| Primitives     | **`@base-ui/react`** (⚠️ PAS Radix — voir gotchas)                   |
| Icônes         | **lucide-react**                                                    |
| Toasts         | **sonner**                                                          |
| Thème          | **next-themes** (clair/sombre via classe `.dark`)                   |
| Police         | Geist / Geist Mono (`next/font`)                                    |
| Package manager| **npm** (`package-lock.json`)                                       |
| Alias d'import | `@/` → racine du projet                                             |

⚠️ **Avant d'écrire du code Next**, lire le guide concerné dans `node_modules/next/dist/docs/`
(cf. `AGENTS.md`) : cette version a des ruptures d'API par rapport aux connaissances par défaut.

## Gotchas React 19 / base-ui (source de bugs fréquents)

- **`render` au lieu de `asChild`.** Les primitives base-ui composent via une prop `render` :
  `<DialogTrigger render={<Button />}>…</DialogTrigger>`, pas `asChild`.
- **`Select` / `SelectValue`** : le placeholder rendu prend une **render-prop enfant**
  `(value) => …` pour afficher le libellé sélectionné (voir `app/dashboard/salles/page.tsx`).
  `SelectItem` doit être dans `SelectGroup`.
- **`ToggleGroup`** (base-ui) : `value` est un **tableau**, `onValueChange(v: string[])`,
  `multiple={false}` par défaut (clic sur l'actif peut renvoyer `[]` → garder l'ancienne valeur).
- **`ref` est un prop réservé** : ne pas nommer un prop de composant `ref` (interception React).
- **Context provider** : React 19 permet `<MonContext value={…}>` sans `.Provider`
  (cf. `lib/auth-context.tsx`).
- **`"use client"`** obligatoire en tête de tout fichier avec state, effets, handlers ou
  API navigateur. Toutes les pages interactives ici sont client.

## Structure

```
app/
  layout.tsx            Root : ThemeProvider + AuthProvider + TooltipProvider + Toaster (lang="fr")
  page.tsx              Page de CONNEXION (redirige vers /dashboard si déjà loggé)
  register/page.tsx     Création de compte
  globals.css           Thème Tailwind v4 (@theme inline) + tokens couleur (oklch)
  dashboard/
    layout.tsx          SidebarProvider + AppSidebar + SidebarInset
    page.tsx            Sites & Bâtiments
    salles/page.tsx     Salles de classe (+ calculateurs, + planning)
    personnels/page.tsx Personnels (infos, horaires, planning)
    classes/page.tsx    Classes & Élèves (profs, élèves, import CSV, planning)
    monitoring/page.tsx Monitoring des centrales (état réseau)
    visualisation/page.tsx  Visualisation temps réel des salles (capteurs)
components/
  app-sidebar.tsx       Navigation latérale (NAV_ITEMS)
  mode-toggle.tsx       Bascule thème clair/sombre
  theme-provider.tsx    Wrapper next-themes
  planning/planning.tsx Composant planning réutilisable (vues Semaine / Mois)
  ui/                   Composants shadcn (base-ui). NE PAS y mettre de logique métier.
hooks/use-mobile.ts
lib/
  api.ts                Client HTTP + tous les endpoints + ApiError
  auth-context.tsx      AuthProvider / useAuth (JWT en localStorage)
  types.ts              Interfaces TS miroir des schémas backend (…Read/…Create/…Update)
  planning.ts           Helpers purs du planning (temps, grille, palette)
  utils.ts              cn()
```

## Couche données (`lib/api.ts`)

- **Base URL** : `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"`.
- **Auth** : JWT Bearer. Token stocké dans `localStorage["access_token"]`
  (`getToken/setToken/removeToken`). Le wrapper `request<T>()` ajoute l'en-tête
  `Authorization` automatiquement.
- **Login** : `POST /api/auth/login` en `application/x-www-form-urlencoded`
  (`URLSearchParams`, format OAuth2 password). Le reste est du JSON.
- **Erreurs** : `ApiError { status, detail }`. Toujours `catch` puis
  `toast.error(err instanceof ApiError ? err.detail : "…")`.
- **204** : géré (retourne `undefined`). **FormData** (import CSV) : ne pas forcer le
  `Content-Type`.
- Nouvelle fonction API → l'ajouter ici, typée via `lib/types.ts`. Ne pas appeler `fetch`
  directement dans les pages.

### Endpoints disponibles (résumé)

`auth` (login/register/me) · `sites` · `batiments` · `salles` (+ `/mesures`) ·
`calculateurs` (+ `/etat`) · `personnels` (+ `/horaires`) · `classes`
(+ `/eleves`, + `/personnels`) · `eleves` (+ `/import`).
Lien **salle ↔ personnel non exposé** : pour un planning par salle, le seul lien
personnel disponible est `GET /api/classes/{id}/personnels`.

## Modèle métier

- **Hiérarchie** : `Site → Batiment → Salle → Calculateur`. Suppressions `RESTRICT`
  vers le haut (pas de bâtiment sans site, etc.).
- **Personnel / Classe / Élève** : liaisons N-N `personnel_salle`, `personnel_classe`
  (avec `matiere`), `classe_eleve` (1 élève / classe / année).
- **`personnel_horaire`** : planning **hebdomadaire récurrent** — `jour` (1=lundi … 7=dimanche),
  `heure_debut`, `heure_fin`. C'est la seule source des créneaux de planning.
- **`releve`** : mesures capteurs d'un calculateur (température, luminosité, présence,
  fenêtre/porte ouverte). **`etat_calculateur_log`** : passages en ligne/hors ligne.

## Conventions UI

- **Langue** : toute l'UI est en **français**.
- **Formulaires** : `FieldGroup` + `Field` + `FieldLabel` (jamais `div` + `space-y-*`).
  Soumission via `FormData` non contrôlée + `defaultValue` (voir pages existantes).
- **Icônes dans les boutons** : `data-icon="inline-start"` / `"inline-end"`, sans classe de taille.
- **Espacement** : `flex … gap-*`, pas de `space-x/y-*`. Dimensions égales : `size-*`.
- **Couleurs** : tokens sémantiques (`bg-primary`, `text-muted-foreground`, `bg-chart-1`…),
  jamais de couleur brute (`bg-blue-500`). Pas de `dark:` manuel.
- **Feedback** : `toast` (sonner) pour succès/erreur ; `Loader2 animate-spin` pour le chargement.
- **Layout type d'une page dashboard** : `<header>` (SidebarTrigger + titre + actions) puis
  une grille liste (gauche) / détail (droite).

### Composant Planning

`components/planning/planning.tsx` (`<Planning events={…} />`) affiche un planning
**Semaine** (grille 7 j × heures) ou **Mois** (motif hebdo projeté sur chaque date).
Les `PlanningEvent` se construisent depuis des `HoraireRead` via `horairesToEvents()`
(`lib/planning.ts`). Utilisé dans Personnels, Classes et Salles.

## Commandes

```bash
npm run dev     # serveur de dev
npm run build   # build de production
npm run start   # serveur de production
npm run lint    # ESLint
```

Le backend doit tourner sur `http://localhost:8000` (ou définir `NEXT_PUBLIC_API_URL`)
pour que les appels aboutissent.

## Tests

Pas de suite de tests dans ce dépôt. Ne pas en ajouter sauf demande explicite.
