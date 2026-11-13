import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ChoiceChips } from '@/components/ui/choice-chips';
import { DateField } from '@/components/ui/date-field';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useProfile } from '@/features/profile/use-profile';
import { useProperties, useUnits } from '@/features/properties/queries';
import { propertySetup } from '@/features/properties/setup-flow';
import { unitTypeLabel } from '@/features/properties/unit-types';
import {
  agreementEnd,
  emptyForm,
  firstDueDate,
  movedInEarlier,
  toInput,
  validateStep,
  withDueDay,
  withShiftDate,
  type AddTenantForm,
  type Errors,
} from '@/features/tenants/add-tenant-form';
import { DocSlot } from '@/features/tenants/doc-slot';
import { docTypeLabel, uploadDocument } from '@/features/tenants/documents';
import { useCreateTenant } from '@/features/tenants/queries';
import { today } from '@/lib/dates';
import type { PaymentMode } from '@/lib/db-types';
import { formatDate, formatINR } from '@/lib/format';
import { radius, space, useTheme } from '@/theme';

const STEP_TITLES = [
  'Who is the tenant?',
  'Which unit, and what rent?',
  'Advance and agreement',
  'Verification documents',
  'Check and save',
];

const MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'cheque', label: 'Cheque' },
];

const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

export default function AddTenant() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const profile = useProfile();
  const units = useUnits();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AddTenantForm>(() => {
    const initial = emptyForm(unitId ?? null, profile.data?.default_notice_period_days ?? 30);
    const unit = units.data?.find((u) => u.unit_id === unitId);
    return unit ? { ...initial, monthly_rent: String(unit.monthly_rent) } : initial;
  });
  const [errors, setErrors] = useState<Errors>({});
  const [saveState, setSaveState] = useState<{ status: string; error?: string } | null>(null);
  const createTenant = useCreateTenant();

  function patch(p: Partial<AddTenantForm>) {
    setForm((f) => ({ ...f, ...p }));
    const keys = Object.keys(p);
    if (keys.some((k) => errors[k])) setErrors((e) => ({ ...e, ...Object.fromEntries(keys.map((k) => [k, undefined])) }));
  }

  function next() {
    const found = validateStep(step, form);
    setErrors(found);
    if (Object.values(found).some(Boolean)) return;
    setStep((s) => s + 1);
  }

  function back() {
    if (step === 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/tenants');
    } else {
      setErrors({});
      setStep((s) => s - 1);
    }
  }

  async function save() {
    setSaveState({ status: 'Saving tenant…' });
    let tenancyId: string;
    let tenantId: string;
    try {
      const created = await createTenant.mutateAsync(toInput(form));
      tenancyId = created.tenancy_id;
      tenantId = created.tenant_id;
    } catch (e) {
      setSaveState({ status: '', error: e instanceof Error ? e.message : 'Couldn’t save the tenant. Try again.' });
      return;
    }

    let failed = 0;
    for (const [docType, file] of Object.entries(form.docs)) {
      if (!file) continue;
      setSaveState({ status: `Uploading ${docTypeLabel({ doc_type: docType as never })}…` });
      try {
        const result = await uploadDocument({ tenantId, docType: docType as never, file });
        if (!result.ok) failed++;
      } catch {
        failed++;
      }
    }

    router.replace({
      pathname: '/tenants/[id]',
      params: { id: tenancyId, ...(failed ? { uploadFailed: String(failed) } : {}) },
    });
  }

  const saving = !!saveState && !saveState.error;

  return (
    <Screen
      scroll
      header={{
        onBack: saving ? undefined : back,
        overline: `Step ${step + 1} of ${STEP_TITLES.length}`,
        title: STEP_TITLES[step],
      }}>
      <View style={styles.form}>
        {step === 0 ? <PersonStep form={form} patch={patch} errors={errors} /> : null}
        {step === 1 ? <UnitStep form={form} setForm={setForm} patch={patch} errors={errors} /> : null}
        {step === 2 ? <AgreementStep form={form} patch={patch} errors={errors} /> : null}
        {step === 3 ? <DocumentsStep form={form} patch={patch} /> : null}
        {step === 4 ? <ReviewStep form={form} goTo={setStep} /> : null}
      </View>

      {saveState?.error ? (
        <Text variant="caption" tone="overdue" style={styles.saveError} accessibilityLiveRegion="polite">
          {saveState.error}
        </Text>
      ) : null}
      {saving ? (
        <Text tone="inkMuted" style={styles.saveError} accessibilityLiveRegion="polite">
          {saveState.status}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {step < STEP_TITLES.length - 1 ? (
          <Button
            title={step === 3 && Object.keys(form.docs).length === 0 ? 'Skip for now' : 'Next'}
            variant={step === 3 && Object.keys(form.docs).length === 0 ? 'secondary' : 'primary'}
            onPress={next}
          />
        ) : (
          <Button title="Save tenant" onPress={save} loading={saving} />
        )}
      </View>
    </Screen>
  );
}

type StepProps = {
  form: AddTenantForm;
  patch: (p: Partial<AddTenantForm>) => void;
  errors: Errors;
};

function PersonStep({ form, patch, errors }: StepProps) {
  const [more, setMore] = useState(
    !!(form.alt_phone || form.permanent_address || form.occupation || form.emergency_name || form.aadhaar_last4)
  );
  return (
    <>
      <TextField
        label="Full name"
        value={form.full_name}
        onChangeText={(v) => patch({ full_name: v })}
        placeholder="Ravi Kumar"
        autoCapitalize="words"
        error={errors.full_name}
      />
      <TextField
        label="Mobile number"
        prefix="+91"
        value={form.phone}
        onChangeText={(v) => patch({ phone: digits(v, 10) })}
        placeholder="98765 43210"
        keyboardType="phone-pad"
        autoComplete="tel"
        error={errors.phone}
      />
      <View style={styles.inline}>
        <View style={styles.flex}>
          <Text variant="label">People living there</Text>
          <Text variant="caption" tone="inkMuted">
            Including the tenant
          </Text>
        </View>
        <Stepper
          label="people"
          value={form.member_count}
          min={1}
          max={20}
          onChange={(member_count) => patch({ member_count })}
        />
      </View>

      {more ? (
        <>
          <TextField
            label="Alternate number"
            prefix="+91"
            value={form.alt_phone}
            onChangeText={(v) => patch({ alt_phone: digits(v, 10) })}
            keyboardType="phone-pad"
            hint="Optional"
            error={errors.alt_phone}
          />
          <TextField
            label="Home-town address"
            value={form.permanent_address}
            onChangeText={(v) => patch({ permanent_address: v })}
            hint="Optional. Often needed for police verification."
            multiline
          />
          <TextField
            label="Occupation or workplace"
            value={form.occupation}
            onChangeText={(v) => patch({ occupation: v })}
            hint="Optional"
          />
          <TextField
            label="Emergency contact name"
            value={form.emergency_name}
            onChangeText={(v) => patch({ emergency_name: v })}
            autoCapitalize="words"
            hint="Optional"
          />
          <TextField
            label="Emergency contact number"
            prefix="+91"
            value={form.emergency_phone}
            onChangeText={(v) => patch({ emergency_phone: digits(v, 10) })}
            keyboardType="phone-pad"
            hint="Optional"
            error={errors.emergency_phone}
          />
          <TextField
            label="Last 4 digits of Aadhaar"
            value={form.aadhaar_last4}
            onChangeText={(v) => patch({ aadhaar_last4: digits(v, 4) })}
            keyboardType="number-pad"
            hint="Optional. Only the last 4 digits are saved."
            error={errors.aadhaar_last4}
          />
        </>
      ) : (
        <Button title="Add more details (optional)" variant="link" onPress={() => setMore(true)} />
      )}
    </>
  );
}

function UnitStep({
  form,
  setForm,
  errors,
}: StepProps & { setForm: React.Dispatch<React.SetStateAction<AddTenantForm>> }) {
  const { colors } = useTheme();
  const properties = useProperties();
  const units = useUnits();
  const vacant = (units.data ?? []).filter((u) => u.occupancy === 'vacant' || u.unit_id === form.unit_id);

  function pickUnit(unitId: string, rent: number) {
    setForm((f) => ({
      ...f,
      unit_id: unitId,
      monthly_rent: f.touched.rent ? f.monthly_rent : String(rent),
    }));
  }

  return (
    <>
      <View style={styles.group}>
        <Text variant="label">Unit</Text>
        {units.isPending || properties.isPending ? (
          <Text tone="inkMuted">Loading your units…</Text>
        ) : vacant.length === 0 ? (
          <View style={styles.group}>
            <Text tone="inkMuted">All your units have tenants. Add a property or more units first.</Text>
            <Button
              title="Add property"
              variant="secondary"
              onPress={() => {
                propertySetup.open();
                router.push('/onboarding/location');
              }}
            />
          </View>
        ) : (
          (properties.data ?? []).map((p) => {
            const own = vacant.filter((u) => u.property_id === p.id);
            if (!own.length) return null;
            return (
              <View key={p.id} style={styles.unitGroup}>
                <Text variant="caption" tone="inkMuted">
                  {p.name}
                </Text>
                {own.map((u) => {
                  const selected = form.unit_id === u.unit_id;
                  return (
                    <Pressable
                      key={u.unit_id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => pickUnit(u.unit_id, u.monthly_rent)}
                      style={[
                        styles.unitOption,
                        {
                          borderColor: selected ? colors.brand : colors.rule,
                          borderWidth: selected ? 2 : 1,
                          backgroundColor: colors.surface,
                        },
                      ]}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong">{u.name}</Text>
                        <Text variant="caption" tone="inkMuted">
                          {unitTypeLabel(u.unit_type, u.type_label)}
                          {u.floor ? `, ${u.floor}` : ''}
                        </Text>
                      </View>
                      <Text variant="amount">{formatINR(u.monthly_rent)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })
        )}
        {errors.unit_id ? (
          <Text variant="caption" tone="overdue">
            {errors.unit_id}
          </Text>
        ) : null}
      </View>

      <DateField
        label="Move-in date"
        value={form.shift_date}
        onChange={(d) => setForm((f) => withShiftDate(f, d))}
        hint="The day the tenant shifts in. Can be in the past for existing tenants."
      />
      <TextField
        label="Monthly rent"
        prefix="₹"
        value={form.monthly_rent}
        onChangeText={(v) =>
          setForm((f) => ({ ...f, monthly_rent: digits(v, 7), touched: { ...f.touched, rent: true } }))
        }
        keyboardType="number-pad"
        hint="Filled in from the unit. Change it if you agreed a different rent."
        error={errors.monthly_rent}
      />
      <TextField
        label="Rent due on day"
        value={form.rent_due_day}
        onChangeText={(v) => setForm((f) => withDueDay(f, v))}
        keyboardType="number-pad"
        hint="Day of the month, 1 to 31. In shorter months it's the last day."
        error={errors.rent_due_day}
      />
      {movedInEarlier(form) ? (
        <DateField
          label="When is their next rent due?"
          value={form.next_due}
          minimumDate={today()}
          onChange={(d) => setForm((f) => ({ ...f, next_due: d, touched: { ...f.touched, nextDue: true } }))}
          hint="RMS starts tracking rent from this date. Earlier months aren't added."
          error={errors.next_due}
        />
      ) : (
        <Text variant="caption" tone="inkMuted">
          First rent is due on the move-in date, {formatDate(form.shift_date)}.
        </Text>
      )}
    </>
  );
}

function AgreementStep({ form, patch, errors }: StepProps) {
  const agreed = Number(form.advance_agreed || 0);
  const received = Number(form.advance_received || 0);
  return (
    <>
      <Text variant="heading">Advance rent</Text>
      <TextField
        label="Advance agreed"
        prefix="₹"
        value={form.advance_agreed}
        onChangeText={(v) => patch({ advance_agreed: digits(v, 8) })}
        keyboardType="number-pad"
        placeholder="0"
        hint={
          Number(form.monthly_rent) > 0 && agreed > 0
            ? `${Math.round((agreed / Number(form.monthly_rent)) * 10) / 10} months of rent`
            : 'Rent paid up front, used against future rent'
        }
      />
      {agreed > 0 ? (
        <>
          <TextField
            label="Advance received so far"
            prefix="₹"
            value={form.advance_received}
            onChangeText={(v) => patch({ advance_received: digits(v, 8) })}
            keyboardType="number-pad"
            placeholder="0"
            hint={
              received >= agreed
                ? 'Advance done'
                : `${formatINR(agreed - received)} still pending`
            }
            error={errors.advance_received}
          />
          {received > 0 ? (
            <ChoiceChips
              label="Paid by"
              options={MODES}
              value={form.advance_mode}
              onChange={(advance_mode) => patch({ advance_mode })}
              wrap
            />
          ) : null}
        </>
      ) : null}

      <Text variant="heading" style={styles.sectionGap}>
        Agreement
      </Text>
      <DateField
        label="Agreement starts"
        value={form.agreement_start}
        onChange={(d) => patch({ agreement_start: d, touched: { ...form.touched, start: true } })}
      />
      <View style={styles.inline}>
        <View style={styles.flex}>
          <Text variant="label">Length in months</Text>
          <Text variant="caption" tone="inkMuted">
            Ends {formatDate(agreementEnd(form), new Date(0))}
          </Text>
        </View>
        <Stepper
          label="months"
          value={form.term_months}
          min={1}
          max={36}
          onChange={(term_months) => patch({ term_months })}
        />
      </View>
      <TextField
        label="Notice period"
        value={form.notice_period_days}
        onChangeText={(v) => patch({ notice_period_days: digits(v, 3) })}
        keyboardType="number-pad"
        hint="Days of notice before moving out"
        error={errors.notice_period_days}
      />
    </>
  );
}

function DocumentsStep({ form, patch }: Pick<StepProps, 'form' | 'patch'>) {
  const setDoc = (slot: keyof AddTenantForm['docs']) => (file: AddTenantForm['docs'][typeof slot]) => {
    const docs = { ...form.docs };
    if (file) docs[slot] = file;
    else delete docs[slot];
    patch({ docs });
  };
  const usingPdf = !!form.docs.aadhaar_pdf;
  const usingPhotos = !!(form.docs.aadhaar_front || form.docs.aadhaar_back);

  return (
    <>
      <Text tone="inkMuted">
        Add the tenant&apos;s Aadhaar as photos of both sides, or as one PDF. Files stay private to your
        account. You can also add these later.
      </Text>
      {!usingPdf ? (
        <>
          <DocSlot
            title="Aadhaar front"
            file={form.docs.aadhaar_front}
            onChange={setDoc('aadhaar_front')}
            sources={['camera', 'library']}
          />
          <DocSlot
            title="Aadhaar back"
            file={form.docs.aadhaar_back}
            onChange={setDoc('aadhaar_back')}
            sources={['camera', 'library']}
          />
        </>
      ) : null}
      {!usingPhotos ? (
        <DocSlot
          title={usingPdf ? 'Aadhaar PDF' : 'Or the full Aadhaar as a PDF'}
          file={form.docs.aadhaar_pdf}
          onChange={setDoc('aadhaar_pdf')}
          sources={['files']}
        />
      ) : null}
    </>
  );
}

function ReviewStep({ form, goTo }: { form: AddTenantForm; goTo: (step: number) => void }) {
  const { colors } = useTheme();
  const units = useUnits();
  const unit = units.data?.find((u) => u.unit_id === form.unit_id);
  const agreed = Number(form.advance_agreed || 0);
  const received = Number(form.advance_received || 0);
  const docCount = Object.keys(form.docs).length;

  const sections: { title: string; step: number; rows: [string, string][] }[] = [
    {
      title: 'Tenant',
      step: 0,
      rows: [
        ['Name', form.full_name.trim()],
        ['Mobile', `+91 ${form.phone.slice(0, 5)} ${form.phone.slice(5)}`],
        ['People', String(form.member_count)],
      ],
    },
    {
      title: 'Unit and rent',
      step: 1,
      rows: [
        ['Unit', unit ? unit.name : '—'],
        ['Moves in', formatDate(form.shift_date, new Date(0))],
        ['Rent', `${formatINR(Number(form.monthly_rent))} on day ${form.rent_due_day}`],
        ['First rent due', formatDate(firstDueDate(form), new Date(0))],
      ],
    },
    {
      title: 'Advance and agreement',
      step: 2,
      rows: [
        [
          'Advance',
          agreed === 0
            ? 'None'
            : received >= agreed
              ? `Done, ${formatINR(agreed)}`
              : `${formatINR(agreed - received)} pending of ${formatINR(agreed)}`,
        ],
        [
          'Agreement',
          `${form.term_months} months, ${formatDate(form.agreement_start, new Date(0))} to ${formatDate(agreementEnd(form), new Date(0))}`,
        ],
        ['Notice period', `${form.notice_period_days} days`],
      ],
    },
    {
      title: 'Documents',
      step: 3,
      rows: [['Aadhaar', docCount ? `${docCount} ${docCount === 1 ? 'file' : 'files'} attached` : 'Not added yet']],
    },
  ];

  return (
    <>
      {sections.map((s) => (
        <View key={s.title} style={[styles.reviewSection, { borderColor: colors.rule }]}>
          <View style={styles.reviewHead}>
            <Text variant="heading">{s.title}</Text>
            <Button title="Edit" variant="link" onPress={() => goTo(s.step)} />
          </View>
          {s.rows.map(([k, v]) => (
            <View key={k} style={styles.reviewRow}>
              <Text tone="inkMuted" style={styles.reviewKey}>
                {k}
              </Text>
              <Text variant="bodyStrong" style={styles.reviewValue}>
                {v}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  group: { gap: space.sm },
  unitGroup: { gap: space.sm, marginTop: space.xs },
  unitOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.md + 2,
    paddingVertical: space.sm,
    borderRadius: radius.control,
  },
  sectionGap: { marginTop: space.lg },
  reviewSection: { gap: space.xs, paddingBottom: space.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewRow: { flexDirection: 'row', gap: space.md },
  reviewKey: { width: 120 },
  reviewValue: { flex: 1 },
  saveError: { marginTop: space.lg },
  actions: { marginTop: space.xl },
});
