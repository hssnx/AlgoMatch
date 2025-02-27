"use client";
import { useState } from "react";
import { type Category, type Candidate } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, X as XIcon } from "lucide-react";
import { Collapse } from "react-collapse";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getCandidates, saveCandidates } from "@/lib/localStorageService";

type Props = {
  categories: Category[];
  candidates: Candidate[];
};

function calculateCategoryScore(
  candidate: Candidate,
  category: Category,
  categories: Category[],
): number {
  const subcategories = categories.filter(c => c.parentId === category.id);
  if (subcategories.length === 0) {
    return candidate.ratings[category.id] || 0;
  }
  const totalSubWeight = subcategories.reduce((sum, sub) => sum + (sub.weight ?? 0), 0);
  return subcategories.reduce((total, sub) => {
    const rating = candidate.ratings[sub.id] || 0;
    return total + (rating * ((sub.weight ?? 0) / totalSubWeight));
  }, 0);
}

function calculateTotalScore(candidate: Candidate, categories: Category[]): number {
  const mainCategories = categories.filter(c => !c.parentId);
  const mainCategoriesWithWeights = mainCategories.map(cat => {
    const subs = categories.filter(c => c.parentId === cat.id);
    const effectiveWeight = subs.reduce((sum, sub) => sum + (sub.weight ?? 0), 0);
    return { category: cat, effectiveWeight };
  });
  const totalEffectiveWeight = mainCategoriesWithWeights.reduce(
    (sum, { effectiveWeight }) => sum + effectiveWeight,
    0,
  );
  return mainCategoriesWithWeights.reduce((total, { category, effectiveWeight }) => {
    const categoryScore = calculateCategoryScore(candidate, category, categories);
    const normalizedWeight =
      totalEffectiveWeight > 0 ? (effectiveWeight / totalEffectiveWeight) * 100 : 0;
    return total + (categoryScore * normalizedWeight) / 100;
  }, 0);
}

export function ComparisonView({ categories, candidates }: Props) {
  const [expandedMainCategories, setExpandedMainCategories] = useState<Record<number, boolean>>({});
  const toggleMainCategory = (categoryId: number) => {
    setExpandedMainCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const [candidateToDelete, setCandidateToDelete] = useState<Candidate | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const candidates = getCandidates();
      const updatedCandidates = candidates.filter(c => c.id !== id);
      saveCandidates(updatedCandidates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  if (candidates.length === 0) {
    return (
      <div className="text-center text-muted-foreground">
        No candidates added yet
      </div>
    );
  }

  const candidatesWithScores = candidates
    .map(candidate => ({
      ...candidate,
      score: calculateTotalScore(candidate, categories),
    }))
    .sort((a, b) => b.score - a.score);

  const mainCategories = categories.filter(c => !c.parentId);
  const getSubcategories = (parentId: number) =>
    categories.filter(c => c.parentId === parentId);
  const totalEffectiveWeight = mainCategories.reduce((sum, cat) => {
    const subs = getSubcategories(cat.id);
    const effective = subs.reduce((s, sub) => s + (sub.weight ?? 0), 0);
    return sum + effective;
  }, 0);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidatesWithScores.map(candidate => (
          <Card key={candidate.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-semibold text-lg">{candidate.name}</span>
                  <span className="text-sm text-muted-foreground">
                    Overall Score: {candidate.score.toFixed(1)}
                  </span>
                </div>
                <button
                  onClick={() => setCandidateToDelete(candidate)}
                  className="text-red-500 hover:text-red-700"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {mainCategories.map(category => {
                  const categoryScore = calculateCategoryScore(candidate, category, categories);
                  const subs = getSubcategories(category.id);
                  const effectiveWeight = subs.reduce((sum, sub) => sum + (sub.weight ?? 0), 0);
                  const normalizedWeight =
                    totalEffectiveWeight > 0 ? (effectiveWeight / totalEffectiveWeight) * 100 : 0;
                  const weightedScore = (categoryScore * normalizedWeight) / 100;

                  return (
                    <div key={category.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium">
                        <div className="flex items-center">
                          {subs.length > 0 && (
                            <button
                              onClick={() => toggleMainCategory(category.id)}
                              className="mr-2 focus:outline-none"
                            >
                              <ChevronRight
                                className={`w-4 h-4 transition-transform duration-300 ${
                                  expandedMainCategories[category.id] ? "rotate-90" : ""
                                }`}
                              />
                            </button>
                          )}
                          <span>{category.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {categoryScore.toFixed(1)}/10 × {normalizedWeight.toFixed(1)}% ={" "}
                          {weightedScore.toFixed(1)}
                        </span>
                      </div>
                      <Progress value={categoryScore * 10} />
                      <Collapse isOpened={expandedMainCategories[category.id] || false}>
                        <div className="ml-4 space-y-2 pt-1">
                          {subs.map(sub => {
                            const rating = candidate.ratings[sub.id] || 0;
                            const totalSubWeight = subs.reduce(
                              (sum, s) => sum + (s.weight ?? 0),
                              0,
                            );
                            const normalizedSubWeight =
                              totalSubWeight > 0 ? ((sub.weight ?? 0) / totalSubWeight) * 100 : 0;
                            return (
                              <div key={sub.id} className="space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-1 text-muted-foreground">
                                    <ChevronRight className="w-3 h-3" />
                                    <span>{sub.name}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {rating}/10 × {normalizedSubWeight.toFixed(1)}%
                                  </span>
                                </div>
                                <Progress value={rating * 10} className="h-2" />
                              </div>
                            );
                          })}
                        </div>
                      </Collapse>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {candidateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded shadow-lg p-6 w-80">
            <h2 className="text-lg font-semibold mb-4">
              Confirm Deletion
            </h2>
            <p className="text-sm mb-6">
              Are you sure you want to delete this candidate <span className="font-medium">{candidateToDelete.name}</span>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setCandidateToDelete(null)}
                className="px-4 py-2 border rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteMutation.mutate(candidateToDelete.id);
                  setCandidateToDelete(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ComparisonView;
