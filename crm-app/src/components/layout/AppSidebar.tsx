import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getGroupedNav } from "@/config/navigation";
import { roleLabels } from "@/types/crm";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import logo from "../../assets/images/logo.png";

// Each page mounts its own layout, so the sidebar remounts on every navigation.
// Keep its scroll position and collapsed state at module level so it stays put.
let savedScroll: number | null = null;
let savedCollapsed = false;

export function AppSidebar({ mobileOpen = false, onClose = () => {} }: { mobileOpen?: boolean; onClose?: () => void }) {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsedState] = useState(savedCollapsed);
  const setCollapsed = (v: boolean) => {
    savedCollapsed = v;
    setCollapsedState(v);
  };
  const navRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    if (savedScroll !== null) {
      nav.scrollTop = savedScroll;
    } else {
      // first load: bring the active item into view
      nav.querySelector('[data-active="true"]')?.scrollIntoView({ block: "center" });
      savedScroll = nav.scrollTop;
    }
  }, [user]);

  if (!user) return null;

  const groups = getGroupedNav(user.role);

  // On small screens the sidebar is an off-canvas drawer and is never collapsed.
  const rail = collapsed;
  return (
    <>
    <div
      onClick={onClose}
      className={cn(
        "fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 lg:hidden",
        mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    />
    <aside
      className={cn(
        "h-screen bg-card border-r border-border flex flex-col",
        "fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ease-out lg:sticky lg:top-0 lg:z-30 lg:translate-x-0 lg:transition-none",
        mobileOpen ? "translate-x-0" : "-translate-x-full",
        rail ? "lg:w-16" : "lg:w-60",
      )}
    >
      {}
      <div className="h-14 flex items-center px-4 border-b border-border">
        <button onClick={onClose} aria-label="Close menu" className="lg:hidden mr-2 p-1 rounded-md text-muted-foreground hover:bg-muted">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-full h-8 rounded-lg flex items-center justify-center shrink-0">
            <img
              src={logo}
              className="w-full h-full object-contain"
              alt="logo"
            />
          </div>
          
        </div>
      </div>

      {}
      <nav
        ref={navRef}
        onScroll={(e) => (savedScroll = e.currentTarget.scrollTop)}
        className="flex-1 py-3 px-2 overflow-y-auto"
      >
        {groups.map(({ group, items }, gi) => (
          <div key={group} className={cn(gi > 0 && (collapsed ? "lg:mt-3 lg:pt-3 lg:border-t lg:border-border mt-6" : "mt-6"))}>
            <p className={cn("px-3 pb-2 text-xs text-muted-foreground", rail && "lg:hidden")}>{group}</p>
            <div className="space-y-0.5">
              {items.map((item) => {
                const active = location.pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    data-active={active}
                    onClick={onClose}
                    title={collapsed ? item.title : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 px-3 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-muted font-medium text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border))]"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      collapsed && "lg:justify-center lg:px-0",
                    )}
                  >
                    <item.icon strokeWidth={1.5} className={cn("w-[18px] h-[18px] shrink-0", active && "text-primary")} />
                    <span className={cn(collapsed && "lg:hidden")}>{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <a
        href="/overview"
        className={cn("mx-2 mb-2 flex h-9 items-center gap-2.5 px-3 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground", collapsed && "lg:justify-center lg:px-0")}
        title="Back to Skylyf fleet dashboard"
      >
        <ChevronLeft strokeWidth={1.5} className="w-[18px] h-[18px] shrink-0" />
        <span className={cn(collapsed && "lg:hidden")}>Fleet dashboard</span>
      </a>
      {(
        <div className={cn("px-4 py-3 border-t border-border", rail && "lg:hidden")}>
          <p className="text-xs text-muted-foreground">
            {roleLabels[user.role]}
          </p>
        </div>
      )}

      {}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="hidden lg:flex absolute -right-3 top-[68px] w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
    </>
  );
}
