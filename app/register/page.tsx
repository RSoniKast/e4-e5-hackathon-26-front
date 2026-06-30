"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { School, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { register as apiRegister, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const PASSWORD_RULES =
  "Min. 8 caractères, 1 minuscule, 1 majuscule, 1 chiffre et 1 caractère spécial.";

const PASSWORD_RE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = (formData.get("username") as string).trim();
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validation
    if (username.length < 3) {
      setError("Le nom d'utilisateur doit contenir au moins 3 caractères.");
      return;
    }

    if (!PASSWORD_RE.test(password)) {
      setError(PASSWORD_RULES);
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      await apiRegister(username, password);
      toast.success("Compte créé avec succès ! Vous pouvez maintenant vous connecter.");
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          setError("Ce nom d'utilisateur est déjà pris.");
        } else if (err.status === 422) {
          setError(PASSWORD_RULES);
        } else {
          setError(err.detail);
        }
      } else {
        setError(
          "Erreur de connexion au serveur. Vérifiez que le backend est lancé."
        );
      }
    } finally {
      setLoading(false);
    }
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
                <CardTitle className="text-2xl">Créer un compte</CardTitle>
                <CardDescription>
                  Remplissez le formulaire pour vous inscrire
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="username">
                    Nom d&apos;utilisateur
                  </FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    placeholder="agent.dupont"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={50}
                    disabled={loading}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Mot de passe</FieldLabel>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {PASSWORD_RULES}
                  </p>
                </Field>
                <Field>
                  <FieldLabel htmlFor="confirmPassword">
                    Confirmer le mot de passe
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowConfirm((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </Field>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <Loader2
                      className="size-4 animate-spin"
                      data-icon="inline-start"
                    />
                  )}
                  Créer mon compte
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/" className="text-primary underline-offset-4 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
