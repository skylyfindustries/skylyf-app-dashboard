import { useAuth } from "@/contexts/AuthContext";
import { Menu, Bell, Search, LogOut, User, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { roleLabels } from "@/types/crm";
import { useNavigate } from "react-router-dom";

export function AppHeader({ title, onMenu }: { title: string; onMenu?: () => void }) {
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/login");
  };

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between gap-2 px-3 sm:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} aria-label="Open menu" className="lg:hidden w-9 h-9 -ml-1 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
          <Menu strokeWidth={1.5} className="w-5 h-5" />
        </button>
        <h1 className="text-base font-medium text-foreground truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-1 sm:gap-3 shrink-0">
        {}
        <div className="hidden md:flex items-center gap-2 bg-muted rounded-lg px-3 h-9 w-56">
          <Search strokeWidth={1.5} className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search"
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {}
        <button className="relative w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
          <Bell strokeWidth={1.5} className="w-[18px] h-[18px] text-muted-foreground" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
        </button>

        {}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 hover:bg-muted rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-muted text-foreground flex items-center justify-center text-xs font-medium">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground leading-tight">
                {user.name}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">
                {roleLabels[user.role]}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground hidden md:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 max-w-[calc(100vw-1.5rem)] bg-card rounded-xl border border-border card-shadow-hover py-1 animate-fade-in">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>

              <div className="py-1 border-b border-border">
                <div className="px-3 py-1.5">
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="text-sm font-medium">
                    {roleLabels[user.role]}
                  </p>
                </div>
                {user.department && (
                  <div className="px-3 py-1.5">
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="text-sm font-medium">{user.department}</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setProfileOpen(false);
                  navigate("/settings");
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <User className="w-4 h-4" /> Profile & Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
              >
                <LogOut className="w-4 h-4" /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
