"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onClose: () => void;
  link: string;
  shortCode: string;
  title?: string;
};

export function CredentialDisplayDialog({
  open,
  onClose,
  link,
  shortCode,
  title = "Credenciais geradas",
}: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="w-full max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Esta tela só aparece uma vez. Copie as informações agora — não será possível
          recuperá-las.
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Link completo</Label>
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(link, setCopiedLink)}
              >
                {copiedLink ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Código curto</Label>
            <div className="flex gap-2">
              <Input readOnly value={shortCode} className="font-mono text-sm" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(shortCode, setCopiedCode)}
              >
                {copiedCode ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
