import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Search, UserRound } from "lucide-react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Switch } from "@/components/Switch";
import { TextField } from "@/components/TextField";
import { colors, radius, spacing } from "@/theme";
import { Customer } from "@/data/types";
import { searchCustomers } from "@/data/customers";
import { NewCustomerDraft, NewJobDraft } from "./types";

type Props = {
  draft: NewJobDraft;
  onSelectExisting: (customer: Customer | null) => void;
  onChangeNewCustomer: (patch: Partial<NewCustomerDraft>) => void;
};

export function StepCustomer({ draft, onSelectExisting, onChangeNewCustomer }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);

  useEffect(() => {
    if (draft.existingCustomer) return;
    if (query.trim().length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing results when search is cleared
      setResults([]);
      return;
    }
    let cancelled = false;
    searchCustomers(query).then((found) => {
      if (!cancelled) setResults(found);
    });
    return () => {
      cancelled = true;
    };
  }, [query, draft.existingCustomer]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {draft.existingCustomer ? (
        <Card style={styles.selectedCustomer}>
          <View style={styles.selectedRow}>
            <View style={styles.avatar}>
              <UserRound size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyBold">{draft.existingCustomer.name}</AppText>
              {!!draft.existingCustomer.address && (
                <AppText variant="caption" color={colors.textSecondary}>
                  {draft.existingCustomer.address}
                </AppText>
              )}
            </View>
          </View>
          <AppText
            variant="label"
            color={colors.accent}
            onPress={() => {
              onSelectExisting(null);
              setQuery("");
            }}
          >
            Byt kund
          </AppText>
        </Card>
      ) : (
        <>
          <View style={styles.searchField}>
            <Search size={18} color={colors.textSecondary} style={styles.searchIcon} />
            <TextField
              label="Sök befintlig kund"
              placeholder="Namn på kund…"
              value={query}
              onChangeText={setQuery}
              style={styles.searchInput}
            />
          </View>

          {results.length > 0 && (
            <Card style={{ gap: spacing.xs }}>
              {results.map((c) => (
                <AppText
                  key={c.id}
                  variant="body"
                  onPress={() => {
                    onSelectExisting(c);
                    setQuery("");
                  }}
                  style={styles.resultRow}
                >
                  {c.name}
                </AppText>
              ))}
            </Card>
          )}

          <View style={styles.divider}>
            <AppText variant="caption" color={colors.textSecondary}>
              eller ny kund
            </AppText>
          </View>

          <View style={{ gap: spacing.md }}>
            <TextField
              label="Namn"
              required
              value={draft.newCustomer.name}
              onChangeText={(name) => onChangeNewCustomer({ name })}
              placeholder="För- och efternamn / företag"
            />
            <TextField
              label="Telefon"
              value={draft.newCustomer.phone}
              onChangeText={(phone) => onChangeNewCustomer({ phone })}
              keyboardType="phone-pad"
              placeholder="070-123 45 67"
            />
            <TextField
              label="E-post"
              value={draft.newCustomer.email}
              onChangeText={(email) => onChangeNewCustomer({ email })}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="namn@exempel.se"
            />
            <TextField
              label="Adress"
              required
              value={draft.newCustomer.address}
              onChangeText={(address) => onChangeNewCustomer({ address })}
              placeholder="Gatuadress"
            />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <TextField
                  label="Postnummer"
                  value={draft.newCustomer.postalCode}
                  onChangeText={(postalCode) => onChangeNewCustomer({ postalCode })}
                  keyboardType="numbers-and-punctuation"
                  placeholder="123 45"
                />
              </View>
              <View style={{ flex: 2 }}>
                <TextField
                  label="Ort"
                  value={draft.newCustomer.city}
                  onChangeText={(city) => onChangeNewCustomer({ city })}
                  placeholder="Ort"
                />
              </View>
            </View>

            <Card style={styles.toggleRow}>
              <AppText variant="body">Spara som kontakt</AppText>
              <Switch
                value={draft.newCustomer.saveAsContact}
                onValueChange={(saveAsContact) => onChangeNewCustomer({ saveAsContact })}
              />
            </Card>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  searchField: {
    position: "relative",
  },
  searchIcon: {
    position: "absolute",
    left: spacing.md,
    top: 34,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: spacing.xl,
  },
  resultRow: {
    paddingVertical: spacing.xs,
  },
  divider: {
    alignItems: "center",
    marginVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectedCustomer: {
    gap: spacing.md,
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
  },
});
