"use client";

import { useRouter } from "next/navigation";
import { School, Database } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-muted/40 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-4">
        <Card className="w-full">
          <CardHeader className="items-center text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <School className="size-6" />
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="font-heading text-lg font-semibold">
                  ClassroomObserv
                </span>
                <CardTitle className="text-2xl">Connexion</CardTitle>
                <CardDescription>
                  Supervision &amp; gestion scolaire
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="identifiant">Identifiant</FieldLabel>
                  <Input
                    id="identifiant"
                    name="identifiant"
                    placeholder="agent.dupont"
                    autoComplete="username"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </Field>
                <Field orientation="horizontal">
                  <Checkbox id="remember" name="remember" />
                  <FieldLabel htmlFor="remember" className="font-normal">
                    Se souvenir de moi
                  </FieldLabel>
                </Field>
                <Button type="submit" className="w-full">
                  Se connecter
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Dialog>
          <DialogTrigger
            render={
              <Button variant="ghost" size="sm" className="text-muted-foreground" />
            }
          >
            <Database data-icon="inline-start" />
            Paramètres base de données
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Paramètres base de données</DialogTitle>
              <DialogDescription>
                Renseignez la connexion puis testez-la avant de l&apos;enregistrer.
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="db-host">Hôte</FieldLabel>
                <Input id="db-host" placeholder="localhost:5432" />
              </Field>
              <Field>
                <FieldLabel htmlFor="db-name">Base</FieldLabel>
                <Input id="db-name" placeholder="classroomobserv" />
              </Field>
              <Field>
                <FieldLabel htmlFor="db-user">Utilisateur</FieldLabel>
                <Input id="db-user" placeholder="postgres" />
              </Field>
              <Field>
                <FieldLabel htmlFor="db-pass">Mot de passe</FieldLabel>
                <Input id="db-pass" type="password" placeholder="••••••••" />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Annuler
              </DialogClose>
              <Button onClick={() => toast.success("Connexion à la base réussie")}>
                Tester
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
