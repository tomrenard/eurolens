import Link from "next/link";
import { ArrowLeft, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRY_LABELS } from "@/types/europarl";
import type { Country } from "@/types/europarl";

const EP_MEP_FULL_LIST = "https://www.europarl.europa.eu/meps/en/full-list/all";
const EP_MEP_SEARCH = "https://www.europarl.europa.eu/meps/en/search/advanced";

const COUNTRY_CODES: Country[] = ["DE", "FR", "ES", "IT", "PL", "NL"];

export const metadata = {
  title: "Your MEPs | EuroLens",
  description:
    "Find and contact your Members of the European Parliament by country",
};

export default function MEPsPage() {
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
              <Users className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                Your MEPs
              </h1>
              <p className="text-muted-foreground">
                Find and contact Members of the European Parliament by country
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            MEPs by country
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Select your country to view the list of your MEPs on the European
            Parliament website.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <a
              href={EP_MEP_FULL_LIST}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">{COUNTRY_LABELS.general}</span>
              <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
            {COUNTRY_CODES.map((code) => (
              <a
                key={code}
                href={`${EP_MEP_SEARCH}?countryCode=${code}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium">{COUNTRY_LABELS[code]}</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
              </a>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Data and contact links are provided by the European Parliament.
            EuroLens does not store MEP contact details.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
