// Same origin as the dashboard (dev proxy / production host); VITE_API_URL points at a separate API host.
const ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
const API_BASE = `${ORIGIN}/api/v1/crm`;

// Uploaded files are served from the API origin, outside /api
// Single sign-in: the Skylyf dashboard keeps its tokens in sessionStorage (same origin). Exchange them for a CRM session.
const skylyf = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const skylyfSet = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* ignore */ } };
export async function ssoFromSkylyf(): Promise<any | null> {
  const call = (at: string) =>
    fetch(`${API_BASE}/auth/sso`, { method: "POST", headers: { Authorization: `Bearer ${at}` } });
  let at = skylyf("at");
  if (!at) return null;
  let res = await call(at).catch(() => null);
  if (res?.status === 401 && skylyf("rt")) {
    const r = await fetch(`${ORIGIN}/api/v1/auth/refresh`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken: skylyf("rt") }),
    }).then((x) => x.json()).catch(() => null);
    if (r?.success) {
      skylyfSet("at", r.data.accessToken); skylyfSet("rt", r.data.refreshToken);
      res = await call(r.data.accessToken).catch(() => null);
    }
  }
  if (!res?.ok) return null;
  return (await res.json()).data;
}

export const photoUrl = (path: string) => API_BASE + path;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

function setToken(token: string): void {
  localStorage.setItem("token", token);
}

function removeToken(): void {
  localStorage.removeItem("token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
      localStorage.removeItem("user");
      window.location.href = "/crm/login";
    }
    throw new ApiError(data.message || "Something went wrong", response.status);
  }

  return data;
}

export const authAPI = {
  login: (email: string, password: string) =>
    request<{ success: boolean; data: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (userData: {
    name: string;
    email: string;
    password: string;
    role?: string;
    phone?: string;
    department?: string;
  }) =>
    request<{ success: boolean; data: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  getMe: () => request<{ success: boolean; data: any }>("/auth/me"),

  updateProfile: (updates: {
    name?: string;
    phone?: string;
    department?: string;
  }) =>
    request<{ success: boolean; data: any }>("/auth/me", {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; data: any }>("/auth/change-password", {
      method: "PUT",
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

export const usersAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(
      `/users${query}`,
    );
  },

  getById: (id: string) =>
    request<{ success: boolean; data: any }>(`/users/${id}`),

  permissions: () =>
    request<{ success: boolean; data: import("@/config/permissions").PermInfo }>("/users/permissions"),

  setRolePermissions: (role: string, permissions: string[] | null) =>
    request<{ success: boolean }>(`/users/permissions/${role}`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }),

  create: (userData: any) =>
    request<{ success: boolean; data: any }>("/users", {
      method: "POST",
      body: JSON.stringify(userData),
    }),

  update: (id: string, updates: any) =>
    request<{ success: boolean; data: any }>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}`, {
      method: "DELETE",
    }),

  updateAutoAssign: (userIds: string[]) =>
    request<{ success: boolean; message: string }>("/users/auto-assign", {
      method: "POST",
      body: JSON.stringify({ userIds }),
    }),
};

export const servicesAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(
      `/services${query}`,
    );
  },

  getById: (id: string) =>
    request<{ success: boolean; data: any }>(`/services/${id}`),

  create: (serviceData: any) =>
    request<{ success: boolean; data: any }>("/services", {
      method: "POST",
      body: JSON.stringify(serviceData),
    }),

  update: (id: string, updates: any) =>
    request<{ success: boolean; data: any }>(`/services/${id}`, {
      method: "PUT",
      body: JSON.stringify(updates),
    }),

  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/services/${id}`, {
      method: "DELETE",
    }),
};

export { getToken, setToken, removeToken, ApiError };

export const factoryAPI = {
  getInventory: () =>
    request<{ success: boolean; count: number; data: any[] }>(
      "/factory/inventory",
    ),

  addReel: (data: {
    company: string;
    reelWeight: number;
    reelSize: string;
    entryDate?: string;
  }) =>
    request<{ success: boolean; data: any }>("/factory/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getFactoryProducts: () =>
    request<{ success: boolean; count: number; data: any[] }>(
      "/factory/products",
    ),

  addFactoryProduct: (data: { name: string; description?: string }) =>
    request<{ success: boolean; data: any }>("/factory/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPrintingLogs: () =>
    request<{ success: boolean; count: number; data: any[] }>(
      "/factory/printing",
    ),

  addPrintingLog: (data: {
    reelId: string;
    productId: string;
    printDate?: string;
  }) =>
    request<{ success: boolean; data: any }>("/factory/printing", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getReports: (params?: { startDate?: string; endDate?: string }) => {
    const query = params
      ? "?" + new URLSearchParams(params as any).toString()
      : "";
    return request<{ success: boolean; data: any }>(`/factory/reports${query}`);
  },
};

export const activityAPI = {
  getLogs: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{
      success: boolean;
      count: number;
      total: number;
      page: number;
      pages: number;
      data: any[];
    }>(`/activity${query}`);
  },

  getStats: () => request<{ success: boolean; data: any }>("/activity/stats"),
};

export const settingsAPI = {
  get: () => request<{ success: boolean; data: any }>("/settings"),

  update: (settings: any) =>
    request<{ success: boolean; data: any }>("/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
};

export interface WooResult {
  pushed: boolean;
  reason?: string;
  imageSkipped?: boolean;
}
export interface BulkRowResult {
  row: number;
  partName: string;
  status: "create" | "update" | "created" | "updated" | "error";
  message: string;
  woo?: "pushed" | "failed";
}

export const sparePartsAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(
      `/spare-parts${query}`,
    );
  },
  getById: (id: string) =>
    request<{ success: boolean; data: any }>(`/spare-parts/${id}`),
  create: (data: any) =>
    request<{ success: boolean; data: any; woo?: WooResult }>("/spare-parts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: string, data: any) =>
    request<{ success: boolean; data: any; woo?: WooResult }>(`/spare-parts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/spare-parts/${id}`, {
      method: "DELETE",
    }),
  uploadImage: async (id: string, file: File) => {
    const body = new FormData();
    body.append("image", file);
    const token = getToken();
    const response = await fetch(`${API_BASE}/spare-parts/${id}/image`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(json.message || "Photo upload failed", response.status);
    return json as { success: boolean; data: any; woo?: WooResult };
  },
  bulkUpdate: (
    ids: string[],
    body: {
      changes: Record<string, string | number>;
      stock?: { mode: "add" | "set"; value: number };
    },
  ) =>
    request<{ success: boolean; data: { matched: number; modified: number } }>(
      "/spare-parts/bulk-update",
      { method: "POST", body: JSON.stringify({ ids, ...body }) },
    ),
  bulkDelete: (ids: string[]) =>
    request<{ success: boolean; data: { deleted: number } }>(
      "/spare-parts/bulk-delete",
      { method: "POST", body: JSON.stringify({ ids }) },
    ),
  bulkImport: (rows: Record<string, unknown>[], opts: { dryRun?: boolean; pushToWoo?: boolean } = {}) =>
    request<{ success: boolean; data: BulkRowResult[] }>("/spare-parts/bulk", {
      method: "POST",
      body: JSON.stringify({ rows, ...opts }),
    }),
  adjustStock: (id: string, adjustment: number, reason?: string) =>
    request<{ success: boolean; data: any }>(`/spare-parts/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ adjustment, reason }),
    }),
  lookup: (code: string) =>
    request<{ success: boolean; data: any }>(
      `/spare-parts/lookup/${encodeURIComponent(code)}`,
    ),
  backfillBarcodes: () =>
    request<{ success: boolean; updated: number }>(
      "/spare-parts/barcodes/backfill",
      { method: "POST" },
    ),
  issue: (id: string, data: any) =>
    request<{ success: boolean; data: { movement: any; part: any } }>(
      `/spare-parts/${id}/issue`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  returnPart: (id: string, data: any) =>
    request<{ success: boolean; data: { movement: any; part: any } }>(
      `/spare-parts/${id}/return`,
      { method: "POST", body: JSON.stringify(data) },
    ),
  getMovements: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(
      `/spare-parts/movements${query}`,
    );
  },
  // Paid client service requests that still have spare parts to hand out
  serviceRequests: () =>
    request<{ success: boolean; data: ServiceRequestToIssue[] }>("/spare-parts/service-requests"),
};

export interface ServiceRequestToIssue {
  id: string;
  number: string;
  company: string;
  technician: string;
  machines: string;
  parts: { name: string; sku?: string; wooId?: number; qty: number; issuedQty: number; remaining: number }[];
}

export interface Rack {
  _id: string;
  code: string;
  description?: string;
  partCount: number;
}

export const racksAPI = {
  getAll: () =>
    request<{
      success: boolean;
      data: Rack[];
      unlisted: { code: string; partCount: number }[];
    }>("/racks"),
  create: (data: { code: string; description?: string }) =>
    request<{ success: boolean; data: any }>("/racks", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createMany: (codes: string[]) =>
    request<{ success: boolean; skipped: number }>("/racks", {
      method: "POST",
      body: JSON.stringify({ codes }),
    }),
  update: (id: string, data: { code?: string; description?: string }) =>
    request<{ success: boolean; data: any; moved: number }>(`/racks/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>(`/racks/${id}`, { method: "DELETE" }),
};

export interface PipelineStage {
  name: string;
  assignee: string | null;
  assigneeName: string;
}

export const pipelineAPI = {
  get: () =>
    request<{
      success: boolean;
      data: { stages: PipelineStage[]; configured: boolean };
    }>("/pipeline"),
  save: (
    stages: { name: string; assignee: string | null }[],
    applyToOpen: boolean,
  ) =>
    request<{ success: boolean; updatedStages: number }>("/pipeline", {
      method: "PUT",
      body: JSON.stringify({ stages, applyToOpen }),
    }),
};

export const wooSyncAPI = {
  sync: () =>
    request<{
      success: boolean;
      data: {
        added: number;
        updated: number;
        skipped: number;
        errors: string[];
      };
    }>("/spare-parts/sync/woocommerce", { method: "POST" }),
  status: () =>
    request<{
      success: boolean;
      data: {
        totalLinked: number;
        lastSyncedAt: string | null;
        wooConfigured: boolean;
      };
    }>("/spare-parts/sync/status"),
  getCategories: () =>
    request<{ success: boolean; data: string[] }>(
      "/spare-parts/woo-categories",
    ),
};

export const machinesAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(`/machines${query}`);
  },
  getById: (id: string) => request<{ success: boolean; data: any }>(`/machines/${id}`),
  create: (data: any) =>
    request<{ success: boolean; data: any }>("/machines", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ success: boolean; data: any }>(`/machines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/machines/${id}`, { method: "DELETE" }),
  setQualityCheck: (id: string, checkId: string, data: { result: string; note?: string }) =>
    request<{ success: boolean; data: any }>(`/machines/${id}/qc/${checkId}`, { method: "POST", body: JSON.stringify(data) }),
  seedQualityChecks: (id: string) =>
    request<{ success: boolean; data: any }>(`/machines/${id}/qc/seed`, { method: "POST" }),
  getAssignees: () =>
    request<{ success: boolean; data: { _id: string; name: string; role: string }[] }>("/machines/assignees"),
  // Multipart (photos), so it can't go through request(), which forces a JSON content type
  updateStage: async (
    id: string,
    stageId: string,
    data: { status: string; progress?: number; note?: string; photos: File[] },
  ) => {
    const body = new FormData();
    body.append("status", data.status);
    body.append("progress", String(data.progress ?? 0));
    body.append("note", data.note ?? "");
    data.photos.forEach((f) => body.append("photos", f));
    const token = getToken();
    const response = await fetch(`${API_BASE}/machines/${id}/stages/${stageId}/update`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body,
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new ApiError(json.message || "Upload failed", response.status);
    return json as { success: boolean; data: any };
  },
};

export interface BomTemplate {
  _id: string;
  name: string;
  type: string;
  parts: { part: string; quantity: number }[];
}

export const bomAPI = {
  getAll: () => request<{ success: boolean; data: BomTemplate[] }>("/bom-templates"),
  saveFromMachine: (name: string, fromMachine: string, type?: string) =>
    request<{ success: boolean; data: BomTemplate }>("/bom-templates", { method: "POST", body: JSON.stringify({ name, fromMachine, type }) }),
  delete: (id: string) => request<{ success: boolean }>(`/bom-templates/${id}`, { method: "DELETE" }),
};

export interface Vendor { _id: string; name: string; category: string; contactPerson: string; phone: string; email: string; address: string; city: string; gstin: string; paymentTerms: string; notes: string }
export interface OrderLine { _id?: string; part?: string | null; kind?: "machine" | "material"; machine?: string | null; description: string; unit: string; quantity: number; receivedQty?: number; rate?: number; price?: number; gstRate: number }
export interface PurchaseOrder { _id: string; poNo: string; poDate: string; vendor: string; vendorName: string; expectedDate: string | null; status: string; items: OrderLine[]; subtotal: number; tax: number; total: number; notes: string }
export interface SalesOrder { _id: string; soNo: string; orderDate: string; client: string; clientName: string; deliveryDate: string | null; salesPerson: string; status: string; items: OrderLine[]; subtotal: number; tax: number; total: number; stockDeducted: boolean; notes: string }
export interface Inward { _id: string; grnNo: string; inwardDate: string; poNo: string; purchaseOrder: string | null; vendorName: string; invoiceNo: string; vehicleNo: string; receivedBy: string; items: { part: string; partName: string; quantity: number; rate: number }[]; total: number; notes: string }

const crud = <T,>(path: string) => ({
  getAll: () => request<{ success: boolean; data: T[] }>(path),
  create: (data: unknown) => request<{ success: boolean; data: T }>(path, { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<{ success: boolean; data: T }>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) => request<{ success: boolean }>(`${path}/${id}`, { method: "DELETE" }),
});
export interface Dispatch { _id: string; dispatchNo: string; type: "Outward" | "Return"; date: string; clientName: string; soNo: string; machineNo: string; vehicleNo: string; driverName: string; lrNo: string; returnReason: string; items: { part?: string | null; description: string; unit: string; quantity: number; rate: number }[]; totalQty: number; totalAmount: number }
export interface PriceRow { _id: string; listType: "purchase" | "selling"; part: string; partName: string; vendor: string | null; client: string | null; partyName: string; unitPrice: number; moq: number; leadTimeDays: number; effectiveFrom: string; active: boolean; notes: string }
export const dispatchAPI = crud<Dispatch>("/dispatch");
export const pricesAPI = crud<PriceRow>("/prices");
export const analyticsAPI = {
  machines: (months = 12) => request<{ success: boolean; data: any }>(`/analytics/machines?months=${months}`),
  partsSales: (months = 12) => request<{ success: boolean; data: any }>(`/analytics/parts-sales?months=${months}`),
  stockFlow: (days = 30) => request<{ success: boolean; data: any }>(`/analytics/stock-flow?days=${days}`),
};

export interface ExpenseRow { _id: string; date: string; category: string; amount: number; description: string; machine: string | null; machineNo: string; paidTo: string; paymentMode: string; reference: string }
export const financeAPI = {
  summary: (months = 12) => request<{ success: boolean; data: any }>(`/finance/summary?months=${months}`),
  machines: () => request<{ success: boolean; data: any }>("/finance/machines"),
  machine: (id: string) => request<{ success: boolean; data: any }>(`/finance/machines/${id}`),
  expenses: (params: Record<string, string> = {}) => request<{ success: boolean; data: ExpenseRow[]; categories: string[] }>(`/finance/expenses?${new URLSearchParams(params)}`),
  saveExpense: (data: unknown, id?: string) => request<{ success: boolean; data: ExpenseRow }>(id ? `/finance/expenses/${id}` : "/finance/expenses", { method: id ? "PUT" : "POST", body: JSON.stringify(data) }),
  deleteExpense: (id: string) => request<{ success: boolean }>(`/finance/expenses/${id}`, { method: "DELETE" }),
  payroll: (month: string) => request<{ success: boolean; data: any }>(`/finance/payroll?month=${month}`),
  pay: (data: unknown) => request<{ success: boolean; data: any }>("/finance/payroll/pay", { method: "POST", body: JSON.stringify(data) }),
  deletePayment: (id: string) => request<{ success: boolean }>(`/finance/payroll/payments/${id}`, { method: "DELETE" }),
};

export const vendorsAPI = crud<Vendor>("/vendors");
export const purchaseOrdersAPI = crud<PurchaseOrder>("/purchase-orders");
export const salesOrdersAPI = crud<SalesOrder>("/sales-orders");
export const inwardAPI = crud<Inward>("/material-inward");

export const clientsAPI = {
  getAll: (params?: Record<string, string>) => {
    const query = params ? "?" + new URLSearchParams(params).toString() : "";
    return request<{ success: boolean; count: number; data: any[] }>(`/clients${query}`);
  },
  create: (data: any) =>
    request<{ success: boolean; data: any }>("/clients", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<{ success: boolean; data: any }>(`/clients/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean; message: string }>(`/clients/${id}`, { method: "DELETE" }),
};

export interface MaterialNeedRow {
  part: string;
  partName: string;
  partNumber: string;
  supplier: string;
  unit: string;
  unitPrice: number;
  required: number;
  inStock: number;
  shortage: number;
  estCost: number;
  machines: { _id: string; machineNo: string; name: string; quantity: number; targetDate: string | null }[];
}

export interface StatRow {
  name: string;
  done: number;
  open: number;
  late: number;
  blocked: number;
  avgDays: number;
}

export interface ProductionAnalytics {
  days: number;
  active: number;
  overdue: number;
  blocked: number;
  delivered: number;
  onTimeRate: number | null;
  avgLeadDays: number | null;
  qcPending: number;
  qcFailed: number;
  stages: StatRow[];
  people: StatRow[];
  bottleneck: StatRow | null;
  blockedList: { machineId: string; machineNo: string; machine: string; stage: string; assignee: string; reason: string; since: string | null }[];
}

export const productionAPI = {
  materialNeeds: () =>
    request<{ success: boolean; data: { rows: MaterialNeedRow[]; shortParts: number; estCost: number } }>("/production/material-needs"),
  analytics: (days = 90) => request<{ success: boolean; data: ProductionAnalytics }>(`/production/analytics?days=${days}`),
};
