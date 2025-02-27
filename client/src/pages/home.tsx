"use client";
import { useQuery } from "@tanstack/react-query";
import { getCategories, getCandidates } from "@/lib/localStorageService";
import CategoryForm from "@/components/category-form";
import CandidateForm from "@/components/candidate-form";
import ComparisonView from "@/components/comparison-view";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { toast } = useToast();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
  });
  const { data: candidates = [] } = useQuery({
    queryKey: ["candidates"],
    queryFn: getCandidates,
  });

  return (
    <div className="container mx-auto pt-12 p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 to-gray-500 bg-clip-text text-transparent drop-shadow-md leading-[1.3]">
          Candidate Evaluation Algorithm
        </h1>
        <p className="text-base text-muted-foreground max-w-xl mx-auto leading-normal">
          A quantitative assessment for comparing potential partners through weighted variables and multi-dimensional scoring metrics, (fine-tuned for Imran Mama).
        </p>
        <p className="text-base text-muted-foreground max-w-xl mx-auto leading-normal">
          For default view, clear your local storage and refresh the page.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-lg rounded-xl border border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg font-medium">🎯 Categories & Weights</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryForm categories={categories} />
          </CardContent>
        </Card>

        <Card className="shadow-lg rounded-xl border border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg font-medium">👤 Add Candidate</CardTitle>
          </CardHeader>
          <CardContent>
            <CandidateForm categories={categories} />
          </CardContent>
        </Card>
      </div>

      <Separator className="my-8" />

      <Card className="shadow-xl rounded-2xl border border-primary/40">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">📊 Candidate Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <ComparisonView categories={categories} candidates={candidates} />
        </CardContent>
      </Card>
    </div>
  );
}
