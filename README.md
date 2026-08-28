# Editor home and journal share

A web app that plots editor-in-chief tenures for twelve journals against each editor's home institution share of papers in that journal.

The question is descriptive. When an editor takes over, does their institution's share of articles in that journal rise? Look at the handover table on each journal. Do not treat a rise as a result of this repo.

This is not a causal estimate.

## Journals

General: JAMA, JAMA Internal Medicine, NEJM.

Cardiology: JACC, Circulation, JAMA Cardiology, European Heart Journal.

Pulmonary: AJRCCM, CHEST.

Oncology: Journal of Clinical Oncology, The Lancet Oncology, JAMA Oncology.

Each journal was resolved through the OpenAlex `/sources` search. ISSNs in `data/journals.json` are the ones OpenAlex returned.

## Run it locally

```bash
npm install
npm run dev
```

The app listens on [http://127.0.0.1:4521](http://127.0.0.1:4521) and opens on JACC. Each journal has its own URL at `/j/<id>`. `/trends` pools sourced handovers across all twelve. Data is read from `data/bundle-parts`. The live page does not call OpenAlex.

## Share cards

Each journal page emits Open Graph and Twitter `summary_large_image` tags. The image is generated at `/j/<id>/opengraph-image`. Paste a journal URL into X or iMessage to preview it. The page also links a downloadable PNG of that card.

## Deploy on Vercel

This repo is a Next.js app. `vercel.json` names the framework. GitHub `apremjee8/journal-editor-map` is the deploy source. Import that repo in Vercel. Set `NEXT_PUBLIC_SITE_URL` to the public `https` host so OG image URLs are absolute.

## Refresh the counts

```bash
npm run fetch-data
npm run verify-data
```

`scripts/fetch-openalex.mjs` walks each journal-year on the OpenAlex works API (`type=article`), caches raw cells in `data/openalex-cache.json`, and rebuilds `data/bundle-parts`. It is safe to rerun. Cached cells are reused. Institution IDs used by any editor in the catalog are filled on every journal. Set `JOURNAL=jama-im` to refresh one title and keep the other parts.

Editor years live in `data/editors.json`. They come from journal announcements, mastheads, and editorials. If a window is missing, the file says so. Do not invent dates to fill a gap.

## What the chart counts

- Numerator: articles in that journal-year with at least one author at a member of the editor's institution group.
- Denominator: all OpenAlex `type=article` works whose primary location is that journal (and, for JAMA Internal Medicine, Archives of Internal Medicine before the 2013 rename).

OpenAlex keeps campus and hospital records separate. Some homes are grouped on purpose (Harvard + Brigham, Weill Cornell + NewYork-Presbyterian). OpenAlex has no Harvard Medical School institution. Inouye is plotted as HMS / Harvard on the Harvard University record (`I136199984`). Cannistra is plotted as Beth Israel Deaconess only.

## Layout

- `data/` cached OpenAlex cells, editor sources, assembled bundle
- `scripts/fetch-openalex.mjs` the fetch lever
- `scripts/verify-data.mjs` checks that all twelve journals have a series and sourced or gapped editors
- `src/app/j/[id]/page.tsx` one URL per journal
- `src/app/trends/page.tsx` pooled handover score
- `src/app/j/[id]/opengraph-image.tsx` the share card
