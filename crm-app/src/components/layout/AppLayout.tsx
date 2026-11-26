import { useState } from "react";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  title: string;
  children: React.ReactNode;
}

// Inside the dashboard shell (iframe) the dashboard supplies the sidebar + header.
const embedded = typeof window !== "undefined" && window.self !== window.top;

export function AppLayout({ title, children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  if (embedded) return <main className="min-h-screen w-full bg-background p-4 sm:p-6">{children}</main>;
  return (
    <div className="min-h-screen flex w-full bg-background overflow-x-clip">
      <AppSidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader title={title} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
