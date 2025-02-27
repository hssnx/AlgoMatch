import { pgTable, text, serial, integer, real, jsonb } from "drizzle-orm/pg-core";
import { z } from "zod";

// Create the categories table (for backend/DB usage)
function createCategoriesTable() {
  return pgTable("categories", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    parentId: integer("parent_id"),
    weight: real("weight"),
  });
}

export const categories = createCategoriesTable();

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ratings: jsonb("ratings").notNull().$type<Record<number, number>>(), // categoryId -> rating
});

export const insertCategorySchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(100).optional(),
  parentId: z.number().nullable(),
});

export const insertCandidateSchema = z.object({
  name: z.string(),
  ratings: z.record(
    z.preprocess(val => Number(val), z.number()),
    z.preprocess(val => Number(val), z.number().min(0).max(10))
  ),
});

export type Category = {
  id: number;
  name: string;
  parentId: number | null;
  weight?: number | undefined;
};

export type Candidate = {
  id: number;
  name: string;
  ratings: Record<number, number>;
};

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type InsertCandidate = z.infer<typeof insertCandidateSchema>;

export const defaultCategories: Category[] = [
  { id: 1, name: "🕌 Religion & Beliefs", weight: 0, parentId: null },
  { id: 2, name: "🏡 Family Background", weight: 0, parentId: null },
  { id: 3, name: "🧠 Personality & Intelligence", weight: 0, parentId: null },
  { id: 4, name: "🎓 Education & Ambition", weight: 0, parentId: null },
  { id: 5, name: "👶 Parenting Potential", weight: 0, parentId: null },
  { id: 6, name: "🎬 Lifestyle Compatibility", weight: 0, parentId: null },
];

export const defaultSubCategories: Category[] = [
  { id: 7, name: "Religious Knowledge", weight: 50, parentId: 1 },
  { id: 8, name: "Religious Practice", weight: 50, parentId: 1 },
  { id: 9, name: "Religious Openness", weight: 50, parentId: 1 },
  { id: 10, name: "Family Reputation", weight: 50, parentId: 2 },
  { id: 11, name: "Cultural Alignment", weight: 50, parentId: 2 },
  { id: 12, name: "Socioeconomic Background", weight: 50, parentId: 2 },
  { id: 13, name: "Curiosity & Learning", weight: 50, parentId: 3 },
  { id: 14, name: "Emotional Regulation", weight: 50, parentId: 3 },
  { id: 15, name: "Depth of Conversation", weight: 50, parentId: 3 },
  { id: 16, name: "Adaptability", weight: 50, parentId: 3 },
  { id: 17, name: "Current Education Level", weight: 50, parentId: 4 },
  { id: 18, name: "Future Education Plans", weight: 50, parentId: 4 },
  { id: 19, name: "Career Ambition", weight: 50, parentId: 4 },
  { id: 20, name: "Vision for Impact", weight: 50, parentId: 4 },
  { id: 21, name: "Parenting Philosophy", weight: 50, parentId: 5 },
  { id: 22, name: "Co-parenting Attitude", weight: 50, parentId: 5 },
  { id: 23, name: "Balance of Tradition & Modernity", weight: 50, parentId: 5 },
  { id: 24, name: "Media Preferences", weight: 50, parentId: 6 },
  { id: 25, name: "Western Culture Openness", weight: 50, parentId: 6 },
  { id: 26, name: "Daily Lifestyle Similarity", weight: 50, parentId: 6 },
];
