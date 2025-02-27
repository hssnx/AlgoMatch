import { defaultCategories, defaultSubCategories } from "@shared/schema";
import { Candidate, Category } from "@shared/schema";

export function getCategories(): Category[] {
  const stored = localStorage.getItem("categories");
  if (stored) {
    return JSON.parse(stored);
  }
  // If no categories stored, return the combined default main and subcategories.
  return [...defaultCategories, ...defaultSubCategories];
}

export function saveCategories(categories: Category[]): void {
  localStorage.setItem("categories", JSON.stringify(categories));
}

export function getCandidates(): Candidate[] {
  const stored = localStorage.getItem("candidates");
  return stored ? JSON.parse(stored) : [];
}

export function saveCandidates(candidates: Candidate[]): void {
  localStorage.setItem("candidates", JSON.stringify(candidates));
}
