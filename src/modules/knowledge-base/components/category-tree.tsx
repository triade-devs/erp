import Link from "next/link";
import type { KbCategory } from "@/modules/knowledge-base";

type Props = {
  categories: KbCategory[];
  companySlug: string;
  selectedCategoryId?: string;
};

function CategoryItem({
  category,
  companySlug,
  isSelected,
  children,
}: {
  category: KbCategory;
  companySlug: string;
  isSelected: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={`/${companySlug}/manual?category=${category.slug}`}
        className={[
          "block rounded-md px-3 py-1.5 text-sm transition-colors",
          isSelected
            ? "bg-primary font-medium text-primary-foreground"
            : "text-foreground hover:bg-muted",
        ].join(" ")}
        aria-current={isSelected ? "page" : undefined}
      >
        {category.title}
      </Link>
      {children && <ul className="ml-4 mt-1 space-y-1">{children}</ul>}
    </li>
  );
}

export function CategoryTree({ categories, companySlug, selectedCategoryId }: Props) {
  const roots = categories.filter((c) => !c.parent_id);
  const childrenOf = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const allSelected = !selectedCategoryId;

  function renderCategory(cat: KbCategory): React.ReactNode {
    const kids = childrenOf(cat.id);
    return (
      <CategoryItem
        key={cat.id}
        category={cat}
        companySlug={companySlug}
        isSelected={selectedCategoryId === cat.id}
      >
        {kids.length > 0 ? kids.map((child) => renderCategory(child)) : undefined}
      </CategoryItem>
    );
  }

  return (
    <nav aria-label="Categorias">
      <ul className="space-y-1">
        {/* "Todas" option */}
        <li>
          <Link
            href={`/${companySlug}/manual`}
            className={[
              "block rounded-md px-3 py-1.5 text-sm transition-colors",
              allSelected
                ? "bg-primary font-medium text-primary-foreground"
                : "text-foreground hover:bg-muted",
            ].join(" ")}
            aria-current={allSelected ? "page" : undefined}
          >
            Todas
          </Link>
        </li>

        {roots.map((cat) => renderCategory(cat))}
      </ul>
    </nav>
  );
}
