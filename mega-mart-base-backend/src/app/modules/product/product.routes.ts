import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { bestSellingProducts, createProduct, deleteProduct, generateAI, getAllProduct, getProductsByCategoryandsubcategory,getSingleEditProduct, getSingleProduct, inventoryStats, newArrivalsListData, productcollections, updateProduct     } from "./product.controller";
import { createProductZodSchema, updateProductZodSchema } from "./product.validations";
import { multerUpload } from "../../config/multer.config";


const router = express.Router();

router.post(
  '/create-product',
  multerUpload.fields([
    { name: 'galleryImagesFiles' , maxCount: 20},
    { name: 'featuredImgFile', maxCount: 1 },
  ]),
  validateRequest(createProductZodSchema),
  createProduct
);
router.get("/", getAllProduct);
router.get('/best-selling-products', bestSellingProducts);
router.get("/category/:id", getProductsByCategoryandsubcategory);
router.get('/inventory/stats', inventoryStats);
router.get("/:id", getSingleProduct);
router.patch(
  '/update-product/:id',
  multerUpload.fields([
    { name: 'galleryImagesFiles', maxCount: 20 },
    { name: 'featuredImgFile', maxCount: 1 },
  ]),
  validateRequest(updateProductZodSchema),
  updateProduct
);


router.delete('/delete-product/:id', deleteProduct);
router.post('/generate-ai',  multerUpload.none(), generateAI);
// ---------------------------------------- data Manager ------------------------------------------------

router.get('/type/new-arrivals', newArrivalsListData);
router.get('/type/product-collection', productcollections);
router.get('/edit/:id', getSingleEditProduct);



export const ProductRoutes = router;
