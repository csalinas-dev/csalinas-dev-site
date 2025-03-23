const Status = Object.freeze({
  Absent: "absent",
  Default: "default",
  Present: "present",
  Correct: "correct",
});

export default Status;

export const convertStatus = (status) => {
  switch (status) {
    case "absent":
      return Status.Absent;
    case "present":
      return Status.Present;
    case "correct":
      return Status.Correct;
    case "default":
    default:
      return Status.Default;
  }
};
