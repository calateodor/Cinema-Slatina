import type { Metadata } from "next";
import { Coffee } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "@/components/site/sections";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import { getMenu } from "@/server/queries";

export const metadata: Metadata = {
  title: "Bar",
  description:
    "Meniul barului: ochelari 3D, popcorn, băuturi și snacks, cu prețurile actualizate.",
};

export default async function BarPage() {
  const menu = await getMenu();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
      <Reveal y={16}>
        <SectionHeading
          title="Barul cinematografului"
          description="De aici iei ochelarii 3D și gustările pentru film. Plata se face la casierie, în numerar sau cu cardul."
        />
      </Reveal>

      {menu.length === 0 ? (
        <Empty className="border bg-card/50">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Coffee />
            </EmptyMedia>
            <EmptyDescription>
              Meniul se actualizează. Revino în curând.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Reveal stagger className="flex flex-col gap-4">
          {menu.map((group) => (
            <Card key={group.category}>
              <CardHeader className="border-b pb-4">
                <CardTitle className="ticket text-xl tracking-wide text-brand-yellow">
                  {group.category.toUpperCase()}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col">
                {group.items.map((item, index) => (
                  <div key={item.id} className="flex flex-col">
                    {index > 0 ? <Separator className="my-3" /> : null}
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium">{item.name}</p>
                        {item.description ? (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                      <span className="ticket shrink-0 text-lg tabular-nums text-brand-orange">
                        {formatPrice(item.priceBani)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </Reveal>
      )}

      <p className="text-sm text-muted-foreground">
        Mâncarea și băutura din exterior nu sunt permise în sală. Ochelarii 3D se
        returnează la ieșire.
      </p>
    </div>
  );
}
