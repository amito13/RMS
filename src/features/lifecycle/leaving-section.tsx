import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { parseDay } from '@/lib/dates';
import type { TenancySummary } from '@/lib/db-types';
import { formatDate } from '@/lib/format';
import { space } from '@/theme';

import { daysUntil } from '../tenants/status';

import { useWithdrawNotice } from './queries';

const full = (d: string) => formatDate(parseDay(d), new Date(0));

/** Notice and move-out on the tenant screen (PRD 7.10). */
export function LeavingSection({ t }: { t: TenancySummary }) {
  const withdraw = useWithdrawNotice(t.tenancy_id);
  const [withdrawing, setWithdrawing] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (t.status === 'ended') {
    return (
      <View style={styles.section}>
        <Text variant="heading">Moved out</Text>
        <Text>
          Left on {t.move_out_date ? full(t.move_out_date) : 'an unknown date'}. This record is kept for your history.
        </Text>
      </View>
    );
  }

  const params = { tenancyId: t.tenancy_id };

  if (t.status === 'active') {
    return (
      <View style={styles.section}>
        <Text variant="heading">Leaving</Text>
        <Text tone="inkMuted">
          When {t.tenant_name.split(' ')[0]} gives notice, record it here. The unit then shows when it becomes
          available.
        </Text>
        <Button title="Record notice" variant="secondary" onPress={() => router.push({ pathname: '/notice', params })} />
        <Button
          title="End tenancy now, without notice"
          variant="link"
          onPress={() => router.push({ pathname: '/end-tenancy', params })}
        />
      </View>
    );
  }

  // On notice.
  const n = t.planned_move_out_date ? daysUntil(t.planned_move_out_date, t.as_of) : 0;
  const when = n > 0 ? `in ${n} ${n === 1 ? 'day' : 'days'}` : n === 0 ? 'today' : `${-n} days ago`;

  async function confirmWithdraw() {
    setError(null);
    try {
      await withdraw.mutateAsync(reason.trim());
      setWithdrawing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Couldn’t withdraw the notice.');
    }
  }

  return (
    <View style={styles.section}>
      <Text variant="heading">Leaving</Text>
      <Text>
        {t.notice_given_by === 'landlord' ? 'You asked them to leave' : 'Gave notice'} on{' '}
        {t.notice_date ? full(t.notice_date) : '—'}. Leaving on {t.planned_move_out_date ? full(t.planned_move_out_date) : '—'} ({when}).
      </Text>
      {t.is_short_notice ? (
        <Text variant="caption" tone="due">
          Short notice: {t.short_by_days} days less than the agreed {t.notice_period_days} days.
        </Text>
      ) : null}

      <Button
        title="End tenancy and settle"
        variant={n <= 0 ? 'primary' : 'secondary'}
        onPress={() => router.push({ pathname: '/end-tenancy', params })}
      />
      <Button
        title="Change move-out date"
        variant="link"
        onPress={() => router.push({ pathname: '/move-date', params: { ...params, what: 'move_out' } })}
      />
      {withdrawing ? (
        <>
          <TextField label="Why are they staying?" value={reason} onChangeText={setReason} placeholder="Job transfer cancelled" hint="Optional" />
          {error ? (
            <Text variant="caption" tone="overdue">
              {error}
            </Text>
          ) : null}
          <Button title="Withdraw notice" variant="secondary" onPress={confirmWithdraw} loading={withdraw.isPending} />
          <Button title="Cancel" variant="link" onPress={() => setWithdrawing(false)} />
        </>
      ) : (
        <Button title="Tenant is staying: withdraw notice" variant="link" onPress={() => setWithdrawing(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.sm },
});
