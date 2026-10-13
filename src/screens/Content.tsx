import { useEffect, useState } from 'react';
import { BookOpen, Newspaper, Pencil, Plus, Quote, Trash2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { admin } from '../lib/endpoints';
import { fmtDate, titleCase } from '../lib/format';
import type { Book, InsightInput, Testimonial } from '../lib/types';
import { useResource } from '../lib/useResource';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, Segmented,
  Select, Skeleton, TableSkeleton, Td, Textarea, Th, Toggle,
} from '../ui/kit';
import { ConfirmDialog, Drawer, useToast } from '../ui/overlay';

type Tab = 'insights' | 'testimonial' | 'books';

export function Content() {
  const [tab, setTab] = useState<Tab>('insights');
  return (
    <div className="rise">
      <PageHeader
        title="Content"
        description="Everything users read in the app, editable without a release."
        actions={
          <Segmented
            options={[
              { label: 'Daily insights', value: 'insights' as Tab },
              { label: 'Onboarding quote', value: 'testimonial' as Tab },
              { label: 'Curated books', value: 'books' as Tab },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />
      {tab === 'insights' ? <Insights /> : tab === 'testimonial' ? <TestimonialEditor /> : <Books />}
    </div>
  );
}

/* --------------------------------------------------------------- Insights */

function Insights() {
  const toast = useToast();
  const { me } = useAuth();
  const canEdit = Boolean(me?.isSuperAdmin);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const list = useResource((s) => admin.insights({ status, page, limit: 20 }, s), [status, page]);

  const toggle = async (id: string, isActive: boolean) => {
    try {
      await admin.setInsightStatus(id, isActive);
      toast.success(isActive ? 'Insight is live' : 'Insight paused');
      list.reload();
    } catch (err) {
      toast.error('Could not update', (err as Error).message);
    }
  };

  return (
    <>
      <Card padded={false}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <Segmented
            options={[
              { label: 'All', value: '' },
              { label: 'Live', value: 'active' },
              { label: 'Paused', value: 'inactive' },
            ]}
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
          />
          {canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>New insight</Button>}
        </div>
        {list.loading ? (
          <TableSkeleton rows={7} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.insights.length === 0 ? (
          <EmptyState icon={Newspaper} title="No insights" body="Create one to add it to the dashboard rotation." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr><Th>Insight</Th><Th>Category</Th><Th>Added</Th><Th>In rotation</Th><Th /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.insights.map((i) => (
                    <tr key={i.id} className="hover:bg-panel-2/70">
                      <Td className="max-w-[420px]">
                        <div className="line-clamp-1 font-medium">{i.title}</div>
                        <div className="line-clamp-1 text-[13px] text-ink-3">{i.hook}</div>
                      </Td>
                      <Td><Badge tone="brand">{titleCase(i.category)}</Badge></Td>
                      <Td className="num text-ink-2">{fmtDate(i.createdAt)}</Td>
                      <Td>
                        <Toggle label={`Toggle ${i.title}`} checked={i.isActive} onChange={(v) => toggle(i.id, v)} />
                      </Td>
                      <Td>
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(i.id)}>
                          {canEdit ? 'Edit' : 'View'}
                        </Button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data && (
              <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="insights" onChange={setPage} />
            )}
          </>
        )}
      </Card>
      <InsightEditor
        id={editing}
        canEdit={canEdit}
        categories={list.data?.categories ?? []}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          list.reload();
        }}
      />
    </>
  );
}

const EMPTY_INSIGHT: InsightInput = {
  category: '', tag: '', title: '', hook: '', why: '', tip: '', sections: [],
  imageUrl: null, detailImageUrl: null, sourceNote: null, isActive: true, weight: 1,
};

function InsightEditor({
  id, canEdit, categories, onClose, onSaved,
}: {
  id: string | null;
  canEdit: boolean;
  categories: Array<{ id: string; label: string }>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const isNew = id === 'new';
  const [form, setForm] = useState<InsightInput>(EMPTY_INSIGHT);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (isNew) {
      setForm({ ...EMPTY_INSIGHT, category: categories[0]?.id ?? '' });
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    admin.insight(id, ctrl.signal)
      .then((d) => setForm({
        category: d.category, tag: d.tag, title: d.title, hook: d.hook, why: d.why, tip: d.tip,
        sections: d.sections ?? [], imageUrl: d.imageUrl, detailImageUrl: d.detailImageUrl,
        sourceNote: d.sourceNote, isActive: d.isActive, weight: d.weight,
      }))
      .catch((e: Error) => {
        if (e.name !== 'AbortError') toast.error('Could not load insight', e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof InsightInput>(k: K, v: InsightInput[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.title.trim() && form.hook.trim() && form.why.trim() && form.tip.trim() && form.tag.trim() && form.category;

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        ...form,
        imageUrl: form.imageUrl?.trim() || null,
        detailImageUrl: form.detailImageUrl?.trim() || null,
        sourceNote: form.sourceNote?.trim() || null,
      };
      if (isNew) await admin.createInsight(body);
      else if (id) await admin.updateInsight(id, body);
      toast.success(isNew ? 'Insight created' : 'Insight saved');
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={isNew ? 'New insight' : 'Edit insight'} width="max-w-2xl">
      {loading ? (
        <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <Select value={form.category} disabled={!canEdit} onChange={(e) => set('category', e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Chip label" hint="Short tag on the card, e.g. Sleep Science">
              <Input value={form.tag} maxLength={40} disabled={!canEdit} onChange={(e) => set('tag', e.target.value)} />
            </Field>
          </div>
          <Field label="Title">
            <Input value={form.title} maxLength={160} disabled={!canEdit} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field label="Hook" hint="One or two lines shown on the dashboard card.">
            <Textarea rows={2} value={form.hook} maxLength={400} disabled={!canEdit} onChange={(e) => set('hook', e.target.value)} />
          </Field>
          <Field label="Why it matters">
            <Textarea rows={4} value={form.why} maxLength={1200} disabled={!canEdit} onChange={(e) => set('why', e.target.value)} />
          </Field>
          <Field label="Try this today">
            <Textarea rows={2} value={form.tip} maxLength={500} disabled={!canEdit} onChange={(e) => set('tip', e.target.value)} />
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[13px] font-medium text-ink-2">Detail sections</span>
              {canEdit && form.sections.length < 8 && (
                <Button size="sm" variant="ghost" icon={Plus}
                  onClick={() => set('sections', [...form.sections, { label: '', body: '' }])}>Add section</Button>
              )}
            </div>
            <div className="space-y-3">
              {form.sections.map((s, i) => (
                <div key={i} className="space-y-2 rounded-xl bg-panel-2 p-3 hairline">
                  <div className="flex gap-2">
                    <Input value={s.label} maxLength={80} placeholder="Heading" disabled={!canEdit}
                      onChange={(e) => set('sections', form.sections.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                    {canEdit && (
                      <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove section"
                        onClick={() => set('sections', form.sections.filter((_, j) => j !== i))} />
                    )}
                  </div>
                  <Textarea rows={2} value={s.body} maxLength={800} placeholder="Text" disabled={!canEdit}
                    onChange={(e) => set('sections', form.sections.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))} />
                </div>
              ))}
              {form.sections.length === 0 && <p className="text-[13px] text-ink-3">No extra sections.</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Card image URL">
              <Input value={form.imageUrl ?? ''} disabled={!canEdit} placeholder="https://…" onChange={(e) => set('imageUrl', e.target.value)} />
            </Field>
            <Field label="Detail image URL">
              <Input value={form.detailImageUrl ?? ''} disabled={!canEdit} placeholder="https://…" onChange={(e) => set('detailImageUrl', e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Source note" hint="Where the information comes from.">
              <Input value={form.sourceNote ?? ''} disabled={!canEdit} onChange={(e) => set('sourceNote', e.target.value)} />
            </Field>
            <Field label="Priority (0–100)" hint="Higher shows more often.">
              <Input type="number" min={0} max={100} value={form.weight} disabled={!canEdit}
                onChange={(e) => set('weight', Number(e.target.value))} />
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl bg-panel-2 px-4 py-3 hairline">
            <span className="text-sm font-medium text-ink">In rotation</span>
            <Toggle label="In rotation" checked={form.isActive} disabled={!canEdit} onChange={(v) => set('isActive', v)} />
          </div>

          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>
                {isNew ? 'Create insight' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Only super admins can edit content.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------ Testimonial */

function TestimonialEditor() {
  const toast = useToast();
  const { me } = useAuth();
  const canEdit = Boolean(me?.isSuperAdmin);
  const res = useResource((s) => admin.testimonial(s), []);
  const [form, setForm] = useState<Omit<Testimonial, 'exists'> | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (res.data) {
      const { exists: _exists, ...rest } = res.data;
      void _exists;
      setForm(rest);
    }
  }, [res.data]);

  if (res.loading || !form) {
    return res.error && !res.data ? <ErrorState error={res.error} onRetry={res.reload} /> : <Skeleton className="h-80 w-full" />;
  }
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm({ ...form, [k]: v });
  const valid = form.quoteHighlight.trim() && form.quoteBody.trim() && form.authorName.trim() && form.authorTitle.trim();

  const save = async () => {
    setBusy(true);
    try {
      await admin.saveTestimonial(form);
      toast.success('Onboarding quote saved');
      res.reload();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card>
        <CardHeader title="Onboarding quote" subtitle="The testimonial shown on the welcome screens." />
        {!res.data?.exists && (
          <p className="mb-4 rounded-xl bg-panel-2 px-3.5 py-2.5 text-[13px] text-ink-2 hairline">
            Nothing saved yet, so the app shows its built-in quote. Saving here replaces it.
          </p>
        )}
        <div className="space-y-4">
          <Field label="Headline quote">
            <Textarea rows={2} maxLength={200} value={form.quoteHighlight} disabled={!canEdit}
              onChange={(e) => set('quoteHighlight', e.target.value)} />
          </Field>
          <Field label="Supporting text">
            <Textarea rows={3} maxLength={500} value={form.quoteBody} disabled={!canEdit}
              onChange={(e) => set('quoteBody', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Author name">
              <Input value={form.authorName} maxLength={80} disabled={!canEdit} onChange={(e) => set('authorName', e.target.value)} />
            </Field>
            <Field label="Author title">
              <Input value={form.authorTitle} maxLength={120} disabled={!canEdit} onChange={(e) => set('authorTitle', e.target.value)} />
            </Field>
          </div>
          <Field label="Author photo URL (optional)">
            <Input value={form.authorImageUrl} disabled={!canEdit} placeholder="https://…" onChange={(e) => set('authorImageUrl', e.target.value)} />
          </Field>
          <div className="flex items-center justify-between rounded-xl bg-panel-2 px-4 py-3 hairline">
            <span className="text-sm font-medium text-ink">Show in onboarding</span>
            <Toggle label="Show in onboarding" checked={form.active} disabled={!canEdit} onChange={(v) => set('active', v)} />
          </div>
          {canEdit && (
            <div className="flex justify-end">
              <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>Save quote</Button>
            </div>
          )}
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader title="Preview" />
        <div className="rounded-2xl bg-panel-2 p-5 hairline">
          <Quote className="mb-3 size-6 text-brand" />
          <p className="text-[17px] font-semibold leading-snug text-ink">{form.quoteHighlight || 'Headline quote'}</p>
          <p className="mt-2 text-sm text-ink-2">{form.quoteBody || 'Supporting text'}</p>
          <div className="mt-4 border-t border-line pt-3">
            <div className="text-sm font-medium text-ink">{form.authorName || 'Author'}</div>
            <div className="text-[13px] text-ink-3">{form.authorTitle || 'Title'}</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ Books */

const EMPTY_BOOK: Partial<Book> = {
  title: '', author: '', topic: '', difficulty: 'beginner', readingTimeMinutes: 240, summary: '',
  whyRecommended: '', keyLessons: [], mindfulnessInsight: '', concepts: [], historicalRelevance: '',
  coverUrl: '', isbn: '', sortOrder: 100, published: true,
};

function Books() {
  const toast = useToast();
  const { me } = useAuth();
  const canEdit = Boolean(me?.isSuperAdmin);
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Book | 'new' | null>(null);
  const [removing, setRemoving] = useState<Book | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useResource((s) => admin.books({ page, limit: 15 }, s), [page]);

  const remove = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await admin.deleteBook(removing.id);
      toast.success('Book removed', removing.title);
      setRemoving(null);
      list.reload();
    } catch (err) {
      toast.error('Could not remove', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Card padded={false}>
        <div className="flex items-center justify-between gap-3 border-b border-line p-4">
          <span className="text-sm text-ink-3">The “Curated reads” shelf in Mindfulness.</span>
          {canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Add book</Button>}
        </div>
        {list.loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.books.length === 0 ? (
          <EmptyState icon={BookOpen} title="No books yet" body="Add the first book to the curated shelf." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px]">
                <thead className="border-b border-line bg-panel-2/60">
                  <tr><Th>Book</Th><Th>Level</Th><Th>Read time</Th><Th>Status</Th><Th /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {list.data?.books.map((b) => (
                    <tr key={b.id} className="hover:bg-panel-2/70">
                      <Td>
                        <div className="font-medium">{b.title}</div>
                        <div className="text-[13px] text-ink-3">{b.author}</div>
                      </Td>
                      <Td><Badge tone="info">{titleCase(b.difficulty)}</Badge></Td>
                      <Td className="num text-ink-2">{Math.round(b.readingTimeMinutes / 60 * 10) / 10} h</Td>
                      <Td>{b.published ? <Badge tone="ok" dot>Published</Badge> : <Badge tone="neutral">Hidden</Badge>}</Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(b)}>{canEdit ? 'Edit' : 'View'}</Button>
                          {canEdit && <Button size="sm" variant="ghost" icon={Trash2} aria-label="Remove book" onClick={() => setRemoving(b)} />}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {list.data && <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="books" onChange={setPage} />}
          </>
        )}
      </Card>

      <BookEditor
        book={editing}
        canEdit={canEdit}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          list.reload();
        }}
      />
      <ConfirmDialog
        open={Boolean(removing)}
        danger
        busy={busy}
        title="Remove this book?"
        confirmLabel="Remove"
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        body={<>“{removing?.title}” will disappear from the shelf. Hiding it instead keeps the entry.</>}
      />
    </>
  );
}

function BookEditor({
  book, canEdit, onClose, onSaved,
}: { book: Book | 'new' | null; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = book === 'new';
  const [form, setForm] = useState<Partial<Book>>(EMPTY_BOOK);
  const [lessons, setLessons] = useState('');
  const [concepts, setConcepts] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!book) return;
    const b = book === 'new' ? EMPTY_BOOK : book;
    setForm(b);
    setLessons((b.keyLessons ?? []).join('\n'));
    setConcepts((b.concepts ?? []).join('\n'));
  }, [book]);

  const set = <K extends keyof Book>(k: K, v: Book[K]) => setForm((f) => ({ ...f, [k]: v }));
  const valid = Boolean(form.title?.trim() && form.author?.trim());

  const save = async () => {
    setBusy(true);
    try {
      await admin.saveBook(isNew || !book ? null : (book as Book).id, {
        ...form,
        keyLessons: lessons.split('\n').map((x) => x.trim()).filter(Boolean),
        concepts: concepts.split('\n').map((x) => x.trim()).filter(Boolean),
      });
      toast.success(isNew ? 'Book added' : 'Book saved');
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={Boolean(book)} onClose={onClose} title={isNew ? 'Add book' : 'Edit book'} width="max-w-2xl">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title"><Input value={form.title ?? ''} disabled={!canEdit} onChange={(e) => set('title', e.target.value)} /></Field>
          <Field label="Author"><Input value={form.author ?? ''} disabled={!canEdit} onChange={(e) => set('author', e.target.value)} /></Field>
          <Field label="Topic"><Input value={form.topic ?? ''} disabled={!canEdit} onChange={(e) => set('topic', e.target.value)} /></Field>
          <Field label="Level">
            <Select value={form.difficulty} disabled={!canEdit} onChange={(e) => set('difficulty', e.target.value as Book['difficulty'])}>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </Field>
          <Field label="Reading time (minutes)">
            <Input type="number" min={1} value={form.readingTimeMinutes ?? 240} disabled={!canEdit}
              onChange={(e) => set('readingTimeMinutes', Number(e.target.value))} />
          </Field>
          <Field label="Order on shelf" hint="Lower numbers first.">
            <Input type="number" value={form.sortOrder ?? 100} disabled={!canEdit} onChange={(e) => set('sortOrder', Number(e.target.value))} />
          </Field>
        </div>
        <Field label="Summary"><Textarea rows={3} value={form.summary ?? ''} disabled={!canEdit} onChange={(e) => set('summary', e.target.value)} /></Field>
        <Field label="Why we recommend it"><Textarea rows={2} value={form.whyRecommended ?? ''} disabled={!canEdit} onChange={(e) => set('whyRecommended', e.target.value)} /></Field>
        <Field label="Key lessons" hint="One per line."><Textarea rows={4} value={lessons} disabled={!canEdit} onChange={(e) => setLessons(e.target.value)} /></Field>
        <Field label="Mindfulness insight"><Textarea rows={2} value={form.mindfulnessInsight ?? ''} disabled={!canEdit} onChange={(e) => set('mindfulnessInsight', e.target.value)} /></Field>
        <Field label="Concepts" hint="One per line."><Textarea rows={3} value={concepts} disabled={!canEdit} onChange={(e) => setConcepts(e.target.value)} /></Field>
        <Field label="Historical relevance"><Textarea rows={2} value={form.historicalRelevance ?? ''} disabled={!canEdit} onChange={(e) => set('historicalRelevance', e.target.value)} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cover image URL"><Input value={form.coverUrl ?? ''} disabled={!canEdit} onChange={(e) => set('coverUrl', e.target.value)} /></Field>
          <Field label="ISBN"><Input value={form.isbn ?? ''} disabled={!canEdit} onChange={(e) => set('isbn', e.target.value)} /></Field>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-panel-2 px-4 py-3 hairline">
          <span className="text-sm font-medium text-ink">Published</span>
          <Toggle label="Published" checked={form.published !== false} disabled={!canEdit} onChange={(v) => set('published', v)} />
        </div>
        {canEdit && (
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>{isNew ? 'Add book' : 'Save changes'}</Button>
          </div>
        )}
      </div>
    </Drawer>
  );
}
