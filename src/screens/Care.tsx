import { useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Star, Stethoscope } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { admin } from '../lib/endpoints';
import type { DoctorFull } from '../lib/types';
import { useDebounced, useResource } from '../lib/useResource';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, Field, Input, PageHeader, Pagination, SearchInput, Segmented, Skeleton, TableSkeleton, Td, Textarea, Th, Toggle } from '../ui/kit';
import { Drawer, useToast } from '../ui/overlay';

type Tab = 'doctors' | 'clinics';

export function Care() {
  const [tab, setTab] = useState<Tab>('doctors');
  return (
    <div className="rise">
      <PageHeader
        title="Care network"
        description="Doctors and clinics people can find in the app."
        actions={
          <Segmented
            options={[
              { label: 'Doctors', value: 'doctors' as Tab },
              { label: 'Clinics', value: 'clinics' as Tab },
            ]}
            value={tab}
            onChange={setTab}
          />
        }
      />
      {tab === 'doctors' ? <Doctors /> : <Clinics />}
    </div>
  );
}

function Doctors() {
  const toast = useToast();
  const { me } = useAuth();
  const canEdit = Boolean(me?.isSuperAdmin);
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  const list = useResource((s) => admin.doctors({ search: q, page, limit: 15 }, s), [q, page]);

  const toggle = async (id: string, isActive: boolean) => {
    try {
      await admin.setDoctorStatus(id, isActive);
      toast.success(isActive ? 'Doctor is visible' : 'Doctor hidden from the app');
      list.reload();
    } catch (err) {
      toast.error('Could not update', (err as Error).message);
    }
  };

  return (
    <>
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div className="w-full max-w-sm">
          <SearchInput placeholder="Search name, email or specialty…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        {canEdit && <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>Add doctor</Button>}
      </div>
      {list.loading ? (
        <TableSkeleton rows={7} cols={5} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.data && list.data.doctors.length === 0 ? (
        <EmptyState icon={Stethoscope} title="No doctors found" body="Doctor profiles will appear here." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-panel-2/60">
                <tr>
                  <Th>Doctor</Th>
                  <Th>Specialty</Th>
                  <Th>Location</Th>
                  <Th>Rating</Th>
                  <Th>Listed</Th>
                  <Th />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data?.doctors.map((d) => (
                  <tr key={d.id} className="hover:bg-panel-2/70">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={d.name} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{d.name}</div>
                          <div className="truncate text-[13px] text-ink-3">{d.email}</div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div>{d.specialty || '–'}</div>
                      {d.organization && <div className="text-[13px] text-ink-3">{d.organization}</div>}
                    </Td>
                    <Td className="text-ink-2">{[d.city, d.state].filter(Boolean).join(', ') || '–'}</Td>
                    <Td>
                      <span className="num inline-flex items-center gap-1 font-medium">
                        <Star className="size-3.5 fill-warn text-warn" />
                        {d.rating ? d.rating.toFixed(1) : '–'}
                        <span className="font-normal text-ink-3">({d.reviews})</span>
                      </span>
                    </Td>
                    <Td>
                      <Toggle label={`List ${d.name}`} checked={d.isActive} onChange={(v) => toggle(d.id, v)} />
                    </Td>
                    <Td>
                      <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setEditing(d.id)}>
                        {canEdit ? 'Edit' : 'View'}
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data && (
            <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="doctors" onChange={setPage} />
          )}
        </>
      )}
    </Card>
    <DoctorEditor
      id={editing}
      canEdit={canEdit}
      onClose={() => setEditing(null)}
      onSaved={() => {
        setEditing(null);
        list.reload();
      }}
    />
    </>
  );
}

const EMPTY_DOCTOR: Partial<DoctorFull> = {
  firstName: '', lastName: '', email: '', phoneNumber: '', specialty: '', subSpecialty: '',
  licenseNumber: '', yearsOfExperience: 0, hospitalName: '', clinicName: '', bio: '',
  consultationFee: 0, isActive: true, acceptsNewPatients: true, profilePicture: '',
  address: {}, availableHours: { start: '09:00', end: '17:00' },
};

function DoctorEditor({
  id, canEdit, onClose, onSaved,
}: { id: string | null; canEdit: boolean; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const isNew = id === 'new';
  const [form, setForm] = useState<Partial<DoctorFull>>(EMPTY_DOCTOR);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    if (isNew) {
      setForm(EMPTY_DOCTOR);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    admin.doctor(id, ctrl.signal)
      .then(setForm)
      .catch((e: Error) => {
        if (e.name !== 'AbortError') toast.error('Could not load doctor', e.message);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = <K extends keyof DoctorFull>(k: K, v: DoctorFull[K]) => setForm((f) => ({ ...f, [k]: v }));
  const text = (k: keyof DoctorFull, label: string, extra?: { type?: string; hint?: string }) => (
    <Field label={label} hint={extra?.hint}>
      <Input
        type={extra?.type}
        value={String(form[k] ?? '')}
        disabled={!canEdit}
        onChange={(e) => set(k, (extra?.type === 'number' ? Number(e.target.value) : e.target.value) as never)}
      />
    </Field>
  );
  const valid = ['firstName', 'lastName', 'email', 'phoneNumber', 'specialty', 'licenseNumber', 'hospitalName']
    .every((k) => String(form[k as keyof DoctorFull] ?? '').trim());

  const save = async () => {
    setBusy(true);
    try {
      const { id: _id, ...body } = form as DoctorFull;
      void _id;
      await admin.saveDoctor(isNew ? null : id, body);
      toast.success(isNew ? 'Doctor added' : 'Doctor saved');
      onSaved();
    } catch (err) {
      toast.error('Could not save', (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={Boolean(id)} onClose={onClose} title={isNew ? 'Add doctor' : 'Doctor profile'} width="max-w-2xl">
      {loading ? (
        <div className="space-y-4"><Skeleton className="h-12" /><Skeleton className="h-40" /><Skeleton className="h-40" /></div>
      ) : (
        <div className="space-y-5">
          <p className="rounded-xl bg-panel-2 px-3.5 py-2.5 text-[13px] text-ink-3 hairline">
            This is the public directory profile shown to patients. It does not create a sign-in account.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {text('firstName', 'First name')}
            {text('lastName', 'Last name')}
            {text('email', 'Email', { type: 'email' })}
            {text('phoneNumber', 'Phone')}
            {text('specialty', 'Specialty')}
            {text('subSpecialty', 'Sub-specialty')}
            {text('licenseNumber', 'License number')}
            {text('yearsOfExperience', 'Years of experience', { type: 'number' })}
            {text('hospitalName', 'Hospital / organisation')}
            {text('clinicName', 'Clinic')}
            {text('consultationFee', 'Consultation fee', { type: 'number' })}
            {text('profilePicture', 'Photo URL')}
          </div>
          <Field label="Bio">
            <Textarea rows={3} value={form.bio ?? ''} disabled={!canEdit} onChange={(e) => set('bio', e.target.value)} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['street', 'city', 'state', 'zipCode', 'country'] as const).map((k) => (
              <Field key={k} label={k === 'zipCode' ? 'Postcode' : k[0].toUpperCase() + k.slice(1)}>
                <Input value={form.address?.[k] ?? ''} disabled={!canEdit}
                  onChange={(e) => set('address', { ...form.address, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Opens">
              <Input type="time" value={form.availableHours?.start ?? '09:00'} disabled={!canEdit}
                onChange={(e) => set('availableHours', { ...form.availableHours, start: e.target.value })} />
            </Field>
            <Field label="Closes">
              <Input type="time" value={form.availableHours?.end ?? '17:00'} disabled={!canEdit}
                onChange={(e) => set('availableHours', { ...form.availableHours, end: e.target.value })} />
            </Field>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-xl bg-panel-2 px-4 py-3 hairline">
              <span className="text-sm font-medium text-ink">Listed in the app</span>
              <Toggle label="Listed" checked={form.isActive !== false} disabled={!canEdit} onChange={(v) => set('isActive', v)} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-panel-2 px-4 py-3 hairline">
              <span className="text-sm font-medium text-ink">Accepting new patients</span>
              <Toggle label="Accepting new patients" checked={form.acceptsNewPatients !== false} disabled={!canEdit}
                onChange={(v) => set('acceptsNewPatients', v)} />
            </div>
          </div>
          {canEdit ? (
            <div className="flex justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button variant="primary" loading={busy} disabled={!valid} onClick={save}>
                {isNew ? 'Add doctor' : 'Save changes'}
              </Button>
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">Only super admins can edit doctor profiles.</p>
          )}
        </div>
      )}
    </Drawer>
  );
}

function Clinics() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const q = useDebounced(search.trim());
  const list = useResource((s) => admin.clinics({ search: q, page, limit: 15 }, s), [q, page]);

  return (
    <Card padded={false}>
      <div className="border-b border-line p-4">
        <div className="max-w-sm">
          <SearchInput placeholder="Search clinic, city or address…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {list.loading ? (
        <TableSkeleton rows={7} cols={4} />
      ) : list.error && !list.data ? (
        <ErrorState error={list.error} onRetry={list.reload} />
      ) : list.data && list.data.clinics.length === 0 ? (
        <EmptyState icon={MapPin} title="No clinics found" />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px]">
              <thead className="border-b border-line bg-panel-2/60">
                <tr>
                  <Th>Clinic</Th>
                  <Th>Address</Th>
                  <Th>Phone</Th>
                  <Th>Rating</Th>
                  <Th>New patients</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.data?.clinics.map((c) => (
                  <tr key={c.id} className="hover:bg-panel-2/70">
                    <Td>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-[13px] text-ink-3">{c.type.replace(/_/g, ' ')}</div>
                    </Td>
                    <Td className="max-w-[300px] text-ink-2"><span className="line-clamp-2">{c.address}</span></Td>
                    <Td className="num text-ink-2">{c.phone || '–'}</Td>
                    <Td className="num">{c.rating ? c.rating.toFixed(1) : '–'}</Td>
                    <Td>
                      {c.acceptingNewPatients ? <Badge tone="ok" dot>Accepting</Badge> : <Badge tone="neutral">Closed</Badge>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.data && (
            <Pagination page={list.data.page} pages={list.data.pages} total={list.data.total} noun="clinics" onChange={setPage} />
          )}
        </>
      )}
    </Card>
  );
}
