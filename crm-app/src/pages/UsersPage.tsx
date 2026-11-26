import { AppLayout } from "@/components/layout/AppLayout";
import { roleLabels, roleColors, UserRole } from "@/types/crm";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreHorizontal,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { usersAPI } from "@/services/api";
import { useDialogs } from "@/components/ui/feedback-dialogs";
import { userSchema, fieldErrors } from "@/lib/validation";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_PERMS, type PermInfo } from "@/config/permissions";
import { RoleAccessDialog } from "@/components/RoleAccessDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { confirm, showResult } = useDialogs();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales_executive" as UserRole,
    phone: "",
    department: "",
    monthlySalary: "",
    joiningDate: "",
  });
  // null = use the role's defaults, an array = exactly these features
  const [perms, setPerms] = useState<string[] | null>(null);
  // Starts with the built-in list so the box always shows; the server's list replaces it when it loads
  const [permInfo, setPermInfo] = useState<PermInfo>(DEFAULT_PERMS);

  const [roleOpen, setRoleOpen] = useState(false);
  const loadPerms = () => usersAPI.permissions().then((r) => setPermInfo(r.data)).catch(() => {});
  useEffect(() => {
    fetchUsers();
    loadPerms();
  }, []);

  // What the role gives (as saved by an admin, or the built-in default)
  const roleDefault = (role: string) =>
    ["super_admin", "admin"].includes(role)
      ? permInfo.all
      : permInfo.roles.find((r) => r.role === role)?.permissions ?? ["spare_parts.view", "machines.view"];

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll();
      setUsers(res.data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching users",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = fieldErrors(userSchema(!!editingUserId), formData);
    setErrors(v ?? {});
    if (v) return;
    const ok = await confirm({
      title: editingUserId ? "Save changes?" : "Create this user?",
      description: editingUserId
        ? `Update details for ${formData.name}.`
        : `${formData.name} will be able to sign in with ${formData.email}.`,
      confirmText: editingUserId ? "Save" : "Create",
    });
    if (!ok) return;

    try {
      setSaving(true);

      let res;
      if (editingUserId) {
        const payload = { ...formData, permissions: perms, monthlySalary: Number(formData.monthlySalary) || 0, joiningDate: formData.joiningDate || null };
        if (!payload.password) {
          delete (payload as any).password;
        }
        res = await usersAPI.update(editingUserId, payload);
      } else {
        res = await usersAPI.create({ ...formData, permissions: perms, monthlySalary: Number(formData.monthlySalary) || 0, joiningDate: formData.joiningDate || null });
      }

      if (res.success) {
        showResult({
          type: "success",
          title: editingUserId ? "User updated" : "User created",
          description: `${formData.name} has been saved.`,
        });
        resetFormAndCloseModal();
        fetchUsers();
      }
    } catch (error: any) {
      showResult({
        type: "error",
        title: "Couldn't save user",
        description: error.message || "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetFormAndCloseModal = () => {
    setIsModalOpen(false);
    setErrors({});
    setEditingUserId(null);
    setPerms(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "sales_executive",
      phone: "",
      department: "",
      monthlySalary: "",
      joiningDate: "",
    });
  };

  const handleEditClick = (user: any) => {
    setFormData({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "sales_executive",
      phone: user.phone || "",
      department: user.department || "",
      monthlySalary: user.monthlySalary ? String(user.monthlySalary) : "",
      joiningDate: user.joiningDate ? String(user.joiningDate).slice(0, 10) : "",
    });
    setPerms(Array.isArray(user.permissions) ? user.permissions : null);
    setEditingUserId(user._id || user.id);
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    const ok = await confirm({
      title: "Delete this user?",
      description: "They will lose access immediately. This can't be undone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await usersAPI.delete(id);
      if (res.success) {
        showResult({ type: "success", title: "User deleted", description: "The account has been removed." });
        fetchUsers();
      }
    } catch (error: any) {
      showResult({ type: "error", title: "Couldn't delete user", description: error.message });
    }
  };

  const filtered = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AppLayout title="Users">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 animate-fade-in">
        <div className="flex items-center gap-2 bg-card rounded-lg border border-border px-3 py-2 w-full sm:w-72">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setRoleOpen(true)}>
          Role access
        </Button>
        <RoleAccessDialog open={roleOpen} onOpenChange={setRoleOpen} info={permInfo} onSaved={loadPerms} />
        <Dialog
          open={isModalOpen}
          onOpenChange={(open) => {
            setIsModalOpen(open);
            if (!open) resetFormAndCloseModal();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => {
                setEditingUserId(null);
                setFormData({
                  name: "",
                  email: "",
                  password: "",
                  role: "sales_executive",
                  phone: "",
                  department: "",
                  monthlySalary: "",
                  joiningDate: "",
                });
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form noValidate onSubmit={handleSubmitUser}>
              <DialogHeader>
                <DialogTitle>
                  {editingUserId ? "Edit User" : "Add New User"}
                </DialogTitle>
                <DialogDescription>
                  {editingUserId
                    ? "Update team member details. Leave password blank to keep current password."
                    : "Create a new team member. They will use their email and password to log in."}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="John Doe"
                    aria-invalid={!!errors.name}
                    className={errors.name ? "border-destructive" : ""}
                  />
                    {errors.name && <p className="text-xs text-destructive animate-fade-in">{errors.name}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="john@example.com"
                    aria-invalid={!!errors.email}
                    className={errors.email ? "border-destructive" : ""}
                  />
                    {errors.email && <p className="text-xs text-destructive animate-fade-in">{errors.email}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">
                    Password{" "}
                    {!editingUserId && (
                      <span className="text-destructive">*</span>
                    )}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder={
                      editingUserId
                        ? "Leave blank to keep unchanged"
                        : "Min. 6 characters"
                    }
                    aria-invalid={!!errors.password}
                    className={errors.password ? "border-destructive" : ""}
                  />
                    {errors.password && <p className="text-xs text-destructive animate-fade-in">{errors.password}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: UserRole) =>
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!["super_admin", "admin"].includes(formData.role) && (
                  <div className="grid gap-3 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Feature access</Label>
                        <p className="text-xs text-muted-foreground">
                          {perms === null ? "Using the defaults of this role" : "Only the features ticked below"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        Custom
                        <Switch
                          checked={perms !== null}
                          onCheckedChange={(on) => setPerms(on ? roleDefault(formData.role) : null)}
                        />
                      </div>
                    </div>
                    {permInfo.catalog.map((m) => (
                      <div key={m.module} className="grid gap-1.5">
                        <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
                        {m.features.map((f) => {
                          const list = perms ?? roleDefault(formData.role);
                          return (
                            <label key={f.key} className="flex items-center gap-2 text-sm">
                              <Checkbox
                                disabled={perms === null}
                                checked={list.includes(f.key)}
                                onCheckedChange={(on) =>
                                  setPerms(on ? [...list, f.key] : list.filter((k) => k !== f.key))
                                }
                              />
                              {f.label}
                            </label>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+91..."
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) =>
                        setFormData({ ...formData, department: e.target.value })
                      }
                      placeholder="e.g. Sales"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="monthlySalary">Monthly salary (₹)</Label>
                    <Input
                      id="monthlySalary"
                      type="number"
                      min={0}
                      value={formData.monthlySalary}
                      onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="joiningDate">Joining date</Label>
                    <Input
                      id="joiningDate"
                      type="date"
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => resetFormAndCloseModal()}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingUserId ? "Update User" : "Save User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 mb-5 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        {(
          [
            "super_admin",
            "admin",
            "sales_executive",
            "service_manager",
            "accountant",
            "production_manager",
            "operator",
            "fitter",
            "electrician",
            "welder",
            "quality_inspector",
            "store_keeper",
          ] as const
        ).map((role) => {
          const count = users.filter((u) => u.role === role).length;
          return (
            <div
              key={role}
              className="bg-card rounded-xl border border-border p-4 card-shadow text-center"
            >
              <p className="text-2xl font-semibold text-foreground">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                ) : (
                  count
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {roleLabels[role]}
              </p>
            </div>
          );
        })}
      </div>

      <div
        className="bg-card rounded-xl border border-border card-shadow overflow-hidden animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">
                  User
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">
                  Role
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden md:table-cell">
                  Department
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Status
                </th>
                <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">
                  Last Login
                </th>
                <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mt-2">
                      Loading users...
                    </p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    <p className="text-sm text-muted-foreground">
                      No users found.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((user, i) => {
                  const initials =
                    user.name
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "U";

                  return (
                    <tr
                      key={user._id || user.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-md",
                            roleColors[user.role as UserRole],
                          )}
                        >
                          {roleLabels[user.role as UserRole] || user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell text-muted-foreground">
                        {user.department || "-"}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-1 rounded-md",
                            user.status === "active"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {user.status || "active"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell text-muted-foreground text-xs">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 rounded hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(user)}
                            >
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                              onClick={() =>
                                handleDeleteClick(user._id || user.id)
                              }
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
