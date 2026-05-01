"use client";

import { useState, useTransition } from "react";
import {
  DndContext,
  closestCenter,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { updateMemberRolesAction } from "@/modules/tenancy/client";
import type { CompanyRole } from "@/modules/tenancy";

type Props = {
  companyId: string;
  membershipId: string;
  memberName: string;
  availableRoles: CompanyRole[];
  currentRoleIds: string[];
};

type RoleDragItem = CompanyRole & { zone: "available" | "assigned" };

function DraggableRole({ role }: { role: RoleDragItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: role.id });
  return (
    <span ref={setNodeRef} {...listeners} {...attributes} style={{ touchAction: "none" }}>
      <Badge
        variant={role.zone === "assigned" ? "default" : "secondary"}
        className={`cursor-grab select-none text-xs ${isDragging ? "opacity-50" : ""}`}
      >
        {role.name}
      </Badge>
    </span>
  );
}

function DroppableZone({ id, label, roles }: { id: string; label: string; roles: RoleDragItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[120px] rounded-md border-2 border-dashed p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5" : "border-muted"
      }`}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {roles.map((role) => (
          <DraggableRole key={role.id} role={role} />
        ))}
        {roles.length === 0 && (
          <p className="text-xs italic text-muted-foreground">
            {id === "assigned" ? "Nenhuma role atribuída" : "Todas atribuídas"}
          </p>
        )}
      </div>
    </div>
  );
}

export function MemberRolesSheet({
  companyId,
  membershipId,
  memberName,
  availableRoles,
  currentRoleIds,
}: Props) {
  const [open, setOpen] = useState(false);
  const [assigned, setAssigned] = useState<string[]>(currentRoleIds);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const assignedRoles: RoleDragItem[] = availableRoles
    .filter((r) => assigned.includes(r.id))
    .map((r) => ({ ...r, zone: "assigned" as const }));

  const availRoles: RoleDragItem[] = availableRoles
    .filter((r) => !assigned.includes(r.id))
    .map((r) => ({ ...r, zone: "available" as const }));

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const roleId = String(active.id);
    const targetZone = String(over.id) as "available" | "assigned";

    if (targetZone === "assigned" && !assigned.includes(roleId)) {
      setAssigned((prev) => [...prev, roleId]);
    } else if (targetZone === "available" && assigned.includes(roleId)) {
      setAssigned((prev) => prev.filter((id) => id !== roleId));
    }
  }

  function handleDragEnd(_event: DragEndEvent) {
    setActiveId(null);
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateMemberRolesAction(companyId, membershipId, assigned);
      if (result.ok) {
        toast.success(result.message ?? "Roles atualizadas");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Erro ao salvar roles");
      }
    });
  }

  const activeRole = availableRoles.find((r) => r.id === activeId);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          Editar roles
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Roles de {memberName}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Arraste as roles entre os painéis para atribuir ou remover.
          </p>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-3">
              <DroppableZone id="assigned" label="Roles atribuídas" roles={assignedRoles} />
              <DroppableZone id="available" label="Roles disponíveis" roles={availRoles} />
            </div>

            <DragOverlay>
              {activeRole && <Badge className="cursor-grabbing shadow-lg">{activeRole.name}</Badge>}
            </DragOverlay>
          </DndContext>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar roles"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
