import { useState } from "react";
import { Text } from "react-native";
import { Button } from "./Button";
import {
  decimalLoadSchema,
  displayLoad,
  type WeightUnit,
} from "@/domain/training";
import { useTheme } from "@/theme/useTheme";
export function LoadUnitControl({
  load,
  accessibilityContext,
  unit,
  onChangeUnit,
}: {
  load: string | null;
  accessibilityContext?: string;
  unit: WeightUnit;
  onChangeUnit: (unit: WeightUnit) => void;
}) {
  const { colors } = useTheme();
  const [showConverted, setShowConverted] = useState(false);
  const other = unit === "kg" ? "lb" : "kg";
  const empty = load === null || load === "";
  const valid = decimalLoadSchema.safeParse(load).success;
  return (
    <>
      <Button
        secondary
        label={empty ? `Use ${other}` : `View in ${other}`}
        accessibilityLabel={
          accessibilityContext
            ? `${accessibilityContext}: ${empty ? "Use" : "View in"} ${other}`
            : empty
              ? `Use ${other}`
              : `View in ${other}`
        }
        disabled={!empty && !valid}
        onPress={() => {
          if (empty) onChangeUnit(other);
          else setShowConverted((value) => !value);
        }}
      />
      {!empty && valid && showConverted ? (
        <Text style={{ color: colors.secondary }}>
          {displayLoad(load, unit, other)} {other} · entered in {unit}
        </Text>
      ) : null}
    </>
  );
}
