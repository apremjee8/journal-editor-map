import type { Metadata } from "next";

import { TrendsPage } from "@/components/trends-page";
import { bundle } from "@/lib/load-bundle";
import { siteUrl } from "@/lib/site";

const title = "Editor-change trends across twelve journals";
const description =
  "How often a sourced editor-in-chief start is followed by a rise or fall in that editor’s home-institution share of OpenAlex articles. Not a causal estimate.";
const url = `${siteUrl()}/trends`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    title,
    description,
    url,
    type: "website",
    siteName: "Editor home and journal share",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

export default function Page() {
  return <TrendsPage bundle={bundle} />;
}
