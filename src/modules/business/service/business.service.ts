import { ErrorWithProps } from "mercurius";
import { UpdateQuery } from "mongoose";
import Context from "../../../types/context.type";
import { userHasPermission } from "../../../utils/helper";
import {
  enumValidation,
  isAlphanumeric,
  validateEIN,
  validateUSAddress,
} from "../../../utils/validations";
import { PermissionTypeEnum } from "../../masters/interface/masters.enum";
import { UserStatus } from "../../user/interfaces/user.enum";
import { UserModel } from "../../user/schema/user.schema";
import {
  BusinessTypeEnum,
  EstimatedRevenueEnum,
  StaffCountEnum,
} from "../interface/business.enum";
import {
  BusinessDetailsInput,
  UpdateBusinessDetailsInput,
} from "../interface/business.input";
import { Business, BusinessModel } from "../schema/business.schema";

export class BusinessService {
  async businessOnboarding(
    input: BusinessDetailsInput,
    ctx: Context
  ): Promise<boolean> {
    try {
      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        status: UserStatus.onboardingPending,
      })
        .select("firstName lastName email phone")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      const {
        address,
        businessName,
        businessType,
        ein,
        employeeSize,
        estimatedRevenue,
      } = input;

      // Validate all the input values
      if (businessName) {
        const sameBusinessName = await BusinessModel.countDocuments({
          businessName: businessName,
          "user.status": UserStatus.active,
        });

        if (sameBusinessName > 0) {
          throw new ErrorWithProps(
            "Business name is already taken, please choose a different name"
          );
        }
      }

      if (businessType) {
        if (!Object.values(BusinessTypeEnum).includes(businessType)) {
          throw new Error("Something went wrong, please try again!");
        }
      }

      if (employeeSize) {
        if (!Object.values(StaffCountEnum).includes(employeeSize)) {
          throw new Error("Something went wrong, please try again!");
        }
      }

      if (estimatedRevenue) {
        if (!Object.values(EstimatedRevenueEnum).includes(estimatedRevenue)) {
          throw new Error("Something went wrong, please try again!");
        }
      }

      if (address) {
        const addressIsValid = validateUSAddress(address);
        if (!addressIsValid) {
          throw new ErrorWithProps(
            "Please provide valid address details and try again!"
          );
        }
      }

      if (ein) {
        const validate = validateEIN(ein);
        if (!validate.ein) {
          throw new ErrorWithProps(
            "Please enter a valid EIN number and try again!"
          );
        }

        const einCheck = await UserModel.countDocuments({
          ein: ein,
          status: UserStatus.active,
        });

        if (einCheck > 0) {
          throw new ErrorWithProps(
            "This EIN number is already registered with us, please try to login!"
          );
        }
      }

      // Finally update / create the business model
      await BusinessModel.findOneAndUpdate(
        {
          "user._id": ctx.user,
        },
        {
          $set: {
            user: {
              _id: ctx.user,
              id: ctx.user,
              email: user.email,
              phone: user.phone,
              name: `${user.firstName} ${user.lastName}`,
            },
            ...input,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return true;
    } catch (error: any) {
      throw error;
    }
  }

  async businessOnboardingDetails(ctx: Context): Promise<Business> | null {
    try {
      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        status: UserStatus.onboardingPending,
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if business details exists or not
      const business = await BusinessModel.findOne({
        "user._id": user._id,
        "user.status": UserStatus.onboardingPending,
      }).lean();

      // If business details not found return null instead of throwing error because for the first time client will be expecting null only
      if (!business) {
        return null;
      }

      return business;
    } catch (error) {
      throw error;
    }
  }

  async completeBusinessOnboarding(ctx: Context): Promise<boolean> {
    try {
      // Check if user exists
      const user = await UserModel.findOne({
        _id: ctx.user,
        status: UserStatus.onboardingPending,
      })
        .select("_id")
        .lean();

      if (!user) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Check if business details exists or not
      const business = await BusinessModel.findOne({
        "user._id": ctx?.user,
        "user.status": UserStatus.onboardingPending,
        businessName: { $ne: null },
        businessType: { $ne: null },
        employeeSize: { $ne: null },
        estimatedRevenue: { $ne: null },
        ein: { $ne: null },
        address: { $ne: null },
      }).lean();

      if (!business) {
        throw new ErrorWithProps("Business details not found.");
      }

      // Validate all the stored input
      const {
        _id,
        businessName,
        businessType,
        employeeSize,
        estimatedRevenue,
        ein,
        address,
      } = business;

      const sameBusinessName = await UserModel.countDocuments({
        businessName: businessName,
        status: UserStatus.active,
      });

      if (sameBusinessName > 0) {
        throw new ErrorWithProps(
          "Business name is already taken, please choose a different name"
        );
      }

      if (!Object.values(BusinessTypeEnum).includes(businessType)) {
        throw new Error("Something went wrong, please try again!");
      }

      if (!Object.values(StaffCountEnum).includes(employeeSize)) {
        throw new Error("Something went wrong, please try again!");
      }

      if (!Object.values(EstimatedRevenueEnum).includes(estimatedRevenue)) {
        throw new Error("Something went wrong, please try again!");
      }

      const addressIsValid = validateUSAddress(address);
      if (!addressIsValid) {
        throw new ErrorWithProps(
          "Please provide valid address details and try again!"
        );
      }

      const validate = validateEIN(ein);
      if (!validate.ein) {
        throw new ErrorWithProps(
          "Please enter a valid EIN number and try again!"
        );
      }

      const einCheck = await UserModel.countDocuments({
        ein: ein,
        status: UserStatus.active,
      });

      if (einCheck > 0) {
        throw new ErrorWithProps(
          "This EIN number is already registered with us, please try to login!"
        );
      }

      // Finally update the user status and business model
      const b = await BusinessModel.updateOne(
        {
          "user._id": ctx.user,
          "user.status": UserStatus.onboardingPending,
        },
        {
          $set: {
            "user.status": UserStatus.internalVerificationPending,
          },
        }
      );

      await UserModel.updateOne(
        {
          _id: ctx.user,
          status: UserStatus.onboardingPending,
        },
        {
          $set: {
            status: UserStatus.internalVerificationPending,
            businessInfo: _id,
          },
        }
      );

      return true;
    } catch (error) {
      throw new ErrorWithProps(error.message.toString());
    }
  }

  async updateBusinessDetails(input: UpdateBusinessDetailsInput, ctx: Context) {
    try {
      // Check permissions
      const hasAccess = userHasPermission(
        ctx.permissions,
        PermissionTypeEnum.UpdateBusiness
      );
      if (!hasAccess) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      if (!ctx.accountOwner) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check input values
      const { _id, address, employeeSize, estimatedRevenue } = input;

      if (!isAlphanumeric(_id)) {
        throw new ErrorWithProps(
          "You are not authorised to perform this action"
        );
      }

      // Check if business exist
      const businessCheck = await BusinessModel.countDocuments({
        _id: _id,
        "user.id": ctx.accountOwner,
      }).lean();
      if (businessCheck !== 1) {
        throw new ErrorWithProps("Something went wrong, please try again!");
      }

      // Create update query
      let mainUpdQuery: UpdateQuery<Business> = {
        updatedBy: ctx.user,
      };

      if (employeeSize) {
        const validType = enumValidation(StaffCountEnum, employeeSize);
        if (!validType) {
          throw new ErrorWithProps(
            "Please enter valid value for employee size and try again!"
          );
        }

        mainUpdQuery.employeeSize = employeeSize;
      }

      if (estimatedRevenue) {
        const validType = enumValidation(
          EstimatedRevenueEnum,
          estimatedRevenue
        );
        if (!validType) {
          throw new ErrorWithProps(
            "Please enter valid value for estimated revenue and try again!"
          );
        }

        mainUpdQuery.estimatedRevenue = estimatedRevenue;
      }

      if (address) {
        const addressIsValid = validateUSAddress(address);
        if (!addressIsValid) {
          throw new ErrorWithProps(
            "Please provide valid address details and try again!"
          );
        }

        mainUpdQuery.address = address;
      }

      // Finally update the details in business model
      await BusinessModel.updateOne(
        {
          _id: _id,
          "user.id": ctx.accountOwner,
        },
        { $set: mainUpdQuery }
      );

      return true;
    } catch (error) {
      throw error;
    }
  }
}
