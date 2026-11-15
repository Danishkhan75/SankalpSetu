import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').notNull().default('donor'), // 'admin' | 'donor' | 'user'
  createdAt: timestamp('created_at').defaultNow(),
});

export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  registrationNo: text('registration_no').notNull().unique(),
  taxExemption80G: text('tax_exemption_80g').notNull(),
  verified: boolean('verified').notNull().default(false),
  ownerId: integer('owner_id')
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id')
    .references(() => organizations.id)
    .notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(),
  location: text('location').notNull(),
  applicantName: text('applicant_name').notNull().default('Gram Panchayat Beneficiary'),
  documentType: text('document_type').notNull().default('Aadhaar Card & Gram Panchayat Praman Patra'),
  documentId: text('document_id').notNull().default('DOC-GP-2026-001'),
  documentVerified: boolean('document_verified').notNull().default(true),
  returnOption: text('return_option').notNull().default('monthly'), // 'monthly' | 'yearly' | 'directly'
  returnDurationMonths: integer('return_duration_months').notNull().default(12),
  description: text('description').notNull(),
  impactLine: text('impact_line').notNull(),
  unitCost: integer('unit_cost').notNull(),
  unitImpact: text('unit_impact').notNull(),
  goalAmount: integer('goal_amount').notNull(),
  raisedAmount: integer('raised_amount').notNull().default(0),
  donorCount: integer('donor_count').notNull().default(0),
  status: text('status').notNull().default('live'), // 'draft' | 'live' | 'closed'
  verified: boolean('verified').notNull().default(true),
  deadline: text('deadline').notNull(),
  themeKey: text('theme_key').notNull().default('water'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const donations = pgTable('donations', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id)
    .notNull(),
  donorId: integer('donor_id').references(() => users.id),
  donorName: text('donor_name').notNull(),
  donorEmail: text('donor_email').notNull(),
  donorPhone: text('donor_phone').notNull(),
  panNumber: text('pan_number'),
  amount: integer('amount').notNull(),
  returnOption: text('return_option').notNull().default('directly'), // 'monthly' | 'yearly' | 'directly'
  status: text('status').notNull().default('pending'), // 'pending' | 'paid' | 'failed' | 'refunded'
  paymentMethod: text('payment_method').notNull().default('upi'),
  gatewayMode: text('gateway_mode').notNull().default('razorpay_test'),
  gatewayOrderId: text('gateway_order_id').notNull().unique(),
  gatewayPaymentId: text('gateway_payment_id').unique(),
  receiptNo: text('receipt_no').unique(),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const doctors = pgTable('doctors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  qualification: text('qualification').notNull(),
  specialization: text('specialization').notNull(),
  regNumber: text('reg_number').notNull().unique(),
  villageCenter: text('village_center').notNull(),
  phone: text('phone').notNull(),
  fee: integer('fee').notNull().default(300),
  available: boolean('available').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bloodDonations = pgTable('blood_donations', {
  id: serial('id').primaryKey(),
  donorName: text('donor_name').notNull(),
  bloodGroup: text('blood_group').notNull(), // 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-'
  requestType: text('request_type').notNull().default('donate_blood'), // 'donate_blood' | 'request_blood' | 'hire_doctor'
  villageName: text('village_name').notNull(),
  phone: text('phone').notNull(),
  age: integer('age').notNull().default(28),
  doctorId: integer('doctor_id').references(() => doctors.id),
  doctorName: text('doctor_name'),
  appointmentDate: text('appointment_date').notNull(),
  customFeePaid: integer('custom_fee_paid').notNull().default(0),
  documentId: text('document_id').notNull().default('AADHAAR-VERIFIED'),
  status: text('status').notNull().default('verified'), // 'pending' | 'verified' | 'completed'
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const campaignUpdates = pgTable('campaign_updates', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id)
    .notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: integer('target_id').notNull(),
  details: text('details').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  organizations: many(organizations),
  donations: many(donations),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  owner: one(users, {
    fields: [organizations.ownerId],
    references: [users.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [campaigns.organizationId],
    references: [organizations.id],
  }),
  donations: many(donations),
  updates: many(campaignUpdates),
}));

export const donationsRelations = relations(donations, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [donations.campaignId],
    references: [campaigns.id],
  }),
  donor: one(users, {
    fields: [donations.donorId],
    references: [users.id],
  }),
}));

export const campaignUpdatesRelations = relations(campaignUpdates, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignUpdates.campaignId],
    references: [campaigns.id],
  }),
}));
