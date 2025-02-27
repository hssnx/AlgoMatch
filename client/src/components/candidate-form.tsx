"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { type Category, insertCandidateSchema } from "@shared/schema";
import { ChevronRight, AlertCircle } from "lucide-react";
import { Collapse } from "react-collapse";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCandidates, saveCandidates } from "@/lib/localStorageService";

type Props = {
  categories: Category[];
};

const RATING_SUGGESTIONS = [0, 2.5, 5, 7.5, 10];

export function CandidateForm({ categories }: Props) {
  const { toast } = useToast();

  // Only initialize ratings for subcategories
  const subcategoryIds = categories.filter(c => c.parentId !== null).map(c => c.id);
  const initialRatings = Object.fromEntries(subcategoryIds.map(id => [id, 5]));

  const form = useForm({
    resolver: zodResolver(insertCandidateSchema),
    defaultValues: {
      name: "",
      ratings: initialRatings,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; ratings: Record<number, number> }) => {
      const candidates = getCandidates();
      const newId = Math.max(0, ...candidates.map(c => c.id)) + 1;
      const newCandidate = { ...data, id: newId };
      const updatedCandidates = [...candidates, newCandidate];
      saveCandidates(updatedCandidates);
      return newCandidate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      // Reset the form with initial ratings
      form.reset({ name: "", ratings: initialRatings });
      toast({
        title: "Candidate added",
        description: "The candidate has been added successfully.",
      });
    },
  });

  const onSubmit = (data: { name: string; ratings: Record<number, number> }) => {
    // Ensure ratings are numbers
    const ratings = Object.fromEntries(
      Object.entries(data.ratings).map(([key, value]) => [Number(key), Number(value)])
    );
    createMutation.mutate({ ...data, ratings });
  };

  // Get main categories and subcategories
  const mainCategories = categories.filter(c => !c.parentId);
  const getSubcategories = (parentId: number) =>
    categories.filter(c => c.parentId === parentId);

  const totalMainWeight = mainCategories.reduce((sum, category) => {
    const subs = getSubcategories(category.id);
    return sum + subs.reduce((acc, sub) => acc + (sub.weight ?? 0), 0);
  }, 0);

  // Toggle state for category expansion
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Candidate Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* General warning message */}
        <Alert variant="default" className="bg-muted">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The total weight from the main categories is {totalMainWeight}%. This weight will be normalized during the scoring process. All candidate scores are calculated from subcategories and their corresponding weights.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          {mainCategories.map(category => {
            const subcategories = getSubcategories(category.id);
            const totalSubWeight = subcategories.reduce(
              (sum, sub) => sum + (sub.weight ?? 0),
              0
            );

            return (
              <div key={category.id} className="space-y-2">
                {/* Main Category Header */}
                <div
                  className="flex items-center justify-between p-2 bg-muted rounded-md cursor-pointer h-12"
                  onClick={() => toggleCategory(category.id)}
                >
                  <div className="flex items-center">
                    {subcategories.length > 0 && (
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-300 ${
                          expandedCategories[category.id] ? "rotate-90" : ""
                        }`}
                      />
                    )}
                    <span className="font-medium ml-2">{category.name}</span>
                  </div>
                </div>

                {/* Collapsible Subcategories */}
                <Collapse isOpened={expandedCategories[category.id] || false}>
                  <div className="ml-6 space-y-4">
                    {subcategories.map(sub => {
                      const portionWithin = totalSubWeight > 0 
                        ? ((sub.weight ?? 0) / totalSubWeight * 100).toFixed(1)
                        : "0.0";
                      const overallContribution = totalMainWeight > 0 
                        ? ((sub.weight ?? 0) / totalMainWeight * 100).toFixed(1)
                        : "0.0";

                      return (
                        <FormField
                          key={sub.id}
                          control={form.control}
                          name={`ratings.${sub.id}`}
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center gap-1">
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <FormLabel className="text-muted-foreground">
                                  {sub.name} represents {portionWithin}% of {category.name}, and {overallContribution}% of overall score.
                                </FormLabel>
                              </div>
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    max="10"
                                    step="0.5"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={e => field.onChange(Number(e.target.value))}
                                    className="w-full"
                                  />
                                </FormControl>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-muted-foreground">
                                    Suggested values:
                                  </span>
                                  {RATING_SUGGESTIONS.map(value => (
                                    <Button
                                      key={value}
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="px-2 py-1 h-auto text-xs"
                                      onClick={() => field.onChange(Number(value))}
                                    >
                                      {value}
                                    </Button>
                                  ))}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                </Collapse>
              </div>
            );
          })}
        </div>

        <Button 
          type="submit" 
          className="w-full"
          disabled={createMutation.isPending}
        >
          Add Candidate
        </Button>
      </form>
    </Form>
  );
}

export default CandidateForm;
