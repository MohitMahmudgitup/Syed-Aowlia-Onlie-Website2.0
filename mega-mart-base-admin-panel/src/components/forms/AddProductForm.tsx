/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import slugify from "slugify";
import { useForm, SubmitHandler, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Sparkles, CheckCircle, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { marked } from "marked";

import { Button } from "../ui/button";
import { ImageUploader } from "../shared/ImageUploader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import MultipleSelector from "../ui/multiselect";

import { useGetAllCategoriesQuery } from "@/redux/featured/categories/categoryApi";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setTags } from "@/redux/featured/tags/tagsSlice";
import { setCategories } from "@/redux/featured/categories/categorySlice";
import { createProductZodSchema } from "./formSchema";
import {
  useCreateProductMutation,
  useGenerateAIDescriptionMutation,
} from "@/redux/featured/products/productsApi";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useGetAllShopsQuery } from "@/redux/featured/shop/shopApi";
import { useGetAllTagsQuery } from "@/redux/featured/tags/tagsApi";
import RichTextEditor from "../editor/RichTextEditor";
import { useGetAllBrandsQuery } from "@/redux/featured/brands/brandsApi";
import { selectCurrentUser } from "@/redux/featured/auth/authSlice";
import { useGetAllSubCategoriesQuery } from "@/redux/featured/subcategories/subcategoryApi";

export type Option = {
  value: string;
  label: string;
  disable?: boolean;
};

export type Specification = {
  key: string;
  value: string;
};

type ProductFormValues = z.infer<typeof createProductZodSchema>;

interface AddProductFormProps {
  importedData?: any;
}

// AI state machine: idle | loading | preview
type AIState = "idle" | "loading" | "preview";

export default function AddProductForm({ importedData }: AddProductFormProps) {
  const currentUser: any = useAppSelector(selectCurrentUser);
  const [description, setDescription] = useState("");
  const [hasImported, setHasImported] = useState(false);
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [createProduct] = useCreateProductMutation();

  // ✅ AI state
  const [generateAIDescription] = useGenerateAIDescriptionMutation();
  const [aiState, setAiState] = useState<AIState>("idle");
  const [aiResult, setAiResult] = useState<string>("");

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useGetAllCategoriesQuery(undefined);
  const { data: subCategoriesData, isLoading: isSubCategoriesLoading } =
    useGetAllSubCategoriesQuery(undefined);
  const { data: tagsData, isLoading: isTagsLoading } =
    useGetAllTagsQuery(undefined);
  const { data: brands, isLoading: isBrandsLoading } =
    useGetAllBrandsQuery(undefined);
  const { data: shopData, isLoading: isShopDataLoading } =
    useGetAllShopsQuery();

  const [featuredImage, setFeaturedImage] = useState<File | null>(null);
  const [galleryImage, setGalleryImage] = useState<File[]>([]);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(createProductZodSchema),
    mode: "onChange",
    defaultValues: {
      shopId: "",
      vendorId: "",
      video: "",
      brandAndCategories: {
        brand: "",
        categories: [],
        subCategories: [],
        tags: [],
      },
      description: {
        name: "",
        slug: "",
        unit: "",
        description: "",
        shortdescription: "",
        status: "publish",
      },
      productType: "simple",
      productInfo: {
        price: undefined,
        salePrice: undefined,
        quantity: 10,
        sku: "",
        width: "",
        height: "",
        length: "",
        isExternal: false,
        external: {
          productUrl: "",
          buttonLabel: "Buy now",
        },
        status: "publish",
      },
      specifications: [{ key: "", value: "" }],
      variants: [
        {
          color: "Default",
          size: "Default",
          price: 0,
          stock: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "specifications",
  });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
  } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const isExternalProduct = form.watch("productInfo.isExternal");
  const productType = form.watch("productType");
  const productName = form.watch("description.name");

  // ✅ Generate AI description
  const handleGenerateAI = async () => {
    const title = form.getValues("description.name");
    if (!title || title.trim() === "") {
      toast.error("Please enter a product name first!");
      return;
    }
    try {
      setAiState("loading");
      setAiResult("");
      const result = await generateAIDescription({ title }).unwrap();
      const fullText = result.data || "";
      setAiResult(fullText);
      setAiState("preview");
    } catch {
      toast.error("Failed to generate description!");
      setAiState("idle");
    }
  };

  // ✅ Apply: markdown → HTML → RichTextEditor
  const handleUseAIDescription = async () => {
    try {
      const htmlContent = await marked(aiResult);
      setDescription(htmlContent);
    } catch {
      setDescription(aiResult);
    }
    setAiState("idle");
    setAiResult("");
    toast.success("AI description applied!");
  };

  // ✅ Regenerate
  const handleRegenerate = () => {
    setAiResult("");
    setAiState("idle");
    setTimeout(() => handleGenerateAI(), 100);
  };

  // ✅ Discard
  const handleDiscardAI = () => {
    setAiResult("");
    setAiState("idle");
  };

  const onSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    const submitToast = toast.loading("Submiting Product...");
    try {
      const formData = new FormData();
      if (featuredImage) formData.append("featuredImgFile", featuredImage);
      if (galleryImage && galleryImage.length > 0) {
        galleryImage.forEach((file) => formData.append("galleryImagesFiles", file));
      }

      let payload: any;
      if (importedData) {
        payload = {
          ...data,
          description: {
            ...data.description,
            description,
            status: data.productInfo.status,
          },
          featuredImg: importedData.images[0] || "",
          gallery: importedData.images.slice(1) || [],
        };
      } else {
        payload = {
          ...data,
          description: {
            ...data.description,
            description,
            status: data.productInfo.status,
          },
        };
      }

      if (payload) formData.append("data", JSON.stringify(payload));

      await createProduct(formData).unwrap();
      toast.success("Product Created successfully!", { id: submitToast });
      form.reset();
      setFeaturedImage(null);
      setGalleryImage([]);
      router.push("/admin/all-product");
    } catch (error: any) {
      const errorMessage =
        error?.data?.errorSources?.[0]?.message ||
        error?.data?.message ||
        error?.message ||
        "Something went wrong!";
      toast.error(errorMessage, { id: submitToast });
    }
  };

  const onErrors = (errors: any) => {};

  useEffect(() => {
    if (tagsData) dispatch(setTags(tagsData));
    if (categoriesData) dispatch(setCategories(categoriesData));
  }, [dispatch, tagsData, categoriesData]);

  useEffect(() => {
    if (importedData && !hasImported) {
      const importData = async () => {
        try {
          if (importedData.name) {
            form.setValue("description.name", importedData.name, { shouldValidate: true });
            form.setValue("description.slug", slugify(importedData.name, { lower: true, strict: true }), { shouldValidate: true });
          }
          if (importedData.description) setDescription(importedData.description);
          if (importedData.price) form.setValue("productInfo.price", importedData.price, { shouldValidate: true });
          if (importedData.salePrice) form.setValue("productInfo.salePrice", importedData.salePrice, { shouldValidate: true });
          if (importedData.packageInfo) {
            if (importedData.packageInfo.width) form.setValue("productInfo.width", `${importedData.packageInfo.width}cm`, { shouldValidate: true });
            if (importedData.packageInfo.height) form.setValue("productInfo.height", `${importedData.packageInfo.height}cm`, { shouldValidate: true });
            if (importedData.packageInfo.length) form.setValue("productInfo.length", `${importedData.packageInfo.length}cm`, { shouldValidate: true });
          }
          if (importedData.video && importedData.video !== "0") form.setValue("video", importedData.video, { shouldValidate: true });
          if (importedData.variants && importedData.variants.length > 0) {
            const currentLength = variantFields.length;
            for (let i = currentLength - 1; i >= 0; i--) removeVariant(i);
            await new Promise((resolve) => setTimeout(resolve, 100));
            importedData.variants.forEach((variant: any) => {
              appendVariant({
                color: variant.color || "Default",
                size: variant.size || "Default",
                price: variant.price || 0,
                stock: variant.stock || 0,
              });
            });
          }
          setHasImported(true);
          toast.success("Product data imported! Please review and edit as needed.");
        } catch (error) {
          console.error("Error importing product data:", error);
          toast.error("Error importing product data. Please try again.");
        }
      };
      importData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedData, hasImported]);

  const simplifiedCategories: Option[] =
    categoriesData?.map((cat: any) => ({ value: cat._id, label: cat.name })) ?? [];

  const simplifiedTags: Option[] =
    tagsData?.data?.map((tag: any) => ({ value: tag._id, label: tag.name })) ?? [];

  const simplifiedSubCategories: Option[] =
    subCategoriesData?.map((subCat: any) => ({ value: subCat._id, label: subCat.name })) ?? [];

  return (
    <Form {...form}>
      <form
        id="addProductForm"
        onSubmit={form.handleSubmit(onSubmit, onErrors)}
        className="grid grid-cols-1 xl:grid-cols-2 gap-6 2xl:gap-6"
      >
        {/* ===================== LEFT COLUMN ===================== */}
        <div className="space-y-6">
          {/* Basic Details */}
          <div className="space-y-4 md:p-6 p-4 bg-white rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">Basic Details</h2>

            {/* Product Name */}
            <FormField
              control={form.control}
              name="description.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter product name"
                      {...field}
                      onChange={(e) => {
                        field.onChange(e);
                        form.setValue(
                          "description.slug",
                          slugify(e.target.value, { lower: true, strict: true }),
                          { shouldValidate: true }
                        );
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Short Description */}
            <FormField
              control={form.control}
              name="description.shortdescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Short Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter short description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ✅ Product Description with AI */}
            <FormField
              control={form.control}
              name="description.description"
              render={() => (
                <FormItem>
                  {/* Label + action buttons */}
                  <div className="flex items-center justify-between">
                    <FormLabel>Product Description</FormLabel>

                    {/* idle → Generate button */}
                    {aiState === "idle" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateAI}
                        disabled={!productName?.trim()}
                        className="flex items-center gap-1.5 text-violet-600 border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:border-violet-400 transition-all duration-200 disabled:opacity-40"
                      >
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Generate AI Description
                      </Button>
                    )}

                    {/* preview → Regenerate + Discard */}
                    {aiState === "preview" && (
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRegenerate}
                          className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 text-xs"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Regenerate
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleDiscardAI}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Discard
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* LOADING — bounce dots */}
                  {aiState === "loading" && (
                    <div className="flex flex-col items-center justify-center gap-3 min-h-[140px] w-full rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/50">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-2.5 h-2.5 bg-violet-400 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                      <p className="text-xs text-violet-400 font-medium tracking-wide">
                        AI is generating your description...
                      </p>
                    </div>
                  )}

                  {/* PREVIEW — clean rendered Markdown (no raw symbols) */}
                  {aiState === "preview" && aiResult && (
                    <div className="w-full rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/60 to-purple-50/40 overflow-hidden">
                      {/* top bar */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 bg-violet-50/80">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                          <span className="text-xs font-semibold text-violet-600 tracking-wide uppercase">
                            AI Generated Preview
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleUseAIDescription}
                          className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs h-7 px-3"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Use This Description
                        </Button>
                      </div>

                      {/* Rendered Markdown */}
                      <div className="px-4 py-4 max-h-[480px] overflow-y-auto">
                        <div className="text-sm text-gray-700 leading-relaxed">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-base font-bold text-gray-900 mt-4 mb-2 first:mt-0 border-b border-violet-100 pb-1.5">
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-sm font-bold text-gray-800 mt-3.5 mb-1.5">
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2.5 leading-relaxed text-gray-700">
                                  {children}
                                </p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-gray-900">
                                  {children}
                                </strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic text-gray-600">{children}</em>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc list-inside space-y-1 my-2 text-gray-700 pl-1">
                                  {children}
                                </ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal list-inside space-y-1 my-2 text-gray-700 pl-1">
                                  {children}
                                </ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-sm leading-relaxed">{children}</li>
                              ),
                              hr: () => <hr className="border-violet-200 my-3" />,
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-2 border-violet-300 pl-3 italic text-gray-600 my-2">
                                  {children}
                                </blockquote>
                              ),
                              code: ({ children }) => (
                                <code className="bg-violet-100 text-violet-800 px-1 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ),
                            }}
                          >
                            {aiResult}
                          </ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RichTextEditor — only in idle state */}
                  {aiState === "idle" && (
                    <RichTextEditor
                      value={description}
                      onChange={(content: any) => setDescription(content)}
                      placeholder="Write your product description here..."
                    />
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Select Shop */}
            <FormField
              control={form.control}
              name="shopId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Shop</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedShop = shopData?.find((shop: any) => shop._id === value);
                      if (selectedShop) {
                        form.setValue("vendorId", selectedShop.vendorId ?? selectedShop.vendorId?._id);
                      } else {
                        form.setValue("vendorId", "");
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a Shop" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isShopDataLoading ? (
                        <SelectItem disabled value="loading">
                          <span className="animate-pulse text-gray-400">Loading Shops...</span>
                        </SelectItem>
                      ) : shopData && shopData.length > 0 ? (
                        (currentUser?.role === "vendor"
                          ? shopData.filter((shop: any) => shop.vendorId?._id === currentUser?._id)
                          : shopData
                        ).map((shop: any) => (
                          <SelectItem key={shop._id} value={shop._id}>
                            {shop.basicInfo.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no-shops">
                          <span className="text-sm text-gray-500">No shops available</span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Product Info & Pricing */}
          <div className="space-y-4 md:p-6 p-4 bg-white rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">Product Info & Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="productInfo.price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter price" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="productInfo.salePrice" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sale Price</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter sale price" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="productInfo.quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel>Quantity</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="Enter quantity" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="productInfo.sku" render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter SKU" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="description.unit" render={({ field }) => (
                <FormItem>
                  <FormLabel>Select Unit</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select unit" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pcs">pcs</SelectItem>
                      <SelectItem value="kg">kg</SelectItem>
                      <SelectItem value="box">box</SelectItem>
                      <SelectItem value="set">set</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description.status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="publish">Publish</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="productType" render={({ field }) => (
              <FormItem>
                <FormLabel>Product Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select product type" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField control={form.control} name="productInfo.width" render={({ field }) => (
                <FormItem><FormLabel>Width</FormLabel><FormControl><Input placeholder="e.g., 120cm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="productInfo.height" render={({ field }) => (
                <FormItem><FormLabel>Height</FormLabel><FormControl><Input placeholder="e.g., 75cm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="productInfo.length" render={({ field }) => (
                <FormItem><FormLabel>Length</FormLabel><FormControl><Input placeholder="e.g., 60cm" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
          </div>

          {/* External Product */}
          <div className="space-y-4 md:p-6 p-4 bg-white rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">External Product</h2>
            <FormField control={form.control} name="productInfo.isExternal" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Is this an external product?</FormLabel>
                </div>
                <FormControl>
                  <span><Checkbox checked={field.value} onCheckedChange={field.onChange} /></span>
                </FormControl>
              </FormItem>
            )} />
            {isExternalProduct && (
              <div className="space-y-4 border p-4 rounded-md">
                <FormField control={form.control} name="productInfo.external.productUrl" render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Product URL</FormLabel>
                    <FormControl><Input placeholder="https://example.com/product" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="productInfo.external.buttonLabel" render={({ field }) => (
                  <FormItem>
                    <FormLabel>External Button Label</FormLabel>
                    <FormControl><Input placeholder="e.g., Buy on Amazon" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}
          </div>

          {/* Product Specifications */}
          <div className="space-y-4 md:p-6 p-4 bg-white rounded-xl shadow-sm">
            <h2 className="text-lg font-semibold">Product Specifications</h2>
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div key={item.id} className="flex flex-col md:flex-row items-start md:items-end gap-4 border p-4 rounded-lg">
                  <FormField control={form.control} name={`specifications.${index}.key`} render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Key</FormLabel>
                      <FormControl><Input placeholder="e.g. Color" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`specifications.${index}.value`} render={({ field }) => (
                    <FormItem className="w-full">
                      <FormLabel>Value</FormLabel>
                      <FormControl><Input placeholder="e.g. Red" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="button" variant="destructive" className="w-full md:w-auto" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" className="w-full md:w-fit" onClick={() => append({ key: "", value: "" })}>
              + Add Specification
            </Button>
          </div>
        </div>

        {/* ===================== RIGHT COLUMN ===================== */}
        <div className="space-y-6">
          {/* Product Media */}
          <div className="space-y-4 bg-white md:p-6 p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">Product Media</h2>
            <ImageUploader setGalleryImage={setGalleryImage} setFeaturedImage={setFeaturedImage} importedData={importedData} />
            <FormField control={form.control} name="video" render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL (Optional)</FormLabel>
                <FormControl><Input type="url" placeholder="https://youtube.com/watch?v=..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          {/* Organization */}
          <div className="space-y-6 bg-white md:p-6 p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">Organization</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField control={form.control} name="brandAndCategories.brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select a brand" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {isBrandsLoading ? (
                        <SelectItem disabled value="loading"><span className="animate-pulse text-gray-400">Loading Brands...</span></SelectItem>
                      ) : (brands ?? []).length > 0 ? (
                        brands?.map((brand: any) => (
                          <SelectItem key={brand._id} value={brand._id}>{brand.name}</SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no-brands">No brands available</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="brandAndCategories.categories" render={({ field }) => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormControl>
                    {isCategoriesLoading ? (
                      <Input className="animate-pulse" placeholder="Loading Categories..." />
                    ) : (
                      <MultipleSelector
                        value={field.value.map((val) => simplifiedCategories.find((opt) => opt.value === val)).filter(Boolean) as Option[]}
                        onChange={(options) => field.onChange(options.map((opt) => opt.value))}
                        defaultOptions={simplifiedCategories}
                        placeholder="Select categories..."
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="brandAndCategories.subCategories" render={({ field }) => (
                <FormItem>
                  <FormLabel>Subcategories</FormLabel>
                  <FormControl>
                    {isCategoriesLoading ? (
                      <Input className="animate-pulse" placeholder="Loading Subcategories..." />
                    ) : (
                      <MultipleSelector
                        value={(field.value ?? []).map((val) => simplifiedSubCategories.find((opt) => opt.value === val)).filter(Boolean) as Option[]}
                        onChange={(options) => field.onChange(options.map((opt) => opt.value))}
                        defaultOptions={simplifiedSubCategories}
                        placeholder="Select subcategories..."
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="brandAndCategories.tags" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    {isTagsLoading ? (
                      <Input className="animate-pulse" placeholder="Loading Tags..." />
                    ) : (
                      <MultipleSelector
                        value={field.value.map((val) => simplifiedTags.find((opt) => opt.value === val)).filter(Boolean) as Option[]}
                        onChange={(options) => field.onChange(options.map((opt) => opt.value))}
                        defaultOptions={simplifiedTags}
                        placeholder="Select tags..."
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
          </div>

          {/* Product Variants */}
          <div className="space-y-4 bg-white md:p-6 p-4 rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold">Product Variants</h2>
            <p className="text-sm text-gray-500">
              Add different variants of your product (e.g., different colors, sizes, etc.)
            </p>

            {variantFields.map((field, index) => (
              <div key={field.id} className="border p-4 rounded-lg space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">Variant {index + 1}</h3>
                  {variantFields.length > 1 && (
                    <Button type="button" variant="destructive" size="sm" onClick={() => removeVariant(index)}>
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name={`variants.${index}.color`} render={({ field }) => (
                    <FormItem><FormLabel>Color</FormLabel><FormControl><Input placeholder="e.g., Red, Blue" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`variants.${index}.size`} render={({ field }) => (
                    <FormItem><FormLabel>Size</FormLabel><FormControl><Input placeholder="e.g., S, M, L, XL" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name={`variants.${index}.price`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price</FormLabel>
                      <FormControl><Input type="number" placeholder="Enter price" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name={`variants.${index}.stock`} render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl><Input type="number" placeholder="Enter stock quantity" {...field} onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={() => appendVariant({ color: "", size: "", price: 0, stock: 0 })} className="w-full">
              + Add Variant
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-6 border-t mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto flex items-center justify-center"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
              onClick={() => {
                form.setValue("description.status", "draft");
                form.setValue("productInfo.status", "draft");
                form.handleSubmit(onSubmit, onErrors)();
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center"
              disabled={!form.formState.isValid || form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <span className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  Publishing...
                </>
              ) : (
                "Publish Product"
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}