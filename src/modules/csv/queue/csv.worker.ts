import { mongoose } from "@typegoose/typegoose";
import { StatusEnum } from "../../../types/common.enum";
import { CategoryModel } from "../../categories/schema/category.schema";
import { sendCsvUploadSummaryMail } from "../../emailers/service";
import { ItemModel } from "../../items/schema/item.schema";
import {
  ConfigTypeEnum,
  ItemOptionsEnum,
} from "../../masters/interface/masters.enum";
import {
  ConfigsModel,
  ItemOptionsModel,
} from "../../masters/schema/index.schema";
import { MenuTypeEnum } from "../../menu/interfaces/menu.enum";
import { MenuModel } from "../../menu/schema/menu.schema";
import { RestaurantModel } from "../../restaurant/schema/restaurant.schema";
import { SubCategoryModel } from "../../subCategories/schema/subCategories.schema";
import { UserModel } from "../../user/schema/user.schema";
import { CsvRowItem } from "../interface/csv.types";

export const saveCsvDataWorker = async (
  csvItems: CsvRowItem[],
  menu: string,
  user: string,
  restaurant: string
) => {
  const dbSession = await mongoose.startSession();
  dbSession.startTransaction();

  try {
    if (csvItems.length > 0) {
      const maxCsvRows = await ConfigsModel.findOne({
        type: ConfigTypeEnum.MaxCSVRows,
      })
        .select("value")
        .lean();

      if (maxCsvRows) {
        const data = csvItems.splice(0, maxCsvRows.value);

        // Get current unique menu types
        const menus = await MenuModel.find({ type: { $ne: null } })
          .select("type")
          .lean();
        const uniqueMenuTypes = new Set<MenuTypeEnum>();
        menus.forEach((menu) => uniqueMenuTypes.add(menu.type));

        // Get current item options
        const allItemOptions = await ItemOptionsModel.find()
          .select("_id type displayName desc")
          .lean();

        // Check if menu is there or not
        const checkMenu = await MenuModel.findOne({
          _id: menu,
          restaurantId: restaurant,
        })
          .select("_id categories")
          .lean();

        if (checkMenu) {
          const categoryMap = new Map<string, string>();
          const subCategoryMap = new Map<string, string>();
          const addItemMap = new Map<string, string>();
          const updateItemMap = new Map<string, string>();

          let categoryAddedCount = 0;
          let subCategoryAddedCount = 0;

          const resto = await RestaurantModel.findOne({ _id: restaurant })
            .select("_id availability")
            .lean();

          if (resto) {
            for (let i = 0; i < data.length; i++) {
              const element = data[i];
              let item: {
                category: string;
                categoryDesc: string | null;
                subCategory: string | null;
                subCategoryDesc: string | null;
                name: string;
                desc: string;
                price: number;
                status: boolean;
                orderLimit: number | null;
                visibility: { menuType: MenuTypeEnum; status: StatusEnum }[];
                priceOptions: {
                  menuType: MenuTypeEnum;
                  price: number;
                }[];
                options: {
                  _id: string;
                  type: ItemOptionsEnum;
                  displayName: string;
                  desc: string;
                  status: boolean;
                }[];
              };

              let visibility = new Map<MenuTypeEnum, boolean>();
              let priceOptions = new Map<MenuTypeEnum, number>();
              let options = new Map<
                ItemOptionsEnum,
                {
                  _id: string;
                  displayName: string;
                  desc: string;
                  status: boolean;
                }
              >();

              // Checking menu types and populating visibility and priceOptions map
              if (uniqueMenuTypes.has(MenuTypeEnum.OnlineOrdering)) {
                visibility.set(
                  MenuTypeEnum.OnlineOrdering,
                  element.onlineOrdering
                );
                priceOptions.set(
                  MenuTypeEnum.OnlineOrdering,
                  element.itemPrice
                );
              }
              if (uniqueMenuTypes.has(MenuTypeEnum.DineIn)) {
                visibility.set(MenuTypeEnum.DineIn, element.dineIn);
                priceOptions.set(MenuTypeEnum.DineIn, element.itemPrice);
              }
              if (uniqueMenuTypes.has(MenuTypeEnum.Catering)) {
                visibility.set(MenuTypeEnum.Catering, element.catering);
                priceOptions.set(MenuTypeEnum.Catering, element.itemPrice);
              }

              const itemOptions = allItemOptions.map((e) => e.type);

              // Popular Item Check
              if (itemOptions.includes(ItemOptionsEnum.PopularItem)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.PopularItem
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.PopularItem, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.popularItem,
                  });
                }
              }

              // Upsell Item Check
              if (itemOptions.includes(ItemOptionsEnum.UpSellItem)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.UpSellItem
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.UpSellItem, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.upSellItem,
                  });
                }
              }

              // Has Nuts Item Check
              if (itemOptions.includes(ItemOptionsEnum.HasNuts)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.HasNuts
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.HasNuts, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.hasNuts,
                  });
                }
              }

              // Gluten Free Item Check
              if (itemOptions.includes(ItemOptionsEnum.IsGlutenFree)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.IsGlutenFree
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.IsGlutenFree, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.isGlutenFree,
                  });
                }
              }

              // Halal Item Check
              if (itemOptions.includes(ItemOptionsEnum.IsHalal)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.IsHalal
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.IsHalal, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.isHalal,
                  });
                }
              }

              // Vegan Item Check
              if (itemOptions.includes(ItemOptionsEnum.IsVegan)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.IsVegan
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.IsVegan, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.isVegan,
                  });
                }
              }

              // Spicy Item Check
              if (itemOptions.includes(ItemOptionsEnum.IsSpicy)) {
                const iOpts = allItemOptions.find(
                  (e) => e.type == ItemOptionsEnum.IsSpicy
                );
                if (iOpts) {
                  options.set(ItemOptionsEnum.IsSpicy, {
                    _id: iOpts._id,
                    displayName: iOpts.displayName,
                    desc: iOpts.displayName,
                    status: element.isSpicy,
                  });
                }
              }

              let v: {
                menuType: MenuTypeEnum;
                status: StatusEnum;
              }[] = [];
              let po: {
                menuType: MenuTypeEnum;
                price: number;
              }[] = [];
              let opts: {
                _id: string;
                type: ItemOptionsEnum;
                displayName: string;
                desc: string;
                status: boolean;
              }[] = [];

              for (let entry of visibility.entries()) {
                v.push({
                  menuType: entry[0],
                  status: entry[1] ? StatusEnum.active : StatusEnum.inactive,
                });
              }

              for (let entry of priceOptions.entries()) {
                po.push({
                  menuType: entry[0],
                  price: entry[1],
                });
              }

              for (let entry of options.entries()) {
                opts.push({
                  _id: entry[1]._id,
                  type: entry[0],
                  displayName: entry[1].displayName,
                  desc: entry[1].desc,
                  status: entry[1].status,
                });
              }

              item = {
                category: element.category,
                categoryDesc: element.categoryDesc,
                subCategory: element.subCategory,
                subCategoryDesc: element.subCategoryDesc,
                name: element.itemName,
                desc: element.itemDesc,
                price: element.itemPrice,
                status: element.itemStatus,
                orderLimit: element.itemLimit,
                visibility: v,
                priceOptions: po,
                options: opts,
              };

              // Check subCategory in set
              if (item.subCategory !== null) {
                let localSubCategoryCheck = subCategoryMap.get(
                  item.subCategory
                );

                if (!localSubCategoryCheck) {
                  // Check subCategory in db
                  const subCateCheck = await SubCategoryModel.findOne({
                    name: item.subCategory,
                    user: user,
                    restaurantId: restaurant,
                  })
                    .select("_id name")
                    .lean();

                  if (!subCateCheck) {
                    // Add subCategory in db
                    const subCate = await SubCategoryModel.create(
                      [
                        {
                          name: item.subCategory,
                          desc: item.subCategoryDesc,
                          restaurantId: restaurant,
                          user: user,
                        },
                      ],
                      { session: dbSession }
                    );

                    if (subCate.length > 0) {
                      subCategoryMap.set(
                        item.subCategory,
                        subCate[0]._id.toString()
                      );
                      subCategoryAddedCount += 1;
                    }
                  } else {
                    subCategoryMap.set(
                      item.subCategory,
                      subCateCheck._id.toString()
                    );
                  }
                }
              }

              // Save / Update item in database
              const checkItem = await ItemModel.countDocuments({
                name: item.name,
              });

              let updItemCateId = "";

              if (checkItem === 1) {
                const updItem = await ItemModel.findOneAndUpdate(
                  {
                    name: item.name,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $set: {
                      desc: item.desc,
                      price: item.price,
                      status: item.status
                        ? StatusEnum.active
                        : StatusEnum.inactive,
                      priceOptions: po,
                      visibility: v,
                      options: opts,
                      orderLimit: item.orderLimit,
                      subCategory:
                        item.subCategory !== null &&
                        subCategoryMap.get(item.subCategory) !== undefined
                          ? {
                              id: subCategoryMap.get(item.subCategory),
                              name: item.subCategory,
                              desc: item.desc,
                            }
                          : null,
                    },
                  },
                  { session: dbSession }
                )
                  .select("_id category")
                  .lean();

                updItemCateId = updItem.category.toString();

                updateItemMap.set(item.name, updItem._id);
              } else {
                const addItem = await ItemModel.create(
                  [
                    {
                      name: item.name,
                      desc: item.desc,
                      price: item.price,
                      status: item.status
                        ? StatusEnum.active
                        : StatusEnum.inactive,
                      user: user,
                      restaurantId: restaurant,
                      availability: resto.availability,
                      visibility: v,
                      priceOptions: po,
                      options: opts,
                      orderLimit: item.orderLimit,
                      subCategory:
                        item.subCategory !== null &&
                        subCategoryMap.get(item.subCategory) !== undefined
                          ? {
                              id: subCategoryMap.get(item.subCategory),
                              name: item.subCategory,
                              desc: item.desc,
                            }
                          : null,
                    },
                  ],
                  { session: dbSession }
                );

                if (addItem.length > 0) {
                  addItemMap.set(item.name, addItem[0]._id);
                }
              }

              // Check category in set
              let localCategoryCheck = categoryMap.get(item.category);

              if (!localCategoryCheck) {
                // Check category in db
                const cateCheck = await CategoryModel.findOne({
                  name: item.category,
                  user: user,
                  restaurantId: restaurant,
                })
                  .select("_id name status")
                  .lean();

                if (!cateCheck) {
                  // Add category in db
                  const cate = await CategoryModel.create(
                    [
                      {
                        name: item.category,
                        desc: item.categoryDesc,
                        user: user,
                        restaurantId: restaurant,
                        menu: [menu],
                        availability: resto.availability,
                        visibility: v,
                      },
                    ],
                    { session: dbSession }
                  );

                  if (cate.length > 0) {
                    await MenuModel.updateOne(
                      {
                        _id: menu,
                        user: user,
                        restaurantId: restaurant,
                      },
                      {
                        $addToSet: {
                          categories: {
                            _id: cate[0]._id,
                            id: cate[0]._id.toString(),
                            name: cate[0].name,
                            status: cate[0].status,
                          },
                        },
                      },
                      { session: dbSession }
                    );

                    categoryMap.set(item.category, cate[0]._id.toString());
                    categoryAddedCount += 1;
                  }
                } else {
                  // check if cate is added in the menu
                  const checkCateInMenu = checkMenu.categories.find(
                    (e) => e.id === cateCheck._id.toString()
                  );
                  if (!checkCateInMenu) {
                    await MenuModel.updateOne(
                      {
                        _id: menu,
                        user: user,
                        restaurantId: restaurant,
                      },
                      {
                        $addToSet: {
                          categories: {
                            _id: cateCheck._id,
                            id: cateCheck._id.toString(),
                            name: cateCheck.name,
                            status: cateCheck.status,
                          },
                        },
                      },
                      { session: dbSession }
                    );

                    await CategoryModel.updateOne(
                      { _id: cateCheck._id },
                      { $addToSet: { menu: menu } },
                      { session: dbSession }
                    );
                  }
                  categoryMap.set(item.category, cateCheck._id.toString());
                }
              }

              let cid = categoryMap.get(item.category);

              // remove item from updItemCateId category and add it to cid category
              if (checkItem === 1 && cid !== updItemCateId) {
                const iId = updateItemMap.get(item.name);
                const i = await ItemModel.findOneAndUpdate(
                  {
                    _id: iId,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $set: {
                      category: cid,
                    },
                  },
                  { session: dbSession }
                )
                  .select("_id name price status image")
                  .lean();

                await CategoryModel.updateOne(
                  {
                    _id: updItemCateId,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $pull: {
                      items: {
                        _id: iId,
                      },
                    },
                  },
                  { session: dbSession }
                );

                await CategoryModel.updateOne(
                  {
                    _id: cid,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $push: {
                      items: {
                        _id: i._id,
                        id: i._id.toString(),
                        name: i.name,
                        price: i.price,
                        status: i.status,
                        image: i.image,
                      },
                    },
                  },
                  { session: dbSession }
                );
              }
              // add item to cid
              else if (checkItem === 0 && updItemCateId === "") {
                const iId = addItemMap.get(item.name);
                const i = await ItemModel.findOneAndUpdate(
                  {
                    _id: iId,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $set: {
                      category: cid,
                    },
                  },
                  { new: true, session: dbSession }
                )
                  .select("_id name price status image")
                  .lean();

                await CategoryModel.updateOne(
                  {
                    _id: cid,
                    user: user,
                    restaurantId: restaurant,
                  },
                  {
                    $push: {
                      items: {
                        _id: i._id,
                        id: i._id.toString(),
                        name: i.name,
                        price: i.price,
                        status: i.status,
                        image: i.image,
                      },
                    },
                  },
                  { session: dbSession }
                );
              }
            }

            // Send mail with stats
            const u = await UserModel.findOne({ _id: user })
              .select("email")
              .lean();
            await sendCsvUploadSummaryMail(
              u.email ?? "",
              addItemMap.size,
              updateItemMap.size,
              categoryAddedCount,
              subCategoryAddedCount
            );

            await dbSession.commitTransaction();
          }
        }
      }
    }
  } catch (error) {
    await dbSession.abortTransaction();
    console.log("CSV Upload Error", error);
  } finally {
    await dbSession.endSession();
  }
};
