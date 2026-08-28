import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { JournalApp } from "@/components/journal-app";
import { bundle, getJournal, isJournalId } from "@/lib/load-bundle";
import { siteUrl } from "@/lib/site";
import type { JournalId } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  return bundle.journals.map((j) => ({ id: j.journal.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (!isJournalId(id)) return { title: "Unknown journal" };
  const row = getJournal(id);
  if (!row) return { title: "Unknown journal" };
  const title = `${row.journal.shortName} editor home and journal share`;
  const description = `Editor-in-chief timeline for ${row.journal.name}, plotted against each editor’s home institution share of OpenAlex articles.`;
  const url = `${siteUrl()}/j/${id}`;
  return {
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
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function JournalPage({ params }: Props) {
  const { id } = await params;
  if (!isJournalId(id)) notFound();
  return <JournalApp bundle={bundle} journalId={id as JournalId} />;
}
