import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { Stamp } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { LeavingSection } from '@/features/lifecycle/leaving-section';
import { PaymentHistorySection } from '@/features/money/payment-history';
import { DocumentsSection } from '@/features/tenants/documents-section';
import { NotesSection } from '@/features/tenants/notes-section';
import { useRentCharges, useTenancySummary, useTenant } from '@/features/tenants/queries';
import { chargeStamp, daysUntil, formatPhone, rentStamp } from '@/features/tenants/status';
import { parseDay } from '@/lib/dates';
import type { TenancySummary } from '@/lib/db-types';
import { formatDate, formatINR, formatMonth } from '@/lib/format';
import { space, useTheme } from '@/theme';

const day = (d: string) => formatDate(parseDay(d));
const fullDay = (d: string) => formatDate(parseDay(d), new Date(0));

export default function TenantScreen() {
  const { id, uploadFailed } = useLocalSearchParams<{ id: string; uploadFailed?: string }>();
  const { colors } = useTheme();
  const summary = useTenancySummary(id);
  const t = summary.data;
  const tenant = useTenant(t?.tenant_id);
  const charges = useRentCharges(id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/tenants'));

  if (!t) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.paper }]}>
        <HeaderBand onBack={back} title="Tenant" />
        <View style={styles.body}>
          {summary.isPending ? (
            <ActivityIndicator color={colors.brand} accessibilityLabel="Loading tenant" />
          ) : (
            <Text tone="inkMuted">This tenant wasn&apos;t found.</Text>
          )}
        </View>
      </View>
    );
  }

  const stamp = rentStamp(t);
  const phoneDigits = t.tenant_phone.replace(/^\+91/, '');

  return (
    <ScrollView
      style={{ backgroundColor: colors.paper }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => {
            summary.refetch();
            charges.refetch();
            tenant.refetch();
          }}
          tintColor={colors.brand}
          colors={[colors.brand]}
        />
      }>
      <HeaderBand onBack={back} title={t.tenant_name} subtitle={`${t.unit_name}, ${t.property_name}`} />

      <View style={styles.body}>
        <View style={styles.stamps}>
          <Stamp label={stamp.label} tone={stamp.tone} tilted />
          {t.status === 'on_notice' && t.planned_move_out_date ? (
            <Stamp label={`Leaving ${day(t.planned_move_out_date)}`} tone="due" />
          ) : null}
          {!t.has_aadhaar ? <Stamp label="Verification missing" tone="late" /> : null}
        </View>

        {uploadFailed ? (
          <Text variant="caption" tone="overdue">
            The tenant is saved, but {uploadFailed === '1' ? 'a document' : `${uploadFailed} documents`} didn&apos;t
            upload. Use &quot;Try again&quot; under Documents.
          </Text>
        ) : null}

        {t.latest_note ? (
          <View style={[styles.latestNote, { borderColor: colors.brand }]}>
            <Text variant="caption" tone="inkMuted">
              Latest note
            </Text>
            <Text numberOfLines={3}>{t.latest_note}</Text>
          </View>
        ) : null}

        <View style={styles.contact}>
          <View style={styles.flex}>
            <Button title="Call" variant="secondary" onPress={() => Linking.openURL(`tel:${t.tenant_phone}`)} />
          </View>
          <View style={styles.flex}>
            <Button
              title="WhatsApp"
              variant="secondary"
              onPress={() => Linking.openURL(`https://wa.me/91${phoneDigits}`)}
            />
          </View>
        </View>

        <Money t={t} />

        {t.status !== 'ended' ? (
          <View style={styles.moneyActions}>
            <Button
              title={t.outstanding > 0 ? `Record payment (${formatINR(t.outstanding)} owed)` : 'Record payment'}
              onPress={() => router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id } })}
            />
            {t.advance_pending > 0 ? (
              <Button
                title={`Record advance (${formatINR(t.advance_pending)} pending)`}
                variant="link"
                onPress={() =>
                  router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id, kind: 'advance' } })
                }
              />
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="heading">Rent by month</Text>
          {charges.data?.length === 0 ? (
            <Text tone="inkMuted">
              No rent is due yet. The first month appears 31 days before its due date.
            </Text>
          ) : null}
          {charges.data?.map((c, i) => {
            const s = chargeStamp(c);
            const moved = c.due_date !== c.original_due_date;
            return (
              <Pressable
                key={c.rent_charge_id}
                accessibilityRole="button"
                accessibilityHint="Opens this month: payments, move the date, waive"
                onPress={() =>
                  router.push({ pathname: '/rent-month', params: { tenancyId: t.tenancy_id, chargeId: c.rent_charge_id } })
                }
                style={({ pressed }) => [
                  styles.ledgerRow,
                  { borderColor: colors.rule },
                  i === 0 && styles.firstRow,
                  pressed && { backgroundColor: colors.surface },
                ]}>
                <View style={styles.flex}>
                  <Text variant="bodyStrong">{formatMonth(parseDay(c.period_month))}</Text>
                  <Text variant="caption" tone="inkMuted">
                    Due {day(c.due_date)}
                    {moved ? ` (was ${day(c.original_due_date)})` : ''}
                    {c.paid > 0 && c.outstanding > 0 ? `, ${formatINR(c.paid)} paid` : ''}
                  </Text>
                </View>
                <View style={styles.ledgerSide}>
                  <Text variant="amount" align="right">
                    {formatINR(c.amount_due)}
                  </Text>
                  <Stamp label={s.label} tone={s.tone} />
                </View>
              </Pressable>
            );
          })}
        </View>

        <PaymentHistorySection tenancyId={t.tenancy_id} asOf={t.as_of} />

        <View style={styles.section}>
          <Text variant="heading">Agreement</Text>
          <Row label="Moved in" value={fullDay(t.shift_date)} />
          {t.agreement_start_date && t.agreement_end_date ? (
            <>
              <Row
                label="Agreement"
                value={`${t.agreement_term_months} months, ${fullDay(t.agreement_start_date)} to ${fullDay(t.agreement_end_date)}`}
              />
              <Row label="Renewal date" value={renewalText(t)} />
            </>
          ) : null}
          <Row label="Notice period" value={`${t.notice_period_days} days`} />
          <Row label="Rent" value={`${formatINR(t.monthly_rent)}, due on day ${t.rent_due_day}`} />
          {t.status === 'active' ? (
            <View style={styles.sectionActions}>
              <Button
                title="Renew agreement"
                variant="secondary"
                onPress={() => router.push({ pathname: '/renew', params: { tenancyId: t.tenancy_id } })}
              />
              {t.agreement_id ? (
                <Button
                  title="Move renewal date"
                  variant="link"
                  onPress={() =>
                    router.push({ pathname: '/move-date', params: { tenancyId: t.tenancy_id, what: 'renewal' } })
                  }
                />
              ) : null}
            </View>
          ) : null}
        </View>

        <LeavingSection t={t} />

        <DocumentsSection tenantId={t.tenant_id} />

        <NotesSection tenantId={t.tenant_id} tenancyId={t.tenancy_id} />

        <View style={styles.section}>
          <Text variant="heading">Details</Text>
          <Row label="Mobile" value={formatPhone(t.tenant_phone)} />
          {tenant.data?.alt_phone ? <Row label="Alternate" value={formatPhone(tenant.data.alt_phone)} /> : null}
          <Row label="People" value={String(t.member_count)} />
          {tenant.data?.occupation ? <Row label="Occupation" value={tenant.data.occupation} /> : null}
          {tenant.data?.permanent_address ? <Row label="Home-town address" value={tenant.data.permanent_address} /> : null}
          {tenant.data?.emergency_name || tenant.data?.emergency_phone ? (
            <Row
              label="Emergency contact"
              value={[tenant.data.emergency_name, tenant.data.emergency_phone && formatPhone(tenant.data.emergency_phone)]
                .filter(Boolean)
                .join(', ')}
            />
          ) : null}
          {tenant.data?.aadhaar_last4 ? <Row label="Aadhaar" value={`Ends in ${tenant.data.aadhaar_last4}`} /> : null}
          <Button
            title="Edit details"
            variant="link"
            onPress={() => router.push({ pathname: '/edit-tenant', params: { tenancyId: t.tenancy_id } })}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function renewalText(t: TenancySummary) {
  const date = t.agreement_reminder_date ?? t.agreement_end_date!;
  const n = daysUntil(date, t.as_of);
  const when = n > 0 ? `in ${n} ${n === 1 ? 'day' : 'days'}` : n === 0 ? 'today' : `${-n} days ago`;
  return `${fullDay(date)} (${when})`;
}

function Money({ t }: { t: TenancySummary }) {
  const { colors } = useTheme();
  const rows: { label: string; amount: string; detail?: string; tone?: 'overdue' | 'paid' }[] = [
    {
      label: 'Owed now',
      amount: formatINR(t.outstanding),
      detail: t.outstanding > 0 && t.oldest_overdue_date ? `Oldest due ${day(t.oldest_overdue_date)}` : t.outstanding === 0 ? 'Nothing owed' : 'Due today',
      tone: t.overdue_amount > 0 ? 'overdue' : undefined,
    },
  ];
  if (t.next_due_date && t.next_due_amount) {
    rows.push({
      label: 'Next rent',
      amount: formatINR(t.next_due_amount),
      detail:
        `on ${day(t.next_due_date)}` +
        (t.next_original_due_date && t.next_original_due_date !== t.next_due_date
          ? ` (was ${day(t.next_original_due_date)})`
          : ''),
    });
  }
  rows.push({
    label: 'Last paid',
    amount: t.last_paid_amount ? formatINR(t.last_paid_amount) : '—',
    detail: t.last_paid_on ? `on ${day(t.last_paid_on)}` : 'No payments recorded yet',
  });
  if (t.advance_agreed > 0 || t.advance_received > 0) {
    rows.push({
      label: 'Advance',
      amount: t.advance_pending > 0 ? `${formatINR(t.advance_pending)} pending` : 'Done',
      detail:
        t.advance_pending > 0
          ? `${formatINR(t.advance_received)} of ${formatINR(t.advance_agreed)} received`
          : `${formatINR(t.advance_balance)} held for future rent`,
      tone: t.advance_pending > 0 ? undefined : 'paid',
    });
  }

  return (
    <View style={styles.section}>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.ledgerRow, { borderColor: colors.rule }, i === 0 && styles.firstRow]}>
          <View style={styles.flex}>
            <Text variant="bodyStrong">{r.label}</Text>
            {r.detail ? (
              <Text variant="caption" tone="inkMuted">
                {r.detail}
              </Text>
            ) : null}
          </View>
          <Text variant="amount" align="right" tone={r.tone ?? 'ink'}>
            {r.amount}
          </Text>
        </View>
      ))}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text tone="inkMuted" style={styles.detailLabel}>
        {label}
      </Text>
      <Text style={styles.flex}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { paddingHorizontal: space.lg, paddingVertical: space.xl, gap: space.xxl },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center', marginBottom: -space.md },
  latestNote: { borderLeftWidth: 3, paddingLeft: space.md, gap: 2 },
  contact: { flexDirection: 'row', gap: space.sm },
  moneyActions: { gap: space.xs, marginTop: -space.lg },
  section: { gap: space.sm },
  sectionActions: { gap: space.xs, marginTop: space.sm },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  firstRow: { borderTopWidth: StyleSheet.hairlineWidth },
  ledgerSide: { alignItems: 'flex-end', gap: space.xs },
  detailRow: { flexDirection: 'row', gap: space.md, paddingVertical: 2 },
  detailLabel: { width: 130 },
});
