export class CsvHelpers {
  static validStringPattern = /^[a-zA-Z0-9- ]*$/;
  static invalidStringPattern = /[^a-zA-Z0-9- ]/g;
  static nameLimit = 60;
  static descMinLimit = 40;
  static descMaxLimit = 160;

  static extractCsvFileNameFromUrl = (url: string) => {
    let paths = url.split("/");
    return paths[paths.length - 1];
  };

  static sanitizeCellValue = (
    cellValue: string,
    type: "string" | "number" | "boolean"
  ) => {
    if (type === "string") {
      return cellValue.trim().replace(this.invalidStringPattern, "");
    } else if (type === "number") {
      return Number(cellValue);
    } else {
      return cellValue.trim().toLowerCase() === "true";
    }
  };

  static invalidStringCellValue = (cellValue: string) => {
    let invalid = false;
    if (cellValue === "") {
      invalid = true;
    } else if (!this.validStringPattern.test(cellValue.trim())) {
      invalid = true;
    } else {
      invalid = false;
    }

    return invalid;
  };

  static invalidNumberCellValue = (cellValue: string) => {
    try {
      let invalid = false;
      const cellNumValue = Number(cellValue);
      if (isNaN(cellNumValue)) {
        invalid = true;
      } else if (cellNumValue <= 0) {
        invalid = true;
      } else {
        invalid = false;
      }
    } catch (error) {
      return false;
    }
  };

  static invalidBooleanCellValue = (cellValue: string) => {
    return (
      cellValue.trim().toLowerCase() !== "true" &&
      cellValue.trim().toLowerCase() !== "false"
    );
  };

  static invalidItemNameLimit = (cellValue: string) => {
    if (cellValue.length > this.nameLimit) {
      return true;
    }

    return false;
  };

  static invalidItemDescLimit = (cellValue: string) => {
    if (
      cellValue.length < this.descMinLimit ||
      cellValue.length > this.descMaxLimit
    ) {
      return true;
    }

    return false;
  };
}
