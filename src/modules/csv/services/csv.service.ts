import axios from "axios";
import { Workbook } from "exceljs";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { ErrorWithProps } from "mercurius";
import { FilterQuery } from "mongoose";
import path from "path";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import { validateWebSiteURL } from "../../../utils/validations";
import {
  ConfigTypeEnum,
  PermissionTypeEnum,
} from "../../masters/interface/masters.enum";
import { MastersService } from "../../masters/services/masters.service";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { MenuModel } from "../../menu/schema/menu.schema";
import { CsvHelpers } from "../helper/csv.helper";
import { CsvQueueType } from "../interface/csv.enum";
import { UploadCsvErrorInput, UploadCsvInput } from "../interface/csv.input";
import { CsvRowItem } from "../interface/csv.types";
import { CsvQueue } from "../queue/csv.queue";
import {
  CsvUploadError,
  CsvUploadErrorModel,
  CsvUploadModel,
} from "../schema/csv.schema";

export class CSVService {
  async getCsvHeaders(): Promise<string[]> {
    try {
      // Get Order Types Headers
      const orderTypeHeaders = Object.keys(MenuTypeEnum).map((e) =>
        e.toString()
      );

      // Fetch Item Option Headers
      const mastersService = new MastersService();
      const itemOptions = await mastersService.getAllItemOptions();
      const itemOptionHeaders = itemOptions.map((el) => el.type.toString());

      // Define headers and data
      const headers = [
        "Category",
        "Category Desc",
        "Sub Category",
        "Sub Category Desc",
        "Item Name",
        "Item Desc",
        "Item Price",
        "Item Status",
        ...orderTypeHeaders,
        "Item Limit",
        ...itemOptionHeaders,
      ];

      return headers;
    } catch (error: any) {
      throw new ErrorWithProps(error.toString());
    }
  }

  async uploadCsvData(input: UploadCsvInput, ctx: Context): Promise<boolean> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      if (!validateWebSiteURL(input.csvFile)) {
        throw new ErrorWithProps(
          "Csv file must be a valid url, please try again!"
        );
      }

      // Check if menu exist
      const checkMenu = await MenuModel.countDocuments({
        _id: input.menu,
        restaurantId: ctx.restaurantId,
      }).lean();
      if (checkMenu <= 0) {
        throw new ErrorWithProps("Please select a valid menu to continue!");
      }

      // Download and save the csv file in temp dir
      const csvFileName = CsvHelpers.extractCsvFileNameFromUrl(input.csvFile);
      const validCsvFileResp = await axios.get(input.csvFile);
      const tempDirLoc = path.join(__dirname, "./temp");
      if (!existsSync(tempDirLoc)) {
        mkdirSync(tempDirLoc);
      }
      const csvFilePath = `${tempDirLoc}/${csvFileName}`;
      writeFileSync(csvFilePath, validCsvFileResp.data);

      // Parse the csv data
      const workbook = new Workbook();
      await workbook.csv.readFile(csvFilePath);
      const csvWorksheet = workbook.getWorksheet(1);

      // Check validations
      const mastersService = new MastersService();
      const maxCsvRows = await mastersService.getConfig(
        ConfigTypeEnum.MaxCSVRows
      );
      const itemNames = new Set<string>();
      const actualHeaders = await this.getCsvHeaders();

      // Check row limit
      if (csvWorksheet.rowCount - 1 > maxCsvRows.value) {
        throw new ErrorWithProps(
          `You can only add upto ${maxCsvRows.value} items in CSV upload`
        );
      }

      let finalData: CsvRowItem[] = [];

      csvWorksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const category = row.getCell(1).value;
        const categoryDesc = row.getCell(2).value;
        const subCategory = row.getCell(3).value;
        const subCategoryDesc = row.getCell(4).value;
        const itemName = row.getCell(5).value;
        const itemDesc = row.getCell(6).value;
        const itemPrice = row.getCell(7).value;
        const itemStatus = row.getCell(8).value;
        const onlineOrdering = row.getCell(9).value;
        const dineIn = row.getCell(10).value;
        const catering = row.getCell(11).value;
        const itemLimit = row.getCell(12).value;
        const popularItem = row.getCell(13).value;
        const upSellItem = row.getCell(14).value;
        const isVegan = row.getCell(15).value;
        const hasNuts = row.getCell(16).value;
        const isGlutenFree = row.getCell(17).value;
        const isHalal = row.getCell(18).value;
        const isSpicy = row.getCell(19).value;

        // Check headers
        if (rowNumber === 1) {
          actualHeaders.map((h, i) => {
            // console.log(h, row.getCell(i + 1).value);
            if (h !== row.getCell(i + 1).value) {
              throw new ErrorWithProps(
                "Headers are not matching, please try again!"
              );
            }
          });
        }

        if (rowNumber > 1) {
          // Check cell for any special character or empty value
          if (
            CsvHelpers.invalidStringCellValue(category.toString()) ||
            ((categoryDesc?.toString() ?? "") !== "" &&
              CsvHelpers.invalidStringCellValue(categoryDesc.toString())) ||
            ((subCategory?.toString() ?? "") !== "" &&
              CsvHelpers.invalidStringCellValue(subCategory.toString())) ||
            ((subCategoryDesc?.toString() ?? "") !== "" &&
              CsvHelpers.invalidStringCellValue(subCategoryDesc.toString())) ||
            CsvHelpers.invalidStringCellValue(itemName.toString()) ||
            CsvHelpers.invalidStringCellValue(itemDesc.toString())
          ) {
            throw new ErrorWithProps(
              "Invalid string values found, please try again!"
            );
          }

          // Check cell number values
          if (
            CsvHelpers.invalidNumberCellValue(itemPrice.toString()) ||
            ((itemLimit?.toString() ?? "") !== "" &&
              CsvHelpers.invalidNumberCellValue(itemLimit.toString()))
          ) {
            throw new ErrorWithProps(
              "Invalid number values found, please try again!"
            );
          }

          // Check cell boolean values
          if (
            CsvHelpers.invalidBooleanCellValue(itemStatus.toString()) ||
            CsvHelpers.invalidBooleanCellValue(onlineOrdering.toString()) ||
            CsvHelpers.invalidBooleanCellValue(dineIn.toString()) ||
            CsvHelpers.invalidBooleanCellValue(catering.toString()) ||
            CsvHelpers.invalidBooleanCellValue(popularItem.toString()) ||
            CsvHelpers.invalidBooleanCellValue(upSellItem.toString()) ||
            CsvHelpers.invalidBooleanCellValue(isVegan.toString()) ||
            CsvHelpers.invalidBooleanCellValue(hasNuts.toString()) ||
            CsvHelpers.invalidBooleanCellValue(isGlutenFree.toString()) ||
            CsvHelpers.invalidBooleanCellValue(isHalal.toString()) ||
            CsvHelpers.invalidBooleanCellValue(isSpicy.toString())
          ) {
            throw new ErrorWithProps(
              "Invalid boolean values found, please try again!"
            );
          }

          // Check item name and item desc limit
          if (
            CsvHelpers.invalidItemNameLimit(itemName.toString()) ||
            CsvHelpers.invalidItemDescLimit(itemDesc.toString())
          ) {
            throw new ErrorWithProps(
              "Invalid limit for item name or item desc, please try again!"
            );
          }

          // Check category name and category desc limit
          if (
            CsvHelpers.invalidItemNameLimit(category.toString()) ||
            ((categoryDesc?.toString() ?? "") !== "" &&
              CsvHelpers.invalidItemDescLimit(categoryDesc.toString()))
          ) {
            throw new ErrorWithProps(
              "Invalid limit for category name or category desc, please try again!"
            );
          }

          // Check sub category name and sub category desc limit
          if (
            CsvHelpers.invalidItemNameLimit(subCategory.toString()) ||
            ((subCategoryDesc?.toString() ?? "") !== "" &&
              CsvHelpers.invalidItemDescLimit(subCategoryDesc.toString()))
          ) {
            throw new ErrorWithProps(
              "Invalid limit for sub category name or sub category desc, please try again!"
            );
          }

          // Sanitized data
          const categorySanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(1).value.toString(),
            "string"
          );
          const categoryDescSanitized: string | null = row
            .getCell(2)
            .value?.toString()
            ? (CsvHelpers.sanitizeCellValue(
                row.getCell(2).value?.toString(),
                "string"
              ) as string)
            : null;
          const subCategorySanitized: string | null = row
            .getCell(3)
            .value?.toString()
            ? (CsvHelpers.sanitizeCellValue(
                row.getCell(3).value?.toString(),
                "string"
              ) as string)
            : null;
          const subCategoryDescSanitized: string | null = row
            .getCell(4)
            .value?.toString()
            ? (CsvHelpers.sanitizeCellValue(
                row.getCell(4).value?.toString(),
                "string"
              ) as string)
            : null;
          const itemNameSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(5).value.toString(),
            "string"
          );
          const itemDescSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(6).value.toString(),
            "string"
          );
          const itemPriceSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(7).value.toString(),
            "number"
          );
          const itemStatusSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(8).value.toString(),
            "boolean"
          );
          const onlineOrderingSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(9).value.toString(),
            "boolean"
          );
          const dineInSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(10).value.toString(),
            "boolean"
          );
          const cateringSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(11).value.toString(),
            "boolean"
          );
          const itemLimitSanitized: number | null = row
            .getCell(12)
            .value?.toString()
            ? (CsvHelpers.sanitizeCellValue(
                row.getCell(12).value?.toString(),
                "number"
              ) as number)
            : null;
          const popularItemSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(13).value.toString(),
            "boolean"
          );
          const upSellItemSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(14).value.toString(),
            "boolean"
          );
          const isVeganSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(15).value.toString(),
            "boolean"
          );
          const hasNutsSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(16).value.toString(),
            "boolean"
          );
          const isGlutenFreeSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(17).value.toString(),
            "boolean"
          );
          const isHalalSanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(18).value.toString(),
            "boolean"
          );
          const isSpicySanitized = CsvHelpers.sanitizeCellValue(
            row.getCell(19).value.toString(),
            "boolean"
          );

          // Check if any row have same item name
          if (itemNames.has(itemNameSanitized as string)) {
            throw new ErrorWithProps(
              "Item name cannot be same, please try again"
            );
          } else {
            itemNames.add(itemNameSanitized as string);
          }

          // Check if halal and vegan is not true in same row
          if ((isHalalSanitized as boolean) === (isVeganSanitized as boolean)) {
            throw new ErrorWithProps(
              "Item cannot be halal and vegan at the same time, please check and try again!"
            );
          }

          finalData.push({
            category: categorySanitized as string,
            categoryDesc: categoryDescSanitized,
            subCategory: subCategorySanitized,
            subCategoryDesc: subCategoryDescSanitized,
            itemName: itemNameSanitized as string,
            itemDesc: itemDescSanitized as string,
            itemPrice: itemPriceSanitized as number,
            itemStatus: itemStatusSanitized as boolean,
            onlineOrdering: onlineOrderingSanitized as boolean,
            dineIn: dineInSanitized as boolean,
            catering: cateringSanitized as boolean,
            itemLimit: itemLimitSanitized,
            popularItem: popularItemSanitized as boolean,
            upSellItem: upSellItemSanitized as boolean,
            isVegan: isVeganSanitized as boolean,
            hasNuts: hasNutsSanitized as boolean,
            isGlutenFree: isGlutenFreeSanitized as boolean,
            isHalal: isHalalSanitized as boolean,
            isSpicy: isSpicySanitized as boolean,
          });
        }
      });

      // Save in CsvUploadModel
      await CsvUploadModel.create({
        csvFile: input.csvFile,
        menu: input.menu,
        restaurantId: ctx.restaurantId,
        user: ctx.user,
      });

      // Delete the temp folder and csv file
      rmSync(tempDirLoc, { recursive: true, force: true });

      // Add to background worker
      await CsvQueue.add({
        type: CsvQueueType.SaveData,
        items: finalData,
        menu: input.menu,
        user: ctx.user,
        restaurant: ctx.restaurantId,
      });

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async saveCsvError(
    input: UploadCsvErrorInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Validate input values
      if (input.issues.length <= 0) {
        throw new ErrorWithProps("Issues cannot be empty, please try again!");
      }

      if (!validateWebSiteURL(input.errorFile)) {
        throw new ErrorWithProps(
          "Error file must be a valid url, please try again!"
        );
      }

      // Finally save it in the csvErrorUploadModel
      await CsvUploadErrorModel.create({
        issues: input.issues,
        errorFile: input.errorFile,
        user: ctx.user,
        restaurantId: ctx.restaurantId,
      });

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async getCsvErrors(ctx: Context): Promise<CsvUploadError[]> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const filterQuery: FilterQuery<CsvUploadError> = {
        restaurantId: ctx.restaurantId,
      };

      // Check if erros is there or not
      const csvErrors = await CsvUploadErrorModel.find(filterQuery)
        .select("_id createdAt")
        .lean();
      if (!csvErrors) {
        return [];
      }

      return csvErrors;
    } catch (error: any) {
      throw error;
    }
  }

  async getCsvError(id: string, ctx: Context): Promise<CsvUploadError> {
    try {
      // Check logged in user's permission
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.Menu
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      const filterQuery: FilterQuery<CsvUploadError> = {
        _id: id,
        restaurantId: ctx.restaurantId,
      };

      // Check if error is there or not
      const csvError = await CsvUploadErrorModel.findOne(filterQuery).lean();
      if (!csvError) {
        throw new ErrorWithProps(
          "Csv upload error not found, please try again"
        );
      }

      return csvError;
    } catch (error: any) {
      throw error;
    }
  }
}
