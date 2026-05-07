import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import httpStatus from "http-status";
import { productServices } from "./product.service";

export const getAllProduct = catchAsync(async (req, res) => {
  const {data, meta} = await productServices.getAllProductFromDB(req.query as Record<string, string>);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Products retrieve successfully!",
    data: data,
    meta: meta
  });
});

// productController.ts
export const getProductsByCategoryandsubcategory = catchAsync(
  async (req, res) => {
    const id = req.params.id;

    const result = await productServices.getProductsByCategoryandSubcategory(id);

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Products retrieved successfully!",
      data: result,
    });
  }
);

export const getSingleProduct = catchAsync(async (req, res) => {
  const id = req.params.id;
  const productId = id.split("-").pop();
  const result = await productServices.getSingleProductFromDB(productId as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product retrieve successfully!",
    data: result,
  });
});

export const createProduct = catchAsync(async (req, res) => {
  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const productData = {
    ...req.body,
    featuredImg: files["featuredImgFile"]?.[0]?.path || req.body.featuredImg || '',
    gallery: files["galleryImagesFiles"]
      ? files["galleryImagesFiles"].map((f) => f.path)
      : req.body.gallery || [] ,
  };

  const result = await productServices.createProductOnDB(productData);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Product created successfully!",
    data: result,
  });
});

export const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  const files = req.files as {
    [fieldname: string]: Express.Multer.File[];
  };

  const updatedData: any = {
    ...req.body,
  };

  if (files["featuredImgFile"]?.[0]?.path) {
    updatedData.featuredImg = files["featuredImgFile"][0].path;
  }

  if (files["galleryImagesFiles"]?.length) {
    updatedData.gallery = files["galleryImagesFiles"].map((f) => f.path);
  }

  const result = await productServices.updateProductOnDB(id, updatedData);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product updated successfully!",
    data: result,
  });
});


export const deleteProduct = catchAsync(async (req, res) => {
  await productServices.deleteProduct(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Product deleted successfully!',
    data: null,
  });
});

export const inventoryStats = catchAsync(async (req, res) => {
 const result = await productServices.inventoryStats(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Inventory Get successfully!',
    data: result,
  });
});


export const bestSellingProducts = catchAsync(async (req, res) => {
  const result = await productServices.bestSellingProducts(req.query.category as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Inventory Get successfully!',
    data: result,
  });
});


// --------------------------------------------data manager--------------------------------------------------
export const newArrivalsListData = catchAsync(async (req, res) => {
  const result = await productServices.NewArrivalsListData();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'New Arrivals retrieved successfully!',
    data: result,
  });
});

export const productcollections = catchAsync(async (req, res) => {
  const result = await productServices.productcollection();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Product collection retrieved successfully!',
    data: result,
  });
});


export const getSingleEditProduct = catchAsync(async (req, res) => {
  const id = req.params.id;
  const productId = id.split("-").pop();
  const result = await productServices.getSingleEditProductFromDB(productId as string);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Product retrieve successfully!",
    data: result,
  });
});

export const getCategory = catchAsync(async (req, res) => {
  const result = await productServices.getCategory();
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Category retrieve successfully!",
    data: result,
  });
});


export const generateAI = catchAsync(async (req, res)=>{
  const {title} = req.body;
    if (!title) {
    return sendResponse(res, {
      success: false,
      statusCode: 400,
      message: 'Title is required!',
      data: null,
    });
  }
  console.log(title)
  const result = await  productServices.generateAIserves(title);
 sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "generate successfully!",
    data: result,
  });
})