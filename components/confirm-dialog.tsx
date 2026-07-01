"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ConfirmDialogProps {
  /** Élément déclencheur (le bouton de suppression existant). */
  trigger: React.ReactElement
  /** Titre de la boîte de confirmation. */
  title: string
  /** Texte explicatif de l'action (souvent irréversible). */
  description?: React.ReactNode
  /** Libellé du bouton de confirmation. */
  confirmLabel?: string
  /** Libellé du bouton d'annulation. */
  cancelLabel?: string
  /** Action exécutée à la confirmation. La boîte se ferme une fois résolue. */
  onConfirm: () => void | Promise<void>
}

/**
 * Boîte de confirmation générique posée devant une action destructive.
 * Le déclencheur passé n'exécute plus l'action directement : il ouvre d'abord
 * la confirmation, et `onConfirm` n'est appelé qu'après validation explicite.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  onConfirm,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogClose
            render={<Button variant="outline" disabled={loading} />}
          >
            {cancelLabel}
          </AlertDialogClose>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? (
              <Loader2
                className="size-4 animate-spin"
                data-icon="inline-start"
              />
            ) : null}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
