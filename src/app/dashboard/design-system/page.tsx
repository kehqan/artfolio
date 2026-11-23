"use client";

/* Living reference for the Artomango design system.
   Not linked from the nav; open /dashboard/design-system.
   Every component here comes from src/components/ui. */

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Eyebrow,
  Field,
  Heading,
  Input,
  Modal,
  PageHeader,
  Select,
  StatTile,
  Tabs,
  Tag,
  Textarea,
} from "@/components/ui";

const swatches: Array<[string, string]> = [
  ["ink", "bg-ink"],
  ["mango", "bg-mango"],
  ["mango-hover", "bg-mango-hover"],
  ["mango-soft", "bg-mango-soft"],
  ["page", "bg-page"],
  ["surface", "bg-surface"],
  ["sunken", "bg-sunken"],
  ["n-200 · line", "bg-n-200"],
  ["n-300 · line-strong", "bg-n-300"],
  ["n-400", "bg-n-400"],
  ["fg-3 · muted", "bg-fg-3"],
  ["fg-2 · body", "bg-fg-2"],
];

const typeScale: Array<[string, string, string]> = [
  ["display · 56", "font-display text-display", "Spring Open Studio"],
  ["h1 · 40", "font-display text-h1", "Your artworks"],
  ["h2 · 28", "font-display text-h2", "Upcoming exhibitions"],
  ["h3 · 20", "font-display text-h3", "Contract details"],
  ["lead · 18", "font-ui text-lead text-fg-2", "Track every piece from studio to sale, with provenance attached."],
  ["body · 15", "font-ui text-body", "Add dimensions, medium and price so collectors can find this work."],
  ["label · 13", "font-ui text-label font-semibold", "Edition size"],
  ["caption · 12", "font-ui text-caption text-fg-3", "Last edited 2 hours ago"],
];

type Filter = "all" | "available" | "sold";

export default function DesignSystemPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState("20255");
  const yearError = /^\d{4}$/.test(year) ? undefined : "Enter a four-digit year, like 2025.";

  return (
    <div className="bg-page font-ui text-fg">
      <div className="mx-auto flex max-w-[1040px] flex-col gap-14 px-4 pb-24 pt-8 sm:px-6">
        <PageHeader
          eyebrow="Reference"
          title="Design system"
          description="Tokens and shared components for Artomango. Build pages from these instead of inline styles. Full guide in DESIGN_SYSTEM.md."
          actions={
            <>
              <Button variant="secondary">Secondary</Button>
              <Button variant="primary">
                <Plus size={16} aria-hidden /> Primary
              </Button>
            </>
          }
        />

        <section className="flex flex-col gap-4">
          <Heading level={2}>Color</Heading>
          <Card padding="lg" className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-3">
            {swatches.map(([name, cls]) => (
              <div key={name} className="flex flex-col gap-1.5">
                <div className={`h-14 rounded-control border-hair border-line ${cls}`} />
                <span className="text-label font-semibold">{name}</span>
              </div>
            ))}
          </Card>
          <div className="flex flex-wrap gap-2">
            <Badge tone="ok" dot>Sold</Badge>
            <Badge tone="warn" dot>Reserved</Badge>
            <Badge tone="bad" dot>Overdue</Badge>
            <Badge tone="info" dot>On loan</Badge>
            <Badge tone="neutral" dot>Draft</Badge>
            <Badge tone="mango">Featured</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag color="coral">Painting</Tag>
            <Tag color="teal">Sculpture</Tag>
            <Tag color="violet">Photography</Tag>
            <Tag color="pink">Print</Tag>
            <Tag color="sky">Digital</Tag>
            <Tag>Series: Dusk</Tag>
          </div>
        </section>

        <section className="flex flex-col gap-4">
          <Heading level={2}>Type</Heading>
          <Card padding="lg" className="flex flex-col divide-y divide-line">
            {typeScale.map(([spec, cls, sample]) => (
              <div key={spec} className="grid gap-1 py-3 sm:grid-cols-[120px_1fr] sm:items-baseline sm:gap-4">
                <span className="font-code text-caption text-fg-3">{spec}</span>
                <span className={cls}>{sample}</span>
              </div>
            ))}
          </Card>
        </section>

        <section className="flex flex-col gap-4">
          <Heading level={2}>Components</Heading>
          <div className="grid gap-4 md:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-4">
              <Eyebrow>Button</Eyebrow>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Publish</Button>
                <Button>Save draft</Button>
                <Button variant="ghost">Cancel</Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="danger" size="sm">Delete</Button>
                <Button size="sm">Small</Button>
                <Button variant="primary" disabled>Disabled</Button>
              </div>
            </Card>

            <Card padding="lg" className="flex flex-col gap-4">
              <Eyebrow>Field</Eyebrow>
              <Field label="Price" hint='In euros. Leave empty for "Price on request".'>
                {(p) => <Input {...p} defaultValue="2,400" />}
              </Field>
              <Field label="Year" error={yearError}>
                {(p) => <Input {...p} value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" />}
              </Field>
              <Field label="Medium">
                {(p) => (
                  <Select {...p} defaultValue="oil">
                    <option value="oil">Oil on canvas</option>
                    <option value="acrylic">Acrylic</option>
                    <option value="ink">Ink on paper</option>
                  </Select>
                )}
              </Field>
              <Field label="Statement">
                {(p) => <Textarea {...p} rows={3} placeholder="What should collectors know about this work?" />}
              </Field>
            </Card>

            <Card padding="lg" className="flex flex-col gap-4">
              <Eyebrow>Tabs, stat and avatar</Eyebrow>
              <Tabs<Filter>
                label="Filter artworks"
                value={filter}
                onChange={setFilter}
                items={[
                  { value: "all", label: "All", count: 24 },
                  { value: "available", label: "Available", count: 17 },
                  { value: "sold", label: "Sold", count: 7 },
                ]}
              />
              <StatTile label="Sales this month" value="€8,950" delta="+3 works vs. October" trend="up" />
              <div className="flex items-center gap-3">
                <Avatar name="Leila Ahmadi" size="sm" />
                <Avatar name="Leila Ahmadi" />
                <Avatar name="Leila Ahmadi" size="lg" />
              </div>
            </Card>

            <Card padding="lg" className="flex flex-col gap-4">
              <Eyebrow>Empty state and modal</Eyebrow>
              <EmptyState
                icon={<Plus size={22} aria-hidden />}
                title="No collections yet"
                description="Group artworks into a collection to share a series with a gallery or collector."
                action={
                  <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
                    Open example modal
                  </Button>
                }
              />
            </Card>
          </div>

          <Eyebrow className="mt-2">Clickable artwork card (hover it)</Eyebrow>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { t: "Blue Hour Over Tehran", m: "Oil on canvas · 80 × 60 cm · 2025", p: "€2,400", s: "ok" as const, l: "Available" },
              { t: "Salt Studies III", m: "Ink on paper · 30 × 40 cm · 2024", p: "€650", s: "warn" as const, l: "Reserved" },
              { t: "Garden After Rain", m: "Acrylic · 100 × 100 cm · 2023", p: "€3,100", s: "neutral" as const, l: "Sold" },
            ].map((a) => (
              <Card key={a.t} interactive padding="none" tabIndex={0}>
                <div className="relative aspect-[4/3] bg-gradient-to-br from-tag-coral to-mango">
                  <Badge tone={a.s} dot className="absolute left-2.5 top-2.5 bg-surface">
                    {a.l}
                  </Badge>
                </div>
                <div className="flex flex-col gap-2 px-4 pb-4 pt-3.5">
                  <Heading level={3} className="leading-tight">{a.t}</Heading>
                  <span className="text-label text-fg-3">{a.m}</span>
                  <span className="text-body font-bold tabular-nums">{a.p}</span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Mark as sold?"
        description='"Blue Hour Over Tehran" moves to Sales and is hidden from Explore. You can undo this from the artwork page.'
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={() => setOpen(false)}>Mark as sold</Button>
          </>
        }
      />
    </div>
  );
}
