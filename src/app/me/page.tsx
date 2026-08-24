import Link from "next/link";
import { ArrowLeft, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/user-profile";
import { PositionHistory } from "@/components/position-history";
import { SignInHint } from "@/components/sign-in-hint";

export const metadata = {
  title: "Your civic record | EuroLens",
  description:
    "A private record of the positions you have taken and the actions you have logged.",
  robots: { index: false, follow: false },
};

export default function MyRecordPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" asChild className="gap-2 -ml-2 mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <NotebookPen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Your civic record
            </h1>
            <p className="text-muted-foreground">
              What you have done, visible only to you.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <UserProfile />
        <PositionHistory />
        <SignInHint />
      </div>
    </main>
  );
}
