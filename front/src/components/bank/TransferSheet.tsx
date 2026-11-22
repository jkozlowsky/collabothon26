import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ContactAvatar } from '@/components/bank/ContactAvatar';
import { Icon } from '@/components/bank/Icon';
import { Keypad } from '@/components/bank/Keypad';
import { Sheet } from '@/components/bank/Sheet';
import { Button } from '@/components/Button';
import { motion } from '@/components/onboarding/ui';
import { colors, radii, spacing, type } from '@/constants/theme';
import { useBank } from '@/hooks/useBank';
import { formatEUR, groupIban, isValidIban, parseAmount } from '@/lib/bank/money';
import { resolveRecipient, validateTransfer } from '@/lib/bank/reducer';
import type { TransferRecipient } from '@/types/bank';

/** Where the flow starts: the contact list, a known contact (skips to amount), or the new-recipient form. */
export type TransferStart = { kind: 'pick' } | { kind: 'contact'; contactId: string } | { kind: 'new' };

type Step = 'recipient' | 'amount' | 'confirm' | 'done';

type Props = { start: TransferStart | null; onClose: () => void };

const TITLE: Record<Step, string> = { recipient: 'Send money', amount: 'Amount', confirm: 'Check and send', done: 'Sent' };
/** Where the sheet's back arrow leads; the first and the last step have none. */
const PREVIOUS: Partial<Record<Step, Step>> = { amount: 'recipient', confirm: 'amount' };

/** Three-step transfer: recipient → amount → confirm, then a success state. Books into the mock bank. */
export function TransferSheet({ start, onClose }: Props) {
  const { state, sendTransfer } = useBank();
  // State starts from `start`; the provider re-keys this component on every opening for a fresh flow.
  const [step, setStep] = useState<Step>(start?.kind === 'contact' ? 'amount' : 'recipient');
  const [recipient, setRecipient] = useState<TransferRecipient | null>(
    start?.kind === 'contact' ? { contactId: start.contactId } : null,
  );
  const [newMode, setNewMode] = useState(start?.kind === 'new');
  const [name, setName] = useState('');
  const [iban, setIban] = useState('');
  const [amountText, setAmountText] = useState('');
  const [reference, setReference] = useState('');
  const [sent, setSent] = useState<{ amount: number; name: string } | null>(null);

  const amount = parseAmount(amountText) ?? 0;
  const contact = recipient ? resolveRecipient(state, recipient) : null;
  const amountError = recipient && amountText ? validateTransfer(state, { recipient, amount, reference }) : null;
  const newRecipientError = name.trim() && iban && !isValidIban(iban) ? 'Enter a German IBAN: DE followed by 20 digits.' : null;

  const previous = PREVIOUS[step];

  const send = () => {
    if (!recipient || !contact) return;
    const error = sendTransfer({ recipient, amount, reference });
    if (!error) {
      setSent({ amount, name: contact.name });
      setStep('done');
    }
  };

  return (
    <Sheet visible={!!start} onClose={onClose} title={TITLE[step]} onBack={previous && (() => setStep(previous))} testID="transfer-sheet">
      <Animated.View key={step} style={[styles.step, motion.swap]}>
        {step === 'recipient' &&
          (newMode ? (
            <>
              <Field label="Name" value={name} onChangeText={setName} placeholder="e.g. Julia Weber" testID="transfer-name" />
              <Field
                label="IBAN"
                value={iban}
                onChangeText={setIban}
                placeholder="DE00 0000 0000 0000 0000 00"
                autoCapitalize="characters"
                testID="transfer-iban"
              />
              {newRecipientError && <Text style={styles.error}>{newRecipientError}</Text>}
              <Button
                label="Continue"
                onPress={() => {
                  if (!name.trim() || !isValidIban(iban)) return;
                  setRecipient({ name: name.trim(), iban });
                  setStep('amount');
                }}
                testID="transfer-recipient-continue"
              />
            </>
          ) : (
            <>
              <View style={styles.contacts}>
                {state.contacts.map((c) => (
                  <ContactAvatar
                    key={c.id}
                    contact={c}
                    onPress={() => {
                      setRecipient({ contactId: c.id });
                      setStep('amount');
                    }}
                  />
                ))}
              </View>
              <Button label="New recipient" variant="secondary" onPress={() => setNewMode(true)} testID="transfer-new" />
            </>
          ))}

        {step === 'amount' && contact && (
          <>
            <Text style={styles.to}>To {contact.name}</Text>
            <Text style={[styles.amount, !amountText && styles.placeholder]} testID="transfer-amount">
              € {amountText || '0'}
            </Text>
            <Text style={styles.available}>Available: {formatEUR(state.account.balance)}</Text>
            {amountError && amount > 0 && (
              <Text style={styles.error} testID="transfer-error">
                {amountError}
              </Text>
            )}
            <Field label="Reference (optional)" value={reference} onChangeText={setReference} placeholder="What is it for?" testID="transfer-reference" />
            <Keypad value={amountText} onChange={setAmountText} />
            <Button label="Continue" disabled={!!amountError || amount <= 0} onPress={() => setStep('confirm')} testID="transfer-amount-continue" />
          </>
        )}

        {step === 'confirm' && contact && (
          <>
            <View style={styles.summary}>
              <SummaryRow label="To" value={contact.name} />
              <SummaryRow label="IBAN" value={groupIban(contact.iban)} />
              <SummaryRow label="Amount" value={formatEUR(amount)} />
              {reference.trim() !== '' && <SummaryRow label="Reference" value={reference.trim()} />}
              <SummaryRow label="From" value="Main account" />
              <SummaryRow label="Speed" value="Instant · free" />
            </View>
            <Button label={`Send ${formatEUR(amount)}`} onPress={send} testID="transfer-send" />
          </>
        )}

        {step === 'done' && sent && (
          <View style={styles.done} testID="transfer-done">
            <View style={styles.check}>
              <Icon name="check" size={28} color={colors.textOnBrand} />
            </View>
            <Text style={styles.doneTitle}>{formatEUR(sent.amount)} sent</Text>
            <Text style={styles.doneText}>to {sent.name} · arrives in seconds</Text>
            <Button label="Done" onPress={onClose} testID="transfer-finish" />
          </View>
        )}
      </Animated.View>
    </Sheet>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'characters' | 'sentences';
  testID?: string;
};

function Field({ label, value, onChangeText, placeholder, autoCapitalize = 'sentences', testID }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
        testID={testID}
        accessibilityLabel={label}
      />
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { gap: spacing.md },
  contacts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'flex-start', paddingVertical: spacing.sm },
  to: { ...type.labelStrong, color: colors.textMuted, textAlign: 'center' },
  amount: { ...type.displayAmount, fontSize: 40, lineHeight: 48, textAlign: 'center' },
  placeholder: { color: colors.borderStrong },
  available: { ...type.labelDefault, color: colors.textMuted, textAlign: 'center', marginTop: -spacing.sm },
  error: { ...type.labelStrong, color: colors.feedbackDanger, textAlign: 'center' },
  field: { gap: spacing.xs },
  fieldLabel: { ...type.labelStrong, color: colors.textMuted },
  input: {
    ...type.bodyDefault,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: radii.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.bgSurface,
  },
  summary: { borderRadius: radii.card, borderWidth: 1, borderColor: colors.borderDefault, paddingHorizontal: spacing.md },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.borderDefault },
  summaryLabel: { ...type.bodyDefault, color: colors.textMuted },
  summaryValue: { ...type.labelStrong, flexShrink: 1, textAlign: 'right' },
  done: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.feedbackSuccess, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  doneTitle: type.displayLarge,
  doneText: { ...type.bodyDefault, color: colors.textMuted, marginBottom: spacing.lg },
});
