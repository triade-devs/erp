"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Classification } from "@/modules/inventory";
import type { ActionResult } from "@/lib/errors";

type Level = "department" | "category" | "brand";

type Props = {
  classifications: Classification[];
  createAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  deleteAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

const LEVEL_LABELS: Record<Level, string> = {
  department: "Departamento",
  category: "Categoria",
  brand: "Marca",
};

const initial: ActionResult = { ok: false };

export function ClassificationsManager({ classifications, createAction, deleteAction }: Props) {
  const [createState, createFormAction] = useActionState(createAction, initial);

  const [level, setLevel] = useState<Level>("department");
  const [parentId, setParentId] = useState<string>("");

  const departments = classifications.filter((c) => c.level === "department");
  const categories = classifications.filter((c) => c.level === "category");
  const brands = classifications.filter((c) => c.level === "brand");

  const parentOptions = level === "category" ? departments : level === "brand" ? categories : [];

  const fieldErrors = createState.ok ? undefined : createState.fieldErrors;

  function handleLevelChange(v: Level) {
    setLevel(v);
    setParentId("");
  }

  return (
    <div className="space-y-8">
      {/* Formulário de criação */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold">Nova classificação</h2>
        <form
          action={createFormAction}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {/* Nível */}
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select name="level" value={level} onValueChange={(v) => handleLevelChange(v as Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">Departamento</SelectItem>
                <SelectItem value="category">Categoria</SelectItem>
                <SelectItem value="brand">Marca</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parent (quando necessário) */}
          {level !== "department" && (
            <div className="space-y-2">
              <Label>{level === "category" ? "Departamento pai" : "Categoria pai"}</Label>
              <Select name="parent_id" value={parentId} onValueChange={setParentId} required>
                <SelectTrigger aria-invalid={!parentId}>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {parentOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Nome */}
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label htmlFor="clf-name">
              Nome <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="clf-name"
                name="name"
                required
                placeholder={`NOME DO ${LEVEL_LABELS[level].toUpperCase()}`}
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                }}
                aria-invalid={!!fieldErrors?.name}
                className="flex-1"
              />
              <CreateButton />
            </div>
            {fieldErrors?.name && <p className="text-sm text-red-600">{fieldErrors.name[0]}</p>}
            {!createState.ok && createState.message && (
              <p className="text-sm text-red-600">{createState.message}</p>
            )}
          </div>
        </form>
      </div>

      {/* Hierarquia */}
      <div className="space-y-6">
        {departments.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhum departamento cadastrado. Crie um acima para começar.
            </p>
          </div>
        ) : (
          departments.map((dept) => {
            const deptCategories = categories.filter((c) => c.parent_id === dept.id);
            return (
              <div key={dept.id} className="rounded-lg border bg-card">
                {/* Departamento */}
                <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      Depto
                    </span>
                    <span className="font-semibold">{dept.name}</span>
                  </div>
                  <DeleteButton deleteAction={deleteAction} id={dept.id} />
                </div>

                {/* Categorias */}
                <div className="divide-y">
                  {deptCategories.length === 0 ? (
                    <p className="px-6 py-3 text-sm text-muted-foreground">
                      Sem categorias neste departamento.
                    </p>
                  ) : (
                    deptCategories.map((cat) => {
                      const catBrands = brands.filter((b) => b.parent_id === cat.id);
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center justify-between px-6 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-medium">
                                Cat
                              </span>
                              <span className="text-sm font-medium">{cat.name}</span>
                            </div>
                            <DeleteButton deleteAction={deleteAction} id={cat.id} />
                          </div>

                          {/* Marcas */}
                          {catBrands.length > 0 && (
                            <div className="divide-y border-t bg-muted/20">
                              {catBrands.map((brand) => (
                                <div
                                  key={brand.id}
                                  className="flex items-center justify-between px-10 py-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="rounded bg-muted px-2 py-0.5 text-xs">
                                      Marca
                                    </span>
                                    <span className="text-sm">{brand.name}</span>
                                  </div>
                                  <DeleteButton deleteAction={deleteAction} id={brand.id} />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Criando..." : "Criar"}
    </Button>
  );
}

function DeleteButton({
  deleteAction,
  id,
}: {
  deleteAction: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
  id: string;
}) {
  const [, action] = useActionState(deleteAction, initial);
  // action retornado pelo useActionState é compatível com form action
  const formAction = action as unknown as (payload: FormData) => void;
  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <DeleteSubmitButton />
    </form>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      disabled={pending}
      className="text-destructive hover:text-destructive"
    >
      {pending ? "..." : "Remover"}
    </Button>
  );
}
