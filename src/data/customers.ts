import { getDb } from "./db";
import { generateId } from "@/lib/id";
import { enqueueSync } from "@/sync/queue";
import { Customer } from "./types";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  save_as_contact: number;
  created_at: string;
  updated_at: string;
};

function fromRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    postalCode: row.postal_code,
    city: row.city,
    saveAsContact: !!row.save_as_contact,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function searchCustomers(query: string): Promise<Customer[]> {
  const db = await getDb();
  const like = `%${query.trim()}%`;
  const rows = await db.getAllAsync<CustomerRow>(
    `SELECT * FROM customers WHERE name LIKE ? ORDER BY name ASC LIMIT 20`,
    [like]
  );
  return rows.map(fromRow);
}

export type NewCustomerInput = {
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  saveAsContact: boolean;
};

export async function createCustomer(input: NewCustomerInput): Promise<Customer> {
  const db = await getDb();
  const now = new Date().toISOString();
  const customer: Customer = {
    id: generateId(),
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    postalCode: input.postalCode ?? null,
    city: input.city ?? null,
    saveAsContact: input.saveAsContact,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO customers (id, name, phone, email, address, postal_code, city, save_as_contact, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      customer.id,
      customer.name,
      customer.phone,
      customer.email,
      customer.address,
      customer.postalCode,
      customer.city,
      customer.saveAsContact ? 1 : 0,
      customer.createdAt,
      customer.updatedAt,
    ]
  );

  await enqueueSync("customer", customer.id, "create", customer);
  return customer;
}
