import Link from "next/link";
import { ArrowLeft, BookOpen, Vote, Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Learn | EuroLens",
  description: "Understand how the European Parliament works and how to engage",
};

const EXPLAINERS = [
  {
    id: "codecision",
    title: "How does codecision work?",
    icon: Vote,
    content:
      "Codecision (ordinary legislative procedure) is the main way EU laws are made. The European Parliament and the Council of the EU must both agree on a text. The Commission proposes; Parliament and Council amend and adopt. Most EU legislation on the single market, environment, and consumer protection is adopted this way.",
  },
  {
    id: "plenary",
    title: "What is a plenary session?",
    icon: Users,
    content:
      "A plenary session is when all Members of the European Parliament (MEPs) meet in Strasbourg or Brussels to vote on legislation, hold debates, and adopt resolutions. Plenaries typically take place once a month. Votes on laws and amendments happen during these sessions.",
  },
  {
    id: "contact-mep",
    title: "How to contact your MEP",
    icon: Mail,
    content:
      "You can find your MEPs by country on the European Parliament website. Each MEP has a profile page with contact details. You can write to them about a specific procedure or policy. Mention the procedure reference (e.g. 2024/1234(COD)) if you are writing about a bill.",
  },
];

export default function LearnPage() {
  return (
    <main className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <Button variant="ghost" asChild className="gap-2 -ml-2 mb-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/5 border border-primary/20 p-6 md:p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg">
              <BookOpen className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Civic explainers
              </h1>
              <p className="text-muted-foreground">
                Understand how the EU works and how to make your voice heard
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {EXPLAINERS.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="h-5 w-5 text-primary" />
                  {item.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {item.content}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link href="/meps">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Find your MEPs
          </Button>
        </Link>
      </div>
    </main>
  );
}
