import { useState } from 'react';
import { Library, Pencil, Plus, Trash2 } from 'lucide-react';
import { admin } from '../lib/endpoints';
import type { CatalogItem, CatalogType } from '../lib/types';
import { useResource } from '../lib/useResource';
import { Badge, Button, Card, EmptyState, ErrorState, Field, IconButton, Input, PageHeader, Segmented, Select, TableSkeleton, Td, Textarea, Th, Toggle } from '../ui/kit';
import { ConfirmDialog, Modal, useToast } from '../ui/overlay';

interface FieldDef {
  key: string;
  label: string;
  kind?: 'text' | 'textarea' | 'number' | 'select';
  options?: string[];
  required?: boolean;
  hint?: string;
}

const SCHEMA: Record<CatalogType, { singular: string; fields: FieldDef[]; primary: string; secondary?: string }> = {
  categories: {
    singular: 'category',
    primary: 'name',
    secondary: 'description',
    fields: [
      { key: 'name', label: 'Name', required: true },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'color', label: 'Color', hint: 'e.g. #3A56E0' },
      { key: 'icon', label: 'Icon name' },
      { key: 'sortOrder', label: 'Sort order', kind: 'number' },
    ],
  },
  'dosage-forms': {
    singular: 'dosage form',
    primary: 'displayName',
    secondary: 'name',
    fields: [
      { key: 'name', label: 'Key', required: true, hint: 'Stored value, e.g. tablet' },
      { key: 'displayName', label: 'Display name', required: true },
      { key: 'description', label: 'Description', kind: 'textarea' },
      { key: 'icon', label: 'Icon name' },
      { key: 'sortOrder', label: 'Sort order', kind: 'number' },
    ],
  },
  faqs: {
    singular: 'FAQ',
    primary: 'question',
    secondary: 'category',
    fields: [
      { key: 'question', label: 'Question', required: true },
      { key: 'answer', label: 'Answer', kind: 'textarea', required: true },
      { key: 'category', label: 'Category', hint: 'e.g. general, billing, medications' },
      { key: 'priority', label: 'Priority', kind: 'number', hint: 'Higher shows first' },
    ],
  },
};

export function Catalogs() {
  const toast = useToast();
  const [type, setType] = useState<CatalogType>('categories');
  const list = useResource((s) => admin.catalog(type, s), [type]);
  const cfg = SCHEMA[type];

  const [editing, setEditing] = useState<CatalogItem | 'new' | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<CatalogItem | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const openEditor = (item: CatalogItem | 'new') => {
    const next: Record<string, string> = {};
    cfg.fields.forEach((f) => {
      const v = item === 'new' ? '' : item[f.key];
      next[f.key] = v == null ? '' : String(v);
    });
    setForm(next);
    setEditing(item);
  };

  const save = async () => {
    const body: Record<string, unknown> = {};
    for (const f of cfg.fields) {
      const raw = (form[f.key] ?? '').trim();
      if (f.required && !raw) {
        toast.error('Missing field', `${f.label} is required.`);
        return;
      }
      if (raw === '' && editing === 'new') continue;
      body[f.key] = f.kind === 'number' ? (raw === '' ? 0 : Number(raw)) : raw;
    }
    setSaving(true);
    try {
      if (editing === 'new') await admin.createCatalogItem(type, body);
      else if (editing) await admin.updateCatalogItem(type, editing.id, body);
      toast.success(editing === 'new' ? `${cfg.singular} added` : 'Saved');
      setEditing(null);
      list.reload();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: CatalogItem, isActive: boolean) => {
    try {
      await admin.updateCatalogItem(type, item.id, { isActive });
      list.reload();
    } catch (err) {
      toast.error('Could not update', (err as Error).message);
    }
  };

  const remove = async () => {
    if (!removing) return;
    setBusyDelete(true);
    try {
      await admin.deleteCatalogItem(type, removing.id);
      toast.success('Deleted');
      setRemoving(null);
      list.reload();
    } catch (err) {
      toast.error('Could not delete', (err as Error).message);
    } finally {
      setBusyDelete(false);
    }
  };

  return (
    <div className="rise">
      <PageHeader
        title="Catalogs"
        description="Reference data the mobile app reads: categories, dosage forms and FAQs."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => openEditor('new')}>
            Add {cfg.singular}
          </Button>
        }
      />

      <Card padded={false}>
        <div className="border-b border-line p-4">
          <Segmented
            options={[
              { label: 'Categories', value: 'categories' as CatalogType },
              { label: 'Dosage forms', value: 'dosage-forms' as CatalogType },
              { label: 'FAQs', value: 'faqs' as CatalogType },
            ]}
            value={type}
            onChange={setType}
          />
        </div>

        {list.loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.reload} />
        ) : list.data && list.data.items.length === 0 ? (
          <EmptyState
            icon={Library}
            title={`No ${cfg.singular}s yet`}
            action={<Button variant="primary" icon={Plus} onClick={() => openEditor('new')}>Add {cfg.singular}</Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="border-b border-line bg-panel-2/60">
                <tr>
                  <Th>{type === 'faqs' ? 'Question' : 'Name'}</Th>
                  <Th>{type === 'faqs' ? 'Category' : 'Details'}</Th>
                  <Th>Visible in app</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data?.items.map((item) => (
                  <tr key={item.id} className="hover:bg-panel-2/70">
                    <Td className="max-w-[360px]">
                      <div className="line-clamp-2 font-medium">{String(item[cfg.primary] ?? '')}</div>
                    </Td>
                    <Td className="max-w-[320px] text-ink-2">
                      {type === 'faqs' ? (
                        <Badge tone="brand">{String(item.category ?? 'general')}</Badge>
                      ) : (
                        <span className="line-clamp-1">{String(item[cfg.secondary ?? ''] ?? '–') || '–'}</span>
                      )}
                    </Td>
                    <Td>
                      <Toggle
                        label={`Toggle ${String(item[cfg.primary] ?? 'item')}`}
                        checked={item.isActive !== false}
                        onChange={(v) => toggleActive(item, v)}
                      />
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEditor(item)} />
                        <IconButton icon={Trash2} label="Delete" className="hover:text-bad" onClick={() => setRemoving(item)} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === 'new' ? `Add ${cfg.singular}` : `Edit ${cfg.singular}`}
        width="max-w-lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={save}>Save</Button>
          </>
        }
      >
        <div className="space-y-4">
          {cfg.fields.map((f) => (
            <Field key={f.key} label={f.label + (f.required ? ' *' : '')} hint={f.hint}>
              {f.kind === 'textarea' ? (
                <Textarea value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
              ) : f.kind === 'select' ? (
                <Select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                  {f.options?.map((o) => <option key={o}>{o}</option>)}
                </Select>
              ) : (
                <Input
                  type={f.kind === 'number' ? 'number' : 'text'}
                  value={form[f.key] ?? ''}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                />
              )}
            </Field>
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(removing)}
        danger
        busy={busyDelete}
        title={`Delete this ${cfg.singular}?`}
        confirmLabel="Delete"
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        body="This removes it from the app for everyone. This cannot be undone. Hide it instead if you might want it back."
      />
    </div>
  );
}
