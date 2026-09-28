import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { colors, spacing } from "@/theme";
import { Customer, JobKind } from "@/data/types";
import { createCustomer } from "@/data/customers";
import { createJob } from "@/data/jobs";
import { WizardHeader } from "@/features/new-job/WizardHeader";
import { StepKindMethod } from "@/features/new-job/StepKindMethod";
import { StepCustomer } from "@/features/new-job/StepCustomer";
import { StepDetails } from "@/features/new-job/StepDetails";
import { StepSummary } from "@/features/new-job/StepSummary";
import { CreationMethod, NewCustomerDraft, NewJobDraft, emptyNewJobDraft } from "@/features/new-job/types";

type Step = 0 | 1 | 2 | 3;

const STEP_TITLES: Record<Step, string> = {
  0: "Nytt uppdrag",
  1: "Kunduppgifter",
  2: "Arbetsinfo",
  3: "Sammanfattning",
};

function missingCustomerFields(draft: NewJobDraft): string[] {
  if (draft.existingCustomer) return [];
  const missing: string[] = [];
  if (!draft.newCustomer.name.trim()) missing.push("Namn");
  if (!draft.newCustomer.address.trim()) missing.push("Adress");
  return missing;
}

function missingDetailFields(draft: NewJobDraft): string[] {
  const missing: string[] = [];
  if (!draft.title.trim()) missing.push("Namn på uppdrag");
  return missing;
}

export default function NewJobScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<NewJobDraft>(emptyNewJobDraft);
  const [submitting, setSubmitting] = useState(false);

  const update = (patch: Partial<NewJobDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const updateNewCustomer = (patch: Partial<NewCustomerDraft>) =>
    setDraft((d) => ({ ...d, newCustomer: { ...d.newCustomer, ...patch } }));

  const handleBack = () => {
    if (step === 0) {
      router.back();
      return;
    }
    setStep((s) => (s - 1) as Step);
  };

  const handleSelectKind = (kind: JobKind) => update({ kind });
  const handleSelectMethod = (method: CreationMethod) => {
    update({ method });
    if (method === "manual") setStep(1);
  };
  const handleSelectExistingCustomer = (customer: Customer | null) => update({ existingCustomer: customer });

  const customerMissing = missingCustomerFields(draft);
  const detailsMissing = missingDetailFields(draft);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      let customerId = draft.existingCustomer?.id ?? null;
      if (!customerId) {
        const created = await createCustomer({
          name: draft.newCustomer.name.trim(),
          phone: draft.newCustomer.phone.trim() || null,
          email: draft.newCustomer.email.trim() || null,
          address: draft.newCustomer.address.trim() || null,
          postalCode: draft.newCustomer.postalCode.trim() || null,
          city: draft.newCustomer.city.trim() || null,
          saveAsContact: draft.newCustomer.saveAsContact,
        });
        customerId = created.id;
      }

      await createJob({
        customerId,
        kind: draft.kind ?? "customer_job",
        title: draft.title.trim(),
        workType: draft.workType,
        description: draft.description.trim() || null,
        plannedAt: draft.plannedAt ? draft.plannedAt.toISOString() : null,
        priority: draft.priority,
      });

      router.replace("/");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <WizardHeader
        title={STEP_TITLES[step]}
        onBack={handleBack}
        isFirstStep={step === 0}
        step={step > 0 ? step - 1 : undefined}
        totalSteps={step > 0 ? 3 : undefined}
      />

      {step === 0 && (
        <StepKindMethod draft={draft} onSelectKind={handleSelectKind} onSelectMethod={handleSelectMethod} />
      )}
      {step === 1 && (
        <StepCustomer
          draft={draft}
          onSelectExisting={handleSelectExistingCustomer}
          onChangeNewCustomer={updateNewCustomer}
        />
      )}
      {step === 2 && <StepDetails draft={draft} onChange={update} />}
      {step === 3 && (
        <StepSummary draft={draft} onEditCustomer={() => setStep(1)} onEditDetails={() => setStep(2)} />
      )}

      {step === 1 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {customerMissing.length > 0 && (
            <AppText variant="caption" color={colors.textSecondary}>
              Saknas: {customerMissing.join(", ")}
            </AppText>
          )}
          <Button label="Nästa" disabled={customerMissing.length > 0} onPress={() => setStep(2)} />
        </View>
      )}

      {step === 2 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          {detailsMissing.length > 0 && (
            <AppText variant="caption" color={colors.textSecondary}>
              Saknas: {detailsMissing.join(", ")}
            </AppText>
          )}
          <Button label="Nästa" disabled={detailsMissing.length > 0} onPress={() => setStep(3)} />
        </View>
      )}

      {step === 3 && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label={submitting ? "Skapar…" : "Skapa uppdrag"} disabled={submitting} onPress={handleSubmit} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
});
