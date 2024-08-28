import Joi from "joi";
import { Day } from "../modules/restaurant/interfaces/restaurant.enums";
import { AccountPreferenceInput } from "../modules/user/interfaces/user.input";
import { AddressInfoInput } from "../types/common.input";

export const isAlphanumeric = (value: string) => {
  const regex = /^[a-zA-Z0-9]+$/;
  return regex.test(value);
};

export const arraysAreEqual = <T>(arr1: T[], arr2: T[]): boolean => {
  // Check if the arrays have the same length
  if (arr1.length !== arr2.length) {
    return false;
  }

  // Check if every element in arr1 is equal to the corresponding element in arr2
  return arr1.every((element, index) => element === arr2[index]);
};

export const arraysHaveCommonElement = <T>(arr1: T[], arr2: T[]): boolean => {
  // Create a Set from the first array
  const set1 = new Set(arr1);

  // Check if any element in the second array exists in the Set created from the first array
  return arr2.some((element) => set1.has(element));
};

export const joiSchema = Joi.object({
  name: Joi.string().messages({
    "string.empty": "Name field cannot be empty.",
  }),
  desc: Joi.string().messages({
    "string.empty": "Description field cannot be empty.",
  }),
  content: Joi.string().max(180).messages({
    "string.empty": "Content cannot be empty",
    "string.length": "Content cannot be more than 180 characters",
  }),
  firstName: Joi.string().messages({
    "string.empty": "You have not entered your first name.",
  }),
  lastName: Joi.string().messages({
    "string.empty": "You have not entered your last name.",
  }),
  email: Joi.string().email().messages({
    "string.empty": "You have not entered your email id.",
    "string.email": "You have entered an invalid email id.",
  }),
  phone: Joi.string()
    .length(10)
    .pattern(/^[0-9]+$/)
    .messages({
      "string.empty": "You have not entered your phone number.",
      "string.length": "You have entered an invalid phone number.",
      "string.pattern.base": "You have entered an invalid phone number.",
    }),
  password: Joi.string().messages({
    "string.empty": "You have not entered your password.",
  }),
  otp: Joi.string()
    .length(6)
    .pattern(/^[0-9]+$/)
    .messages({
      "string.empty": "Please provide verification code.",
      "string.length": "Please enter a valid verification code",
      "string.pattern.base": "Please enter a valid verification code",
    }),
  salesTax: Joi.number().positive().precision(2).messages({
    "number.base": "Sales tax must be a number.",
    "number.positive": "Sales tax must be a positive number.",
    "number.precision":
      "Sales tax must be a valid number with up to two decimal places.",
  }),
  isSpicy: Joi.boolean().messages({
    "boolean.base": '"isSpicy" should be a boolean value',
    "any.required": '"isSpicy" is a required field',
  }),
  isVegan: Joi.boolean().messages({
    "boolean.base": '"isVegan" should be a boolean value',
    "any.required": '"isVegan" is a required field',
  }),
  isHalal: Joi.boolean().messages({
    "boolean.base": '"isHalal" should be a boolean value',
    "any.required": '"isHalal" is a required field',
  }),
  isGlutenFree: Joi.boolean().messages({
    "boolean.base": '"isGlutenFree" should be a boolean value',
    "any.required": '"isGlutenFree" is a required field',
  }),
  hasNuts: Joi.boolean().messages({
    "boolean.base": '"hasNuts" should be a boolean value',
    "any.required": '"hasNuts" is a required field',
  }),
});

export const validateCommunicationPreference = (
  inputData: AccountPreferenceInput
) => {
  let isValid = true;
  const validKeys = ["whatsApp", "email"];

  const inputKeys = Object.keys(inputData);
  if (
    inputKeys.length !== 2 ||
    !inputKeys.every((key) => validKeys.includes(key))
  ) {
    isValid = false;
  }

  return isValid ? { isValid: true } : { isValid: false };
};

export const availabilityValidation = (
  input: any
): { success: boolean; error: string } => {
  if (!input || input.length !== 7) {
    return {
      success: false,
      error: "Please provide availability for all the weekdays and try again!",
    };
  }

  const inputDaysSet = new Set(input.map((item: { day: any }) => item.day));
  const allDaysPresent = Object.values(Day).every((day) =>
    inputDaysSet.has(day)
  );

  if (!allDaysPresent) {
    return {
      success: false,
      error: "Please provide availability for all the weekdays and try again!",
    };
  }

  for (const availability of input) {
    const { hours, active } = availability;
    if (active) {
      if (!Array.isArray(hours) || hours.length === 0) {
        return {
          success: false,
          error: `Hours cannot be empty for ${availability.day}, please try again!`,
        };
      }

      for (let i = 0; i < hours.length; i++) {
        const current = hours[i]; // current slot
        const next = hours[i + 1]; // next slot

        // Check ISO date format
        if (
          !validateISODate(current.start.toISOString()) ||
          !validateISODate(current.end.toISOString())
        ) {
          return {
            success: false,
            error: `Please provide valid date and time format and try again!`,
          };
        }

        // check between start & end time
        if (
          new Date(current.start).getTime() >= new Date(current.end).getTime()
        ) {
          return {
            success: false,
            error: `End time for the restaurant cannot be before the start time for ${availability.day}, please try again!`,
          };
        }

        // check for overlapping hours between slots
        if (
          next &&
          new Date(current.end).getTime() > new Date(next.start).getTime()
        ) {
          return {
            success: false,
            error: `Overlapping hours found for ${availability.day}, please try again!`,
          };
        }
      }
    }
  }

  return { success: true, error: "" };
};

export function validateEIN(ein: string) {
  const einPattern = /^\d{2}-\d{7}$/;
  // const ssnPattern = /^\d{3}-\d{2}-\d{4}$/;

  const isEINValid = einPattern.test(ein);
  // const isSSNValid = ssnPattern.test(ssn);

  return {
    ein: isEINValid,
    // ssn: isSSNValid,
  };
}

// export function validateISODate(dateString:string) {
//   const date = new Date(dateString);
//   if (isNaN(date.getTime())) {
//     return false; // Invalid date
//   }

//   const isoDatePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;
//   return isoDatePattern.test(dateString);
// }

export function validateISODate(dateString: string): boolean {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return false; // Invalid date
  }

  const isoDatePattern =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}([+-]\d{2}:\d{2}|Z)$/;
  return isoDatePattern.test(dateString);
}

export function validateUSAddress(address: AddressInfoInput) {
  // Check that addressLine1, city, state, and place are non-empty strings
  if (
    typeof address.addressLine1 !== "string" ||
    address.addressLine1.trim() === "" ||
    typeof address.city !== "string" ||
    address.city.trim() === "" ||
    typeof address.state.stateName !== "string" ||
    address.state.stateName.trim() === "" ||
    typeof address.place.displayName !== "string" ||
    address.place.displayName.trim() === ""
  ) {
    return false;
  }

  // Check that zipcode is a number and within a reasonable range
  if (
    typeof address.zipcode !== "number" ||
    !Number.isInteger(address.zipcode) ||
    address.zipcode <= 0
  ) {
    return false;
  }

  // If addressLine2 is provided, ensure it is a string (can be empty)
  if (
    address.addressLine2 !== undefined &&
    typeof address.addressLine2 !== "string"
  ) {
    return false;
  }

  // Check coordinates
  if (
    !Array.isArray(address.coordinate.coordinates) ||
    address.coordinate.coordinates.length !== 2
  ) {
    return false;
  }

  return true;
}

export function enumValidation(enumType: any, inputEnumType: string) {
  const isValidStatus = Object.values(enumType).includes(inputEnumType);
  return isValidStatus;
}

export function enumArrayValidation<T extends object>(
  enumType: T,
  inputEnumType: (keyof T)[]
): { success: boolean; error: string } {
  const uniqueCategories = new Set<keyof T>();
  const enumKeys = new Set(Object.keys(enumType) as Array<keyof T>);

  for (const field of inputEnumType) {
    if (!enumKeys.has(field)) {
      return {
        success: false,
        error: `Invalid field value: ${field.toString()}.`,
      };
    }
    if (uniqueCategories.has(field)) {
      return {
        success: false,
        error: `Duplicate field value found: ${field.toString()}.`,
      };
    }
    uniqueCategories.add(field);
  }

  return { success: true, error: "" };
}

export function validateWebSiteURL(url: string): boolean {
  const urlPattern = new RegExp(
    "^(https?:\\/\\/)" + // protocol
      "((([a-zA-Z\\d]([a-zA-Z\\d-]*[a-zA-Z\\d])*)\\.)+[a-zA-Z]{2,})" + // domain name with TLD
      "(\\:\\d+)?" + // port
      "(\\/[-a-zA-Z\\d%_.~+]*)*" + // path
      "(\\?[;&a-zA-Z\\d%_.~+=-]*)?" + // query string
      "(\\#[-a-zA-Z\\d_]*)?$" // fragment locator
  );

  return urlPattern.test(url);
}
