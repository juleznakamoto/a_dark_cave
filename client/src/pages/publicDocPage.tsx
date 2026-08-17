import { Helmet } from "react-helmet-async";
import { getPublicRouteSeo } from "@shared/publicSeo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { ReactNode } from "react";

type PublicDocPageProps = {
  path: "/faq" | "/about";
  heading: string;
  children: ReactNode;
};

export default function PublicDocPage({
  path,
  heading,
  children,
}: PublicDocPageProps) {
  const seo = getPublicRouteSeo(path)!;
  return (
    <ScrollArea className="h-screen w-full bg-black">
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={`https://a-dark-cave.com${path}`} />
      </Helmet>
      <div className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-3xl text-white">{heading}</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert max-w-none text-white legal-content">
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}
