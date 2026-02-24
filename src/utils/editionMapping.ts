export const editionMapping = (year: number | string) => {
  switch (year) {
    case "2018":
    case 2018:
      return 1;
    case "2022":
    case 2022:
      return 2;
    case "2026":
    case 2026:
      return 3;
    default:
      return 0;
  }
};
