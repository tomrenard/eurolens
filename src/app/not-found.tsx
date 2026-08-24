import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground">
          That page does not exist. If you were looking for a procedure, search
          for it by reference or title from the dashboard.
        </p>
        <Button asChild>
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
