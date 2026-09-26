import { Customer, JobKind, Priority, WorkType } from "@/data/types";

export type CreationMethod = "photo" | "voice" | "manual";

export type NewCustomerDraft = {
  name: string;
  phone: string;
  email: string;
  address: string;
  postalCode: string;
  city: string;
  saveAsContact: boolean;
};

export const emptyNewCustomerDraft: NewCustomerDraft = {
  name: "",
  phone: "",
  email: "",
  address: "",
  postalCode: "",
  city: "",
  saveAsContact: true,
};

export type NewJobDraft = {
  kind: JobKind | null;
  method: CreationMethod | null;
  existingCustomer: Customer | null;
  newCustomer: NewCustomerDraft;
  title: string;
  workType: WorkType | null;
  description: string;
  plannedAt: Date | null;
  priority: Priority;
};

export const emptyNewJobDraft: NewJobDraft = {
  kind: null,
  method: null,
  existingCustomer: null,
  newCustomer: emptyNewCustomerDraft,
  title: "",
  workType: null,
  description: "",
  plannedAt: null,
  priority: "normal",
};

export function customerLabel(draft: NewJobDraft): string {
  if (draft.existingCustomer) return draft.existingCustomer.name;
  return draft.newCustomer.name.trim();
}

export function customerAddressLabel(draft: NewJobDraft): string {
  if (draft.existingCustomer) return draft.existingCustomer.address ?? "";
  return draft.newCustomer.address.trim();
}
