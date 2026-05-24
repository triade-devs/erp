import { CreateTemplateForm } from "./create-template-form";

export const metadata = { title: "Novo template — Plataforma" };

export default function NewRoleTemplatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Novo template de role</h1>
      <CreateTemplateForm />
    </div>
  );
}
