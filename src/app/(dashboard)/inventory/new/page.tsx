import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductForm } from "@/modules/inventory";

export const metadata = { title: "Novo Produto — ERP" };

export default function NewProductPage() {
  return (
    <section className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Novo Produto</h1>
          <p className="text-sm text-muted-foreground">Preencha os dados do produto</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/inventory">Cancelar</Link>
        </Button>
      </header>

      <div className="rounded-lg border bg-card p-6">
        <ProductForm />
      </div>
    </section>
  );
}
