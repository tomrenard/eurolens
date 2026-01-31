import Link from "next/link";
import { ArrowLeft, Building2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRY_LABELS } from "@/types/europarl";
import type { Country } from "@/types/europarl";

const COUNTRY_CODES: Country[] = ["DE", "FR", "ES", "IT", "PL", "NL"];

const NATIONAL_LINKS: Record<
  string,
  { parliament: string; consultations?: string }
> = {
  DE: {
    parliament: "https://www.bundestag.de",
    consultations:
      "https://www.bundestag.de/ausschuesse/oeffentliche_anhoerungen",
  },
  FR: {
    parliament: "https://www.assemblee-nationale.fr",
    consultations: "https://www.vie-publique.fr/participer",
  },
  ES: {
    parliament: "https://www.congreso.es",
    consultations: "https://www.lamoncloa.gob.es/lang/en/Paginas/index.aspx",
  },
  IT: {
    parliament: "https://www.camera.it",
    consultations: "https://partecipa.gov.it",
  },
  PL: {
    parliament: "https://www.sejm.gov.pl",
  },
  NL: {
    parliament: "https://www.tweedekamer.nl",
    consultations: "https://www.internetconsultatie.nl",
  },
};

export const metadata = {
  title: "National | EuroLens",
  description: "Links to national parliaments and consultation portals",
};

export default function NationalPage() {
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
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                National parliaments
              </h1>
              <p className="text-muted-foreground">
                Links to national parliament and consultation portals
              </p>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            National procedures and consultations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Engage with your national parliament and public consultations.
            EuroLens does not track national procedures; these links are for
            your convenience.
          </p>
          <div className="space-y-4">
            {COUNTRY_CODES.map((code) => {
              const links = NATIONAL_LINKS[code];
              if (!links) return null;
              return (
                <div
                  key={code}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg border bg-card"
                >
                  <span className="font-medium">{COUNTRY_LABELS[code]}</span>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={links.parliament}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                    >
                      <Building2 className="h-4 w-4 shrink-0" />
                      Parliament
                    </a>
                    {links.consultations && (
                      <a
                        href={links.consultations}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0" />
                        Consultations
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Transposition of EU directives: see{" "}
            <a
              href="https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:31985L0374"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              EUR-Lex
            </a>{" "}
            for directive texts and national implementation.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
