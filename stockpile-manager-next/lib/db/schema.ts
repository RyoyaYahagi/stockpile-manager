import { pgTable, uuid, text, integer, date, boolean, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 家族（グループ）テーブル
export const families = pgTable('families', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    inviteCode: text('invite_code').unique().notNull(),
    lineGroupId: text('line_group_id'),
    createdAt: timestamp('created_at').defaultNow(),
});

// ユーザーテーブル
export const users = pgTable('users', {
    id: text('id').primaryKey(), // Auth provider の user ID
    familyId: uuid('family_id').references(() => families.id, { onDelete: 'set null' }),
    displayName: text('display_name'),
    email: text('email'),
    lineUserId: text('line_user_id'),
    createdAt: timestamp('created_at').defaultNow(),
});

// 袋テーブル
export const bags = pgTable('bags', {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
});

// 備蓄品テーブル
export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    familyId: uuid('family_id').notNull().references(() => families.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    quantity: integer('quantity').default(1),
    expiryDate: date('expiry_date'),
    bagId: uuid('bag_id').references(() => bags.id, { onDelete: 'set null' }),
    locationNote: text('location_note'),
    notified30: boolean('notified_30').default(false),
    notified7: boolean('notified_7').default(false),
    notified1: boolean('notified_1').default(false),
    createdAt: timestamp('created_at').defaultNow(),
});

// リレーション定義
export const familiesRelations = relations(families, ({ many }) => ({
    users: many(users),
    bags: many(bags),
    items: many(items),
}));

export const usersRelations = relations(users, ({ one }) => ({
    family: one(families, {
        fields: [users.familyId],
        references: [families.id],
    }),
}));

export const bagsRelations = relations(bags, ({ one, many }) => ({
    family: one(families, {
        fields: [bags.familyId],
        references: [families.id],
    }),
    items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
    family: one(families, {
        fields: [items.familyId],
        references: [families.id],
    }),
    bag: one(bags, {
        fields: [items.bagId],
        references: [bags.id],
    }),
}));

// 型エクスポート
export type Family = typeof families.$inferSelect;
export type User = typeof users.$inferSelect;
export type Bag = typeof bags.$inferSelect;
export type Item = typeof items.$inferSelect;
