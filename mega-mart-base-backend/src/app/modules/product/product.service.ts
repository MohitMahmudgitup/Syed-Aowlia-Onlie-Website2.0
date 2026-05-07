import { Types } from "mongoose";
import { deleteImageFromCLoudinary } from "../../config/cloudinary.config";
import AppError from "../../errors/handleAppError";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { OrderModel } from "../order/order.model";
import { TagModel } from "../tags/tags.model";
import { ProductSearchableFields } from "./product.const";
import { TProduct } from "./product.interface";
import { ProductModel } from "./product.model";
import { subCategoryModel } from "../subcategory/subcategory.model";
import main from "../../config/geminiAI";

const createProductOnDB = async (payload: TProduct) => {
  const result = await ProductModel.create(payload);
  return result;
};

const getAllProductFromDB = async (query: Record<string, string>) => {
  // 1️⃣ Fetch all products with populate
  const products = await ProductModel.find()
    .populate("brandAndCategories.brand")
    .populate("brandAndCategories.categories")
    .populate("brandAndCategories.tags")
    .populate("brandAndCategories.subCategories")
    .lean(); // lean() converts mongoose docs to plain objects

  // 2️⃣ Attach subCategories inside each category
  const data = products.map((product) => {
    const { categories, subCategories } = product.brandAndCategories || {};

    const newCategories = categories?.map((cat: any) => ({
      ...cat,
      subCategories: subCategories || [], // attach subCategories here
    }));

    return {
      ...product,
      brandAndCategories: {
        ...product.brandAndCategories,
        categories: newCategories,
        subCategories: undefined,
      },
    };
  });

  return {
    data,
    meta: { total: data.length }, // optional, you can add pagination meta
  };
};

// productServices.ts

export const getProductsByCategoryandSubcategory = async (id: string) => {
  const queryId = new Types.ObjectId(id);

  const products = await ProductModel.aggregate([
    // 🔹 Lookup Categories
    {
      $lookup: {
        from: "categories",
        localField: "brandAndCategories.categories",
        foreignField: "_id",
        as: "categoryData",
      },
    },

    // 🔹 Lookup SubCategories (direct from product)
    {
      $lookup: {
        from: "subcategories",
        localField: "brandAndCategories.subCategories",
        foreignField: "_id",
        as: "subCategoryData",
      },
    },

    // 🔹 Match Category / Tag / SubCategory
    {
      $match: {
        $or: [
          { "brandAndCategories.categories": queryId },
          { "brandAndCategories.tags": queryId },
          { "brandAndCategories.subCategories": queryId },
        ],
      },
    },

    // 🔹 Attach subCategories inside each category
    {
      $addFields: {
        "brandAndCategories.categories": {
          $map: {
            input: "$categoryData",
            as: "cat",
            in: {
              $mergeObjects: [
                "$$cat",
                {
                  subCategories: "$subCategoryData", // 👈 attach here
                },
              ],
            },
          },
        },
      },
    },

    // 🔹 Remove extra fields
    {
      $project: {
        categoryData: 0,
        subCategoryData: 0,
        "brandAndCategories.subCategories": 0,
      },
    },
  ]);

  return products;
};


const getSingleProductFromDB = async (id: string) => {
  const result = await ProductModel.findById(id)
    .select("-vendorId -shopId") 
    .populate({
      path: "brandAndCategories.brand",
      select: "name -_id", // ✅ only name
    })
    .populate({
      path: "brandAndCategories.categories",
      select: "name _id", // ✅ only name
    })
    .populate({
      path: "brandAndCategories.subCategories",
      select: "name -_id", // ✅ only name
    })
    .populate({
      path: "brandAndCategories.tags",
      select: "name -_id", // ✅ only name
    });

  if (!result) return null;

  // 🔥 Manual cleanup
  const obj = result.toObject();

  return {
    ...obj,

    // description clean
    description: {
      name: obj.description?.name,
      unit: obj.description?.unit,
      description: obj.description?.description,
      shortdescription: obj.description?.shortdescription,
    },

    // productInfo clean
    productInfo: {
      price: obj.productInfo?.price,
      salePrice: obj.productInfo?.salePrice,
      quantity: obj.productInfo?.quantity,
      sku: obj.productInfo?.sku,
      width: obj.productInfo?.width,
      height: obj.productInfo?.height,
      length: obj.productInfo?.length,
      isExternal: obj.productInfo?.isExternal,
      external: obj.productInfo?.external,
    },

    // specifications clean
    specifications: obj.specifications?.map((spec: any) => ({
      key: spec.key,
      value: spec.value,
    })),
  };
};

const updateProductOnDB = async (
  id: string,
  updatedData: Partial<TProduct>
) => {
  const isProductExist = await ProductModel.findById(id);
  if (!isProductExist) {
    throw new AppError(404, "Product not found!");
  }

  if (
    updatedData.deletedImages &&
    updatedData.deletedImages.length > 0 &&
    isProductExist.gallery &&
    isProductExist.gallery.length > 0
  ) {
    const restDBImages = isProductExist.gallery.filter(
      (imageurl) => !updatedData.deletedImages?.includes(imageurl)
    );

    const updatedGalleryImages = (updatedData.gallery || [])
      .filter((imageurl) => !updatedData.deletedImages?.includes(imageurl))
      .filter((imageurl) => !restDBImages.includes(imageurl));

    updatedData.gallery = [...restDBImages, ...updatedGalleryImages];
  }

  const updatedProduct = await ProductModel.findByIdAndUpdate(
    id,
    { $set: updatedData },
    { new: true, runValidators: true }
  );

  // delete images from cloudinary if they are deleted
  if (updatedData.deletedImages && updatedData.deletedImages.length > 0) {
    await Promise.all(
      updatedData.deletedImages.map((imageurl) =>
        deleteImageFromCLoudinary(imageurl)
      )
    );
  }

  if (updatedData.featuredImg && isProductExist.featuredImg) {
    await deleteImageFromCLoudinary(isProductExist.featuredImg);
  }

  return updatedProduct;
};


const deleteProduct = async (id: string) => {
  try {

    const product = await ProductModel.findById(id);
    if (!product) {
      throw new AppError(404, 'Product not found');
    }

    if (product.featuredImg) {
      await deleteImageFromCLoudinary(product.featuredImg);
    }

    if (product.gallery && product.gallery.length > 0) {
      await Promise.all(
        product.gallery.map(imageurl => deleteImageFromCLoudinary(imageurl))
      );
    }

    await product.deleteOne()

  } catch (error) {
    console.error(error);

  }
}


const inventoryStats = async (id: string) => {
  const totalProducts = await ProductModel.countDocuments();

  const totalStock = await ProductModel.aggregate([
    { $group: { _id: null, total: { $sum: '$productInfo.quantity' } } },
  ]);

  const lowStockItems = await ProductModel.countDocuments({
    'productInfo.quantity': { $gt: 0, $lt: 10 },
  });

  const outOfStock = await ProductModel.countDocuments({
    'productInfo.quantity': 0,
  });

  const totalValueAgg = await ProductModel.aggregate([
    {
      $group: {
        _id: null,
        totalValue: {
          $sum: {
            $multiply: ['$productInfo.salePrice', '$productInfo.quantity'],
          },
        },
      },
    },
  ]);

  return {
    totalProducts,
    totalStock: totalStock[0]?.total || 0,
    lowStockItems,
    outOfStock,
    totalValue: totalValueAgg[0]?.totalValue || 0,
  };


};


export const bestSellingProducts = async (
  categorySlug?: string,
) => {
  let limit = 10;

  const pipeline: any[] = [
    { $unwind: "$orderInfo" },

    // total sold count
    {
      $group: {
        _id: "$orderInfo.productInfo",
        totalSold: { $sum: "$orderInfo.quantity" },
      },
    },

    { $sort: { totalSold: -1 } },

    // product lookup
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product",
      },
    },
    { $unwind: "$product" },

    // optional category filter
    ...(categorySlug
      ? [
          {
            $match: {
              "product.brandAndCategories.categories.slug": categorySlug,
            },
          },
        ]
      : []),

    // root replace
    { $replaceRoot: { newRoot: "$product" } },

    // 🔥 only প্রয়োজনীয় data return
    {
      $project: {
        _id: 1,
        featuredImg: 1,
        "description.name": 1,
      },
    },

    { $limit: limit },
  ];

  const result = await OrderModel.aggregate(pipeline);
  return result;
};

// -------------------------------------------------------------data Manager ------------------------------------------------
const NewArrivalsListData = async () => {
  const tag = await TagModel.findOne({ slug: "New-Arrivals" }).lean();
  if (!tag) return [];
  const products = await ProductModel.find({
    "brandAndCategories.tags": tag._id
  })
  .populate("brandAndCategories.categories", "name")
    .select(
      "featuredImg description.name description.description productInfo.price productInfo.salePrice"
    )
    .lean();

  return products;
};


const productcollection = async () => {
  const products = await ProductModel.find()
    .populate("brandAndCategories.categories", "name")
    .populate("brandAndCategories.tags", "name")
    .populate("brandAndCategories.brand", "name")
    .select(
      "featuredImg description.name  productInfo.price productInfo.salePrice"
    )
    .lean();

  return products;
};


const getSingleEditProductFromDB = async (id: string) => {
  const result = await ProductModel.findById(id)
    .populate("brandAndCategories.brand")
    .populate("brandAndCategories.categories")
    .populate("brandAndCategories.subCategories")
    .populate("brandAndCategories.tags");
  return result;
};


const getCategory = async () => {
  const products = await ProductModel.find()
    .populate({
      path: "brandAndCategories.categories",
      select: "name slug image bannerImg isFeatured createdAt updatedAt subCategories",
      populate: {
        path: "subCategories", // প্রতিটি category-এর ভিতরে subCategories populate
        select: "name slug details image bannerImg isFeatured createdAt updatedAt",
      },
    })
    .lean(); // plain JS object

  const data = products.map((product) => {
    const { categories } = product.brandAndCategories || {};

    const newCategories = categories?.map((cat: any) => ({
      _id: cat._id,
      name: cat.name,
      slug: cat.slug,
      image: cat.image,
      bannerImg: cat.bannerImg,
      isFeatured: cat.isFeatured,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
      subCategories: cat.subCategories || [], 
    }));

    return {
      brandAndCategories: {
        categories: newCategories,
      },
    };
  });

  return data;
}; 


const generateAIserves = async (title: string)=>{
  const data = await main(title)
  console.log(data)
  return data;

}

export const productServices = {
  createProductOnDB,
  getSingleProductFromDB,
  getAllProductFromDB,
  updateProductOnDB,
  getProductsByCategoryandSubcategory,
  deleteProduct,
  inventoryStats,
  bestSellingProducts,
  NewArrivalsListData,
  productcollection,
  getSingleEditProductFromDB,
  getCategory,
  generateAIserves
};
