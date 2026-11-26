export interface StageUpdateRow {
  _id: string;
  byName?: string;
  status: string;
  progress: number;
  note?: string;
  photos?: string[];
  at: string;
}

export interface StageRow {
  _id: string;
  name: string;
  assignee?: string;
  assigneeName?: string;
  dueDate?: string | null;
  status: "pending" | "in_progress" | "completed" | "blocked";
  progress: number;
  updates?: StageUpdateRow[];
}

export interface MachineRow {
  _id: string;
  machineNumber?: string;
  machineNo?: string;
  name: string;
  customer?: string;
  targetDate?: string | null;
  progress?: number;
  status?: string;
  clientName?: string;
  blocked?: boolean;
  overdue?: boolean;
  stages?: StageRow[];
}

export const machineCode = (m: MachineRow) => m.machineNumber ?? m.machineNo ?? "";

export const STATUS_LABEL: Record<StageRow["status"], string> = {
  pending: "Not started",
  in_progress: "In progress",
  completed: "Done",
  blocked: "Blocked",
};

export const STATUS_STYLE: Record<StageRow["status"], string> = {
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/10 text-primary",
  completed: "bg-success/10 text-success",
  blocked: "bg-destructive/10 text-destructive",
};

export const isOverdue = (due?: string | null, status?: string) =>
  !!due && status !== "completed" && new Date(due).getTime() < new Date().setHours(0, 0, 0, 0);

// Machine pipeline status dots: neutral ramp, the accent for work in progress, green for ready.
export const STATUS_DOT: Record<string, string> = {
  Planned: "bg-foreground/20",
  "Under Construction": "bg-primary",
  Testing: "bg-primary/50",
  Ready: "bg-success",
  Delivered: "bg-foreground/70",
  "In Service": "bg-foreground",
};
