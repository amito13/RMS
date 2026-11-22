import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Stepper } from '@/components/ui/stepper';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useEditTenant } from '@/features/lifecycle/queries';
import { useTenancySummary, useTenant } from '@/features/tenants/queries';
import type { Tenant, TenancySummary } from '@/lib/db-types';
import { formatINR } from '@/lib/format';
import { space } from '@/theme';

const PHONE = /^[6-9]\d{9}$/;
const strip = (p: string | null | undefined) => (p ?? '').replace(/^\+91/, '');
const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);

/** Edit tenant details and tenancy terms (PRD TEN-6). Param: tenancyId. */
export default function EditTenant() {
  const { tenancyId } = useLocalSearchParams<{ tenancyId: string }>();
  const summary = useTenancySummary(tenancyId);
  const tenant = useTenant(summary.data?.tenant_id);

  if (!summary.data || !tenant.data) {
    return <Screen header={{ onBack: () => router.back(), title: 'Edit details' }} />;
  }
  return <EditForm t={summary.data} tenant={tenant.data} />;
}

function EditForm({ t, tenant }: { t: TenancySummary; tenant: Tenant }) {
  const edit = useEditTenant(t.tenancy_id, t.tenant_id);
  const [f, setF] = useState({
    full_name: tenant.full_name,
    phone: strip(tenant.phone),
    alt_phone: strip(tenant.alt_phone),
    member_count: tenant.member_count,
    permanent_address: tenant.permanent_address ?? '',
    occupation: tenant.occupation ?? '',
    emergency_name: tenant.emergency_name ?? '',
    emergency_phone: strip(tenant.emergency_phone),
    aadhaar_last4: tenant.aadhaar_last4 ?? '',
    monthly_rent: String(t.monthly_rent),
    rent_due_day: String(t.rent_due_day),
    notice_period_days: String(t.notice_period_days),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));

  function validate() {
    const e: Record<string, string> = {};
    if (!f.full_name.trim()) e.full_name = 'Enter the tenant’s name.';
    if (!PHONE.test(f.phone)) e.phone = 'Enter a 10-digit mobile number.';
    if (f.alt_phone && !PHONE.test(f.alt_phone)) e.alt_phone = 'Enter a 10-digit mobile number, or leave it empty.';
    if (f.emergency_phone && !PHONE.test(f.emergency_phone)) e.emergency_phone = 'Enter a 10-digit mobile number, or leave it empty.';
    if (f.aadhaar_last4 && !/^\d{4}$/.test(f.aadhaar_last4)) e.aadhaar_last4 = 'Enter exactly 4 digits.';
    if (!(Number(f.monthly_rent) > 0)) e.monthly_rent = 'Enter the monthly rent.';
    const d = Number(f.rent_due_day);
    if (!(d >= 1 && d <= 31)) e.rent_due_day = 'Enter a day from 1 to 31.';
    const n = Number(f.notice_period_days);
    if (f.notice_period_days === '' || !(n >= 0 && n <= 180)) e.notice_period_days = 'Enter 0 to 180 days.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    setError(null);
    if (!validate()) return;
    const opt = (v: string) => (v.trim() ? v.trim() : null);
    try {
      await edit.mutateAsync({
        tenant: {
          full_name: f.full_name.trim(),
          phone: `+91${f.phone}`,
          alt_phone: f.alt_phone ? `+91${f.alt_phone}` : null,
          member_count: f.member_count,
          permanent_address: opt(f.permanent_address),
          occupation: opt(f.occupation),
          emergency_name: opt(f.emergency_name),
          emergency_phone: f.emergency_phone ? `+91${f.emergency_phone}` : null,
          aadhaar_last4: opt(f.aadhaar_last4),
        },
        tenancy: {
          monthly_rent: Number(f.monthly_rent),
          rent_due_day: Number(f.rent_due_day),
          notice_period_days: Number(f.notice_period_days),
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t save the changes.');
    }
  }

  const rentChanged = Number(f.monthly_rent) !== t.monthly_rent;
  const ended = t.status === 'ended';

  return (
    <Screen scroll header={{ onBack: () => router.back(), overline: `${t.unit_name}, ${t.property_name}`, title: 'Edit details' }}>
      <View style={styles.form}>
        <Text variant="heading">Tenant</Text>
        <TextField label="Full name" value={f.full_name} onChangeText={(v) => set({ full_name: v })} autoCapitalize="words" error={errors.full_name} />
        <TextField label="Mobile number" prefix="+91" value={f.phone} onChangeText={(v) => set({ phone: digits(v, 10) })} keyboardType="phone-pad" error={errors.phone} />
        <View style={styles.inline}>
          <View style={styles.flex}>
            <Text variant="label">People living there</Text>
          </View>
          <Stepper label="people" value={f.member_count} min={1} max={20} onChange={(member_count) => set({ member_count })} />
        </View>
        <TextField label="Alternate number" prefix="+91" value={f.alt_phone} onChangeText={(v) => set({ alt_phone: digits(v, 10) })} keyboardType="phone-pad" hint="Optional" error={errors.alt_phone} />
        <TextField label="Home-town address" value={f.permanent_address} onChangeText={(v) => set({ permanent_address: v })} multiline hint="Optional" />
        <TextField label="Occupation or workplace" value={f.occupation} onChangeText={(v) => set({ occupation: v })} hint="Optional" />
        <TextField label="Emergency contact name" value={f.emergency_name} onChangeText={(v) => set({ emergency_name: v })} autoCapitalize="words" hint="Optional" />
        <TextField label="Emergency contact number" prefix="+91" value={f.emergency_phone} onChangeText={(v) => set({ emergency_phone: digits(v, 10) })} keyboardType="phone-pad" hint="Optional" error={errors.emergency_phone} />
        <TextField label="Last 4 digits of Aadhaar" value={f.aadhaar_last4} onChangeText={(v) => set({ aadhaar_last4: digits(v, 4) })} keyboardType="number-pad" hint="Optional" error={errors.aadhaar_last4} />

        {!ended ? (
          <>
            <Text variant="heading" style={styles.sectionGap}>
              Rent terms
            </Text>
            <TextField
              label="Monthly rent"
              prefix="₹"
              value={f.monthly_rent}
              onChangeText={(v) => set({ monthly_rent: digits(v, 7) })}
              keyboardType="number-pad"
              hint={
                rentChanged
                  ? `Applies to months not added yet. Months already listed stay at ${formatINR(t.monthly_rent)}. To raise rent at renewal, use Renew agreement.`
                  : undefined
              }
              error={errors.monthly_rent}
            />
            <TextField
              label="Rent due on day"
              value={f.rent_due_day}
              onChangeText={(v) => set({ rent_due_day: digits(v, 2) })}
              keyboardType="number-pad"
              hint="Applies to months not added yet. To move one month, use Move due date."
              error={errors.rent_due_day}
            />
            <TextField
              label="Notice period"
              value={f.notice_period_days}
              onChangeText={(v) => set({ notice_period_days: digits(v, 3) })}
              keyboardType="number-pad"
              hint="Days of notice before moving out"
              error={errors.notice_period_days}
            />
          </>
        ) : null}

        {error ? (
          <Text variant="caption" tone="overdue" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button title="Save changes" onPress={save} loading={edit.isPending} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  flex: { flex: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  sectionGap: { marginTop: space.md },
});
