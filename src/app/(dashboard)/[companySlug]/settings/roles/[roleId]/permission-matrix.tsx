"use client";

import { useRef, useState, useActionState } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActionResult } from "@/lib/errors";
import type { ModulePermissions, PermissionRow } from "@/modules/tenancy";

type Props = {
  matrix: ModulePermissions[];
  roleId: string;
  companyId: string;
  isSystem: boolean;
  action: (_prev: ActionResult, formData: FormData) => Promise<ActionResult>;
};

const ACTION_LABELS: Record<string, string> = {
  read: "Visualizar",
  create: "Criar",
  update: "Editar",
  delete: "Excluir",
  export: "Exportar",
  approve: "Aprovar",
  cancel: "Cancelar",
};

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function DraggablePerm({
  perm,
  isGrantedZone,
  isSystem,
}: {
  perm: PermissionRow;
  isGrantedZone: boolean;
  isSystem: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: perm.code,
    disabled: isSystem,
  });
  return (
    <span ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: "none" }}>
      <Badge
        variant={isGrantedZone ? "default" : "outline"}
        className={`select-none text-xs ${isSystem ? "cursor-default" : "cursor-grab"} ${
          isDragging ? "opacity-50" : ""
        }`}
        title={perm.description ?? perm.resource}
      >
        {actionLabel(perm.action)}
      </Badge>
    </span>
  );
}

function PermDropZone({
  id,
  label,
  permissions,
  isSystem,
}: {
  id: string;
  label: string;
  permissions: PermissionRow[];
  isSystem: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const isGrantedZone = id.startsWith("granted-");

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[80px] flex-1 rounded-md border-2 border-dashed p-2 transition-colors ${
        isOver && !isSystem ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1">
        {permissions.map((perm) => (
          <DraggablePerm
            key={perm.code}
            perm={perm}
            isGrantedZone={isGrantedZone}
            isSystem={isSystem}
          />
        ))}
        {permissions.length === 0 && (
          <span className="text-[10px] italic text-muted-foreground">
            {isGrantedZone ? "Nenhuma concedida" : "Todas concedidas"}
          </span>
        )}
      </div>
    </div>
  );
}

type ModuleState = {
  moduleCode: string;
  moduleName: string;
  granted: Set<string>;
};

export function PermissionMatrix({ matrix, isSystem, action }: Props) {
  const initialState: ActionResult = { ok: false };
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  const [moduleStates, setModuleStates] = useState<ModuleState[]>(() =>
    matrix.map((mod) => ({
      moduleCode: mod.moduleCode,
      moduleName: mod.moduleName,
      granted: new Set(mod.permissions.filter((p) => p.granted).map((p) => p.code)),
    })),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  function handleDragStart(event: DragStartEvent) {
    const permCode = String(event.active.id);
    setActiveId(permCode);
    for (const mod of matrix) {
      if (mod.permissions.some((p) => p.code === permCode)) {
        setActiveModuleCode(mod.moduleCode);
        break;
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !activeModuleCode) return;

    const permCode = String(active.id);
    const targetZone = String(over.id);

    setModuleStates((prev) =>
      prev.map((ms) => {
        if (ms.moduleCode !== activeModuleCode) return ms;
        const newGranted = new Set(ms.granted);
        if (targetZone === `granted-${ms.moduleCode}`) {
          newGranted.add(permCode);
        } else if (targetZone === `available-${ms.moduleCode}`) {
          newGranted.delete(permCode);
        }
        return { ...ms, granted: newGranted };
      }),
    );
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null);
    setActiveModuleCode(null);
  }

  if (matrix.length === 0) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Nenhum módulo habilitado nesta empresa.
      </p>
    );
  }

  const activePermission = matrix.flatMap((m) => m.permissions).find((p) => p.code === activeId);
  const allGrantedCodes = moduleStates.flatMap((ms) => [...ms.granted]);

  return (
    <div className="space-y-4">
      {/* Form hidden — usa o path de form submission para o Server Action */}
      <form ref={formRef} action={formAction} className="hidden">
        {allGrantedCodes.map((code) => (
          <input key={code} type="hidden" name="permission_code" value={code} />
        ))}
      </form>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {matrix.map((mod) => {
          const ms = moduleStates.find((s) => s.moduleCode === mod.moduleCode);
          if (!ms) return null;

          const grantedPerms = mod.permissions.filter((p) => ms.granted.has(p.code));
          const availPerms = mod.permissions.filter((p) => !ms.granted.has(p.code));

          return (
            <div key={mod.moduleCode} className="space-y-2 rounded-md border p-3">
              <h3 className="text-sm font-semibold">{mod.moduleName}</h3>
              <div className="flex gap-2">
                <PermDropZone
                  id={`granted-${mod.moduleCode}`}
                  label="Concedido"
                  permissions={grantedPerms}
                  isSystem={isSystem}
                />
                <PermDropZone
                  id={`available-${mod.moduleCode}`}
                  label="Não concedido"
                  permissions={availPerms}
                  isSystem={isSystem}
                />
              </div>
            </div>
          );
        })}

        <DragOverlay>
          {activePermission && (
            <Badge className="cursor-grabbing text-xs shadow-lg">
              {actionLabel(activePermission.action)}
            </Badge>
          )}
        </DragOverlay>
      </DndContext>

      {!state.ok && state.message && <p className="text-sm text-destructive">{state.message}</p>}
      {state.ok && state.message && <p className="text-sm text-green-700">{state.message}</p>}

      {!isSystem && (
        <div className="flex justify-end">
          <Button onClick={() => formRef.current?.requestSubmit()} disabled={isPending}>
            {isPending ? "Salvando..." : "Salvar permissões"}
          </Button>
        </div>
      )}
    </div>
  );
}
