import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { HeaderBand } from '@/components/ui/header-band';
import { IconButton, icons } from '@/components/ui/icon-button';
import { Card, PaperGrain } from '@/components/ui/paper';
import { Stamp, type StampTone } from '@/components/ui/stamp';
import { Text } from '@/components/ui/text';
import { LeavingSection } from '@/features/lifecycle/leaving-section';
import { PaymentHistorySection } from '@/features/money/payment-history';
import { DocumentsSection } from '@/features/tenants/documents-section';
import { NotesSection } from '@/features/tenants/notes-section';
import { useRentCharges, useTenancySummary, useTenant } from '@/features/tenants/queries';
import { avatarTone, chargeStamp, daysUntil, formatPhone, rentStamp } from '@/features/tenants/status';
import { parseDay } from '@/lib/dates';
import type { TenancySummary } from '@/lib/db-types';
import { formatDate, formatINR, formatMonth } from '@/lib/format';
import { space, useTheme } from '@/theme';

const day = (d: string) => formatDate(parseDay(d));
const fullDay = (d: string) => formatDate(parseDay(d), new Date(0));

export default function TenantScreen() {
  const { id, uploadFailed } = useLocalSearchParams<{ id: string; uploadFailed?: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const summary = useTenancySummary(id);
  const t = summary.data;
  const tenant = useTenant(t?.tenant_id);
  const charges = useRentCharges(id);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/tenants'));

  if (!t) {
    return (
      <View style={[styles.flex, { backgroundColor: colors.paper }]}>
        <PaperGrain />
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
  const editDetails = () => router.push({ pathname: '/edit-tenant', params: { tenancyId: t.tenancy_id } });

  return (
    <View style={[styles.flex, { backgroundColor: colors.paper }]}>
      <PaperGrain />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxl }}
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
        <View style={styles.topBar}>
          <IconButton icon={icons.back} label="Back" onPress={back} />
          <Text variant="label" tone="inkMuted" style={styles.topTitle} numberOfLines={1}>
            {t.unit_name} · {t.property_name}
          </Text>
          <IconButton icon={icons.edit} label="Edit details" onPress={editDetails} />
        </View>

        <View style={styles.body}>
          <Card padding={18}>
            <View style={styles.profile}>
              <Avatar name={t.tenant_name} tone={avatarTone(t)} size={60} />
              <View style={styles.flex}>
                <Text variant="title" style={styles.name} accessibilityRole="header">
                  {t.tenant_name}
                </Text>
                <Text variant="caption" tone="inkMuted">
                  {formatPhone(t.tenant_phone)} · {t.member_count} {t.member_count === 1 ? 'person' : 'people'}
                </Text>
              </View>
            </View>
            {t.status === 'on_notice' || !t.has_aadhaar ? (
              <View style={styles.stamps}>
                {t.status === 'on_notice' && t.planned_move_out_date ? (
                  <Stamp label={`Leaving ${day(t.planned_move_out_date)}`} tone="due" />
                ) : null}
                {!t.has_aadhaar ? <Stamp label="Verification missing" tone="late" /> : null}
              </View>
            ) : null}
            <View style={styles.contact}>
              <View style={styles.flex}>
                <Button
                  title="Call"
                  icon={icons.call}
                  variant="secondary"
                  compact
                  onPress={() => Linking.openURL(`tel:${t.tenant_phone}`)}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  title="WhatsApp"
                  icon={icons.chat}
                  variant="secondary"
                  compact
                  onPress={() => Linking.openURL(`https://wa.me/91${phoneDigits}`)}
                />
              </View>
            </View>
          </Card>

          {uploadFailed ? (
            <Text variant="caption" tone="overdue">
              The tenant is saved, but {uploadFailed === '1' ? 'a document' : `${uploadFailed} documents`} didn&apos;t
              upload. Use &quot;Try again&quot; under Documents.
            </Text>
          ) : null}

          <Money t={t} stampLabel={stamp.label} stampTone={stamp.tone} />

          {t.latest_note ? (
            <View style={[styles.note, { backgroundColor: '#FBF1DF' }]}>
              <Text variant="caption" tone="inkMuted">
                Latest note
              </Text>
              <Text variant="bodyStrong" numberOfLines={3}>
                {t.latest_note}
              </Text>
            </View>
          ) : null}

          <View style={styles.section}>
            <Text variant="heading" style={styles.sectionTitle}>
              Rent by month
            </Text>
            <Card padding={0} style={styles.list}>
              {charges.data?.length === 0 ? (
                <Text tone="inkMuted" style={styles.emptyRow}>
                  No rent is due yet. The first month appears 31 days before its due date.
                </Text>
              ) : null}
              {charges.data?.map((c, i) => {
                const s = chargeStamp(c);
                const moved = c.due_date !== c.original_due_date;
                const last = i === charges.data!.length - 1;
                return (
                  <Pressable
                    key={c.rent_charge_id}
                    accessibilityRole="button"
                    accessibilityHint="Opens this month: payments, move the date, waive"
                    onPress={() =>
                      router.push({
                        pathname: '/rent-month',
                        params: { tenancyId: t.tenancy_id, chargeId: c.rent_charge_id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.ledgerRow,
                      !last && { borderBottomWidth: 1, borderColor: colors.hairline },
                      pressed && styles.pressed,
                    ]}>
                    <View style={styles.flex}>
                      <Text variant="bodyStrong">{formatMonth(parseDay(c.period_month))}</Text>
                      <Text variant="caption" tone="inkMuted">
                        Due {day(c.due_date)}
                        {moved ? ` · was ${day(c.original_due_date)}` : ''}
                        {c.paid > 0 && c.outstanding > 0 ? ` · ${formatINR(c.paid)} paid` : ''}
                      </Text>
                    </View>
                    <View style={styles.ledgerSide}>
                      <Text variant="amount" align="right">
                        {formatINR(c.amount_due)}
                      </Text>
                      <Stamp label={s.label} tone={s.tone} small />
                    </View>
                  </Pressable>
                );
              })}
            </Card>
          </View>

          <Card>
            <PaymentHistorySection tenancyId={t.tenancy_id} asOf={t.as_of} />
          </Card>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="heading">Agreement</Text>
              {t.agreement_reminder_date || t.agreement_end_date ? <RenewalPill t={t} /> : null}
            </View>
            <Card style={styles.kvCard}>
              <Row label="Moved in" value={fullDay(t.shift_date)} />
              {t.agreement_start_date && t.agreement_end_date ? (
                <>
                  <Row
                    label="Agreement"
                    value={`${fullDay(t.agreement_start_date)} – ${fullDay(t.agreement_end_date)}`}
                  />
                  <Row label="Renewal date" value={fullDay(t.agreement_reminder_date ?? t.agreement_end_date)} />
                </>
              ) : null}
              <Row label="Notice period" value={`${t.notice_period_days} days`} />
              <Row label="Rent" value={`${formatINR(t.monthly_rent)} on day ${t.rent_due_day}`} last />
              {t.status === 'active' ? (
                <View style={styles.contact}>
                  <View style={styles.flex}>
                    <Button
                      title="Renew agreement"
                      compact
                      onPress={() => router.push({ pathname: '/renew', params: { tenancyId: t.tenancy_id } })}
                    />
                  </View>
                  {t.agreement_id ? (
                    <View style={styles.flex}>
                      <Button
                        title="Move date"
                        variant="secondary"
                        compact
                        onPress={() =>
                          router.push({ pathname: '/move-date', params: { tenancyId: t.tenancy_id, what: 'renewal' } })
                        }
                      />
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
          </View>

          <Card>
            <LeavingSection t={t} />
          </Card>

          <Card>
            <DocumentsSection tenantId={t.tenant_id} />
          </Card>

          <Card>
            <NotesSection tenantId={t.tenant_id} tenancyId={t.tenancy_id} />
          </Card>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text variant="heading">Details</Text>
              <Button title="Edit" variant="link" onPress={editDetails} />
            </View>
            <Card style={styles.kvCard}>
              <Row label="Mobile" value={formatPhone(t.tenant_phone)} />
              {tenant.data?.alt_phone ? <Row label="Alternate" value={formatPhone(tenant.data.alt_phone)} /> : null}
              <Row label="People" value={String(t.member_count)} />
              {tenant.data?.occupation ? <Row label="Occupation" value={tenant.data.occupation} /> : null}
              {tenant.data?.permanent_address ? (
                <Row label="Home town" value={tenant.data.permanent_address} />
              ) : null}
              {tenant.data?.emergency_name || tenant.data?.emergency_phone ? (
                <Row
                  label="Emergency"
                  value={[
                    tenant.data.emergency_name,
                    tenant.data.emergency_phone && formatPhone(tenant.data.emergency_phone),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              ) : null}
              <Row
                label="Aadhaar"
                value={tenant.data?.aadhaar_last4 ? `•••• ${tenant.data.aadhaar_last4}` : 'Not added'}
                last
              />
            </Card>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function RenewalPill({ t }: { t: TenancySummary }) {
  const date = t.agreement_reminder_date ?? t.agreement_end_date!;
  const n = daysUntil(date, t.as_of);
  if (n > 60) return null;
  const label = n > 0 ? `Ends in ${n} ${n === 1 ? 'day' : 'days'}` : n === 0 ? 'Renewal today' : `Renewal ${-n} days ago`;
  return <Stamp label={label} tone={n < 0 ? 'late' : 'due'} small />;
}

function Money({
  t,
  stampLabel,
  stampTone,
}: {
  t: TenancySummary;
  stampLabel: string;
  stampTone: StampTone;
}) {
  const { colors } = useTheme();
  const tiles: { label: string; value: string; detail?: string }[] = [];
  if (t.next_due_date && t.next_due_amount) {
    tiles.push({ label: 'Next rent', value: day(t.next_due_date), detail: formatINR(t.next_due_amount) });
  }
  tiles.push({
    label: 'Last paid',
    value: t.last_paid_on ? day(t.last_paid_on) : '—',
    detail: t.last_paid_amount ? formatINR(t.last_paid_amount) : 'None yet',
  });
  if (t.advance_agreed > 0 || t.advance_received > 0) {
    tiles.push(
      t.advance_pending > 0
        ? { label: 'Advance', value: `${formatINR(t.advance_pending)}`, detail: 'pending' }
        : { label: 'Advance', value: formatINR(t.advance_balance), detail: 'held' }
    );
  }

  return (
    <Card padding={18} style={styles.money}>
      <View style={styles.sectionHead}>
        <Text variant="label" tone="inkMuted">
          Owed now
        </Text>
        <Stamp label={stampLabel} tone={stampTone} />
      </View>
      <View>
        <Text variant="display" style={styles.owed}>
          {formatINR(t.outstanding)}
        </Text>
        <Text variant="caption" tone="inkMuted">
          {t.outstanding > 0 && t.oldest_overdue_date
            ? `Oldest due ${day(t.oldest_overdue_date)}`
            : t.outstanding === 0
              ? 'Nothing owed'
              : 'Due today'}
        </Text>
      </View>
      <View style={styles.tiles}>
        {tiles.map((tile) => (
          <View key={tile.label} style={[styles.tile, { backgroundColor: colors.wash }]}>
            <Text variant="caption" tone="inkMuted">
              {tile.label}
            </Text>
            <Text variant="bodyStrong" numberOfLines={1}>
              {tile.value}
            </Text>
            {tile.detail ? (
              <Text variant="caption" tone="inkMuted" numberOfLines={1}>
                {tile.detail}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
      {t.status !== 'ended' ? (
        <View style={styles.moneyActions}>
          <Button
            title="Record payment"
            onPress={() => router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id } })}
          />
          {t.advance_pending > 0 ? (
            <Button
              title={`Record advance (${formatINR(t.advance_pending)} pending)`}
              variant="secondary"
              compact
              onPress={() =>
                router.push({ pathname: '/pay', params: { tenancyId: t.tenancy_id, kind: 'advance' } })
              }
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: 1, borderColor: colors.hairline }]}>
      <Text tone="inkMuted" style={styles.detailLabel}>
        {label}
      </Text>
      <Text variant="bodyStrong" align="right" style={styles.flex}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.md,
  },
  topTitle: { flex: 1, textAlign: 'center' },
  body: { paddingHorizontal: space.lg, gap: space.lg },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 22, lineHeight: 28 },
  stamps: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  contact: { flexDirection: 'row', gap: space.sm },
  money: { gap: 14 },
  owed: { fontSize: 42, lineHeight: 48 },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, borderRadius: 16, padding: space.md - 2, gap: 1 },
  moneyActions: { gap: space.sm },
  note: { borderRadius: 18, padding: 14, gap: 2 },
  section: { gap: space.md - 2 },
  sectionTitle: { paddingHorizontal: space.xs },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xs,
  },
  list: { paddingHorizontal: space.lg, gap: 0 },
  emptyRow: { paddingVertical: space.lg },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  ledgerSide: { alignItems: 'flex-end', gap: space.xs },
  pressed: { opacity: 0.7 },
  kvCard: { gap: 0, paddingVertical: space.xs },
  detailRow: { flexDirection: 'row', gap: space.md, paddingVertical: 11 },
  detailLabel: { width: 110 },
});
