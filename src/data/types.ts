export type JobKind = "customer_job" | "project";
export type JobStatus = "later" | "tomorrow" | "ongoing" | "done";
export type Priority = "normal" | "high" | "urgent";
export type WorkType =
  | "service"
  | "new_install"
  | "measurement"
  | "switchboard"
  | "charging"
  | "lighting";

export type Customer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  saveAsContact: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Job = {
  id: string;
  customerId: string;
  kind: JobKind;
  title: string;
  workType: WorkType | null;
  description: string | null;
  plannedAt: string | null;
  priority: Priority;
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
};

export type JobWithCustomer = Job & {
  customerName: string;
  customerAddress: string | null;
};

export type TimeSession = {
  id: string;
  date: string; // YYYY-MM-DD, local day the session belongs to
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
};
