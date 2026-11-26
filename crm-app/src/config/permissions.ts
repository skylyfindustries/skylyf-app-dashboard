// Fallback copy of the feature list (the server sends the real one from backend/crm/utils/permissions.js)
export type PermModule = { module: string; label: string; features: { key: string; label: string }[] };
export type RoleAccess = { role: string; permissions: string[]; customized: boolean; defaults: string[] };
export type PermInfo = { catalog: PermModule[]; all: string[]; roles: RoleAccess[] };

const m = (module: string, label: string, features: [string, string][]): PermModule => ({
  module,
  label,
  features: features.map(([key, l]) => ({ key, label: l })),
});

export const CATALOG: PermModule[] = [
  m("spare_parts", "Spare parts", [
    ["spare_parts.view", "View parts and stock"],
    ["spare_parts.issue", "Issue and return parts"],
    ["spare_parts.stock", "Update stock (add / adjust quantity)"],
    ["spare_parts.manage", "Add, edit, delete and import parts"],
  ]),
  m("machines", "Machine production", [
    ["machines.view", "View machines and report cards"],
    ["machines.manage", "Create and edit machines, stages and plans"],
  ]),
  m("purchase", "Vendors, purchase orders and material inward", [
    ["purchase.view", "View"],
    ["purchase.manage", "Create and edit"],
  ]),
  m("sales", "Sales orders", [
    ["sales.view", "View"],
    ["sales.manage", "Create and edit"],
  ]),
  m("dispatch", "Dispatch", [
    ["dispatch.view", "View"],
    ["dispatch.manage", "Create challans and returns"],
  ]),
  m("prices", "Price master", [
    ["prices.view", "View"],
    ["prices.manage", "Add and edit prices"],
  ]),
];
export const DEFAULT_PERMS: PermInfo = {
  catalog: CATALOG,
  all: CATALOG.flatMap((x) => x.features.map((f) => f.key)),
  roles: [],
};
