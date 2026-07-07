import { Card, CardContent } from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <Card className="w-full max-w-md bg-sidebar border-sidebar-border shadow-xl">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <div className="rounded-full bg-sidebar-accent p-4 mb-6">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">404 - Page Not Found</h1>
          <p className="text-muted-foreground">
            The system could not locate the requested interface or panel. 
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
