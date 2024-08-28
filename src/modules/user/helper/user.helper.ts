import { ErrorWithProps } from "mercurius";
import { FilterOperatorsEnum } from "../../../types/common.enum";
import { PaginatedFilter } from "../../../types/common.input";
import { UserLoginType } from "../interfaces/user.enum";

export function isPhoneNumberOrEmail(input: string): {
  status: UserLoginType;
  value: string | null;
} {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const phoneNumberRegex = /^\+?[1-9]\d{1,14}$/;

  if (emailRegex.test(input)) {
    return {
      status: UserLoginType.Email,
      value: input.replace(/[^a-zA-Z0-9._%+-@]/g, ""),
    };
  } else if (phoneNumberRegex.test(input)) {
    return {
      status: UserLoginType.Phone,
      value: input.replace(/[^\+1-9\d]/g, ""),
    };
  } else {
    return { status: UserLoginType.Invalid, value: null };
  }
}

export function applyFilter(filter: PaginatedFilter) {
  const filterField = filter.field;
  let matchingData: { [key: string]: any } = {};

  switch (filter.operator) {
    case FilterOperatorsEnum.any:
      matchingData[filterField] = { $regex: `(?i)${filter.value}` };
      break;
    case FilterOperatorsEnum.equalTo:
      matchingData[filterField] = { $eq: filter.value };
      break;
    case FilterOperatorsEnum.notEqualTo:
      matchingData[filterField] = { $ne: filter.value };
      break;
    case FilterOperatorsEnum.greaterThan:
      matchingData[filterField] = { $gt: filter.value };
      break;
    case FilterOperatorsEnum.greaterThanOrEqualTo:
      matchingData[filterField] = { $gte: filter.value };
      break;
    case FilterOperatorsEnum.lessThan:
      matchingData[filterField] = { $lt: filter.value };
      break;
    case FilterOperatorsEnum.lessThanOrEqualTo:
      matchingData[filterField] = { $lte: filter.value };
      break;
    default:
      throw new ErrorWithProps(`Invalid operator: ${filter.operator}`);
  }

  return matchingData;
}
