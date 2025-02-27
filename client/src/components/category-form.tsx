"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, X, Pencil, ChevronRight, AlertCircle } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { type Category, insertCategorySchema } from "@shared/schema";
import * as z from "zod";
import { Collapse } from "react-collapse";
import { getCategories, saveCategories } from "@/lib/localStorageService";

type Props = {
  categories: Category[];
};

export function CategoryForm({ categories }: Props) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [addingSubcategoryFor, setAddingSubcategoryFor] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<number, boolean>>({});

  const form = useForm({
    resolver: zodResolver(
      insertCategorySchema.extend({
        weight: z.number().min(0.1).max(100).optional(),
      })
    ),
    defaultValues: {
      name: "",
      weight: undefined,
      parentId: null as number | null,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; weight?: number; parentId: number | null }) => {
      const existingCategories = getCategories();
      const newId = Math.max(0, ...existingCategories.map(c => c.id)) + 1;
      const newCategory = { ...data, id: newId };
      const updatedCategories = [...existingCategories, newCategory];
      saveCategories(updatedCategories);
      return newCategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      form.reset({ name: "", weight: undefined, parentId: null });
      setAddingSubcategoryFor(null);
      toast({
        title: "Category added",
        description: "The category has been added successfully.",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: { name: string; weight?: number; parentId: number | null };
    }) => {
      const existingCategories = getCategories();
      const updatedCategories = existingCategories.map(c => 
        c.id === id ? { ...c, ...data } : c
      );
      saveCategories(updatedCategories);
      return { id, ...data };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditingId(null);
      form.reset({ name: "", weight: undefined, parentId: null });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const existingCategories = getCategories();
      const updatedCategories = existingCategories.filter(c => c.id !== id);
      saveCategories(updatedCategories);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
  });

  const onSubmit = (data: { name: string; weight: number | undefined; parentId: number | null }) => {
    const isSubcategory = addingSubcategoryFor !== null || (editingId !== null && form.getValues("parentId") !== null);

    const payload: { name: string; parentId: number | null; weight?: number } = {
      name: data.name,
      parentId: isSubcategory ? (addingSubcategoryFor ?? form.getValues("parentId")) : null,
      ...(isSubcategory && { weight: data.weight }),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEditing = (category: Category) => {
    setEditingId(category.id);
    form.reset({
      name: category.name,
      weight: category.weight ?? undefined,
      parentId: category.parentId,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setAddingSubcategoryFor(null);
    form.reset({ name: "", weight: undefined, parentId: null });
  };

  const startAddingSubcategory = (categoryId: number) => {
    setAddingSubcategoryFor(categoryId);
    form.reset({ name: "", weight: undefined, parentId: categoryId });
  };

  const toggleCategory = (categoryId: number) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const mainCategories = categories.filter((c) => !c.parentId);
  const getSubcategories = (parentId: number) => categories.filter((c) => c.parentId === parentId);
  const calculateSubcategoryTotal = (parentId: number) => {
    const subs = getSubcategories(parentId);
    return subs.reduce((sum, sub) => sum + (sub.weight ?? 0), 0);
  };

  const isSubcategoryMode = addingSubcategoryFor !== null || (editingId !== null && form.getValues("parentId") !== null);

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {addingSubcategoryFor ? "Subcategory Name" : "Category Name"}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isSubcategoryMode && (
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      min="0.1"
                      step="0.1"
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? (
                <>Save Changes</>
              ) : isSubcategoryMode ? (
                <>Add Subcategory</>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </>
              )}
            </Button>

            {(editingId || addingSubcategoryFor) && (
              <Button type="button" variant="outline" onClick={cancelEditing}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </Form>

      <Alert variant="default" className="bg-muted">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Main categories serve as groupings. Their weights are automatically calculated from
          their subcategories. All subcategory weights within a category will be normalized to
          100%.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {mainCategories.map((category) => {
          const subs = getSubcategories(category.id);
          const totalWeight = calculateSubcategoryTotal(category.id);

          return (
            <div key={category.id} className="space-y-2">
              <div
                className="flex items-center justify-between p-2 bg-muted rounded-md cursor-pointer"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center">
                  {subs.length > 0 && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform duration-300 ${
                        expandedCategories[category.id] ? "rotate-90" : ""
                      }`}
                    />
                  )}
                  <span className="font-medium ml-2">{category.name}</span>
                  {subs.length > 0 && (
                    <span className="ml-2 text-muted-foreground">
                      (Total weight: {totalWeight}%)
                    </span>
                  )}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startAddingSubcategory(category.id)}
                    disabled={!!editingId || addingSubcategoryFor !== null}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => startEditing(category)}
                    disabled={!!editingId || addingSubcategoryFor !== null}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(category.id)}
                    disabled={!!editingId || addingSubcategoryFor !== null}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Collapse isOpened={expandedCategories[category.id] || false}>
                <div className="ml-6 space-y-2 border-l-2 border-gray-300 pl-2">
                  {subs.map((subcategory) => (
                    <div
                      key={subcategory.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <span>{subcategory.name}</span>
                        <span className="text-muted-foreground">
                          {subcategory.weight}% (normalized to{" "}
                          {totalWeight > 0
                            ? ((subcategory.weight ?? 0) / totalWeight * 100).toFixed(1)
                            : "0.0"}
                          %)
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditing(subcategory)}
                          disabled={!!editingId || addingSubcategoryFor !== null}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(subcategory.id)}
                          disabled={!!editingId || addingSubcategoryFor !== null}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Collapse>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryForm;
