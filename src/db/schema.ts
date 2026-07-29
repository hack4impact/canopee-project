import { pgTable, pgEnum, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["volunteer", "pro", "admin"]);

export const statusEnum = pgEnum("status", ["pending", "approved", "rejected"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  authUserId: uuid("auth_user_id").notNull().unique(),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("volunteer"),
  status: statusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core'

// export const users = pgTable('users', {
//   id: serial('id').primaryKey(),
//   fullName: text('full_name'),
//   phone: varchar('phone', { length: 256 }),
// })
