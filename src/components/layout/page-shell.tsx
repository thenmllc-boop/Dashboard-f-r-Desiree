import { Topbar } from "./topbar";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar title={title} subtitle={subtitle} />
      <main className="flex-1 px-6 py-6">
        {actions && <div className="mb-4 flex flex-wrap items-center justify-end gap-2">{actions}</div>}
        {children}
      </main>
    </div>
  );
}
