import { StyleSheet, View, type ColorValue } from "react-native";

export type TabIconName = "train" | "history" | "exercises" | "settings";

type Props = {
  name: TabIconName;
  color: ColorValue;
  size: number;
};

export function TabIcon({ name, color, size }: Props) {
  const scale = size / 24;
  return (
    <View
      accessible={false}
      testID={`tab-icon-${name}`}
      style={{ width: size, height: size, position: "relative" }}
    >
      {name === "train" ? <Dumbbell color={color} scale={scale} /> : null}
      {name === "history" ? <Clock color={color} scale={scale} /> : null}
      {name === "exercises" ? <List color={color} scale={scale} /> : null}
      {name === "settings" ? <Sliders color={color} scale={scale} /> : null}
    </View>
  );
}

function Dumbbell({ color, scale }: { color: ColorValue; scale: number }) {
  return (
    <>
      <View
        testID="train-bar"
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: 14 * scale,
            left: 5 * scale,
            top: 11 * scale,
          },
        ]}
      />
      <View
        testID="train-left-weight"
        style={[
          styles.weight,
          {
            backgroundColor: color,
            left: 3 * scale,
            top: 7 * scale,
            height: 10 * scale,
          },
        ]}
      />
      <View
        testID="train-right-weight"
        style={[
          styles.weight,
          {
            backgroundColor: color,
            left: 17 * scale,
            top: 7 * scale,
            height: 10 * scale,
          },
        ]}
      />
    </>
  );
}

function Clock({ color, scale }: { color: ColorValue; scale: number }) {
  return (
    <>
      <View
        testID="history-face"
        style={[
          styles.clockFace,
          {
            borderColor: color,
            width: 20 * scale,
            height: 20 * scale,
            left: 2 * scale,
            top: 2 * scale,
            borderRadius: 10 * scale,
          },
        ]}
      />
      <View
        testID="history-hand-hour"
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: 6 * scale,
            left: 11 * scale,
            top: 6 * scale,
            transform: [{ rotate: "-90deg" }],
          },
        ]}
      />
      <View
        testID="history-hand-minute"
        style={[
          styles.bar,
          {
            backgroundColor: color,
            width: 6 * scale,
            left: 11 * scale,
            top: 11 * scale,
            transform: [{ rotate: "0deg" }],
          },
        ]}
      />
    </>
  );
}

function List({ color, scale }: { color: ColorValue; scale: number }) {
  return (
    <>
      {[0, 1, 2].map((row) => (
        <View
          key={row}
          testID={`exercises-row-${row}`}
          style={{
            position: "absolute",
            left: 3 * scale,
            top: (5 + row * 7) * scale,
            flexDirection: "row",
            alignItems: "center",
            gap: 3 * scale,
          }}
        >
          <View
            testID={`exercises-dot-${row}`}
            style={{
              width: 3 * scale,
              height: 3 * scale,
              borderRadius: 2 * scale,
              backgroundColor: color,
            }}
          />
          <View
            testID={`exercises-line-${row}`}
            style={[
              styles.bar,
              {
                position: "relative",
                left: 0,
                top: 0,
                width: 13 * scale,
                backgroundColor: color,
              },
            ]}
          />
        </View>
      ))}
    </>
  );
}

function Sliders({ color, scale }: { color: ColorValue; scale: number }) {
  return (
    <>
      {[5, 11, 17].map((top, index) => (
        <View
          key={top}
          testID={`settings-track-${index}`}
          style={[
            styles.bar,
            {
              left: 3 * scale,
              top: top * scale,
              width: 18 * scale,
              backgroundColor: color,
            },
          ]}
        />
      ))}
      {[8, 15, 11].map((left, index) => (
        <View
          key={left}
          testID={`settings-knob-${index}`}
          style={[
            styles.knob,
            {
              left: left * scale,
              top: (3 + index * 6) * scale,
              borderColor: color,
              backgroundColor: color,
              width: 5 * scale,
              height: 5 * scale,
              borderRadius: 3 * scale,
            },
          ]}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  bar: { position: "absolute", height: 2, borderRadius: 1 },
  weight: { position: "absolute", width: 3, borderRadius: 1 },
  clockFace: { position: "absolute", borderWidth: 2 },
  knob: { position: "absolute", borderWidth: 1 },
});
