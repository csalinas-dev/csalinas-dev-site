import { range } from "lodash";

export const Status = Object.freeze({
  Absent: "absent",
  Default: "default",
  Present: "present",
  Correct: "correct",
});

export const defaultBoard = range(6).map((_, row) =>
  range(5).map((_, col) => ({
    key: `${row}${col}`,
    c: "",
    status: Status.Default,
  }))
);

export const keyboardLetters = [
  [
    { key: "00", label: "Q", status: Status.Default },
    { key: "01", label: "W", status: Status.Default },
    { key: "02", label: "E", status: Status.Absent },
    { key: "03", label: "R", status: Status.Default },
    { key: "04", label: "T", status: Status.Default },
    { key: "05", label: "Y", status: Status.Default },
    { key: "06", label: "U", status: Status.Absent },
    { key: "07", label: "I", status: Status.Default },
    { key: "08", label: "O", status: Status.Default },
    { key: "09", label: "P", status: Status.Default },
  ],
  [
    { key: "10", label: "A", status: Status.Present },
    { key: "11", label: "S", status: Status.Default },
    { key: "12", label: "D", status: Status.Default },
    { key: "13", label: "F", status: Status.Default },
    { key: "14", label: "G", status: Status.Absent },
    { key: "15", label: "H", status: Status.Default },
    { key: "16", label: "J", status: Status.Default },
    { key: "17", label: "K", status: Status.Absent },
    { key: "18", label: "L", status: Status.Default },
  ],
  [
    { key: "20", label: "ENTER", status: Status.Default },
    { key: "21", label: "Z", status: Status.Default },
    { key: "22", label: "X", status: Status.Absent },
    { key: "23", label: "C", status: Status.Default },
    { key: "24", label: "V", status: Status.Default },
    { key: "25", label: "B", status: Status.Correct },
    { key: "26", label: "N", status: Status.Default },
    { key: "27", label: "M", status: Status.Absent },
    { key: "28", label: "DELETE", status: Status.Default },
  ],
];
