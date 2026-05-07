/* eslint-disable @typescript-eslint/no-explicit-any */
import { IInventoryStats } from '@/components/pages/admin/InventoryManagement'
import { baseApi } from "@/redux/api/baseApi";
import { IProduct } from '@/types/Product';

const productApi = baseApi.injectEndpoints({
  endpoints: builder => ({
    getAllProducts: builder.query<IProduct[], Record<string, any>>({
      query: params => ({
        url: `/product`,
        method: 'GET',
        params,
      }),
      transformResponse: (response: { data: IProduct[] }) => response.data,
    }),

    getSingleProduct: builder.query<IProduct, string>({
      query: id => ({
        url: `/product/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: IProduct }) => response.data,
    }),

    productInventory: builder.query({
      query: () => ({
        url: `/product/inventory/stats`,
        method: 'GET',
      }),
      transformResponse: (response: { data: IInventoryStats }) => response.data,
    }),

    createProduct: builder.mutation<IProduct, FormData>({
      query: formData => ({
        url: '/product/create-product',
        method: 'POST',
        body: formData,
      }),
    }),

    updateProduct: builder.mutation<IProduct, { id: string; formData: any }>({
      query: ({ id, formData }) => ({
        url: `/product/update-product/${id}`,
        method: 'PATCH',
        body: formData,
      }),
    }),
    deleteProduct: builder.mutation<{ message: string }, string>({
      query: id => ({
        url: `/product/delete-product/${id}`,
        method: 'DELETE',
      }),

      transformResponse: (response: { message: string }) => response,
    }),

    getSingleEditProduct: builder.query<IProduct, string>({
      query: id => ({
        url: `/product/edit/${id}`,
        method: 'GET',
      }),
      transformResponse: (response: { data: IProduct }) => response.data,
    }),
    generateAIDescription: builder.mutation<{ data: string }, { title: string }>({
      query: (body) => ({
        url: '/product/generate-ai',
        method: 'POST',
        body ,
      }),
      transformResponse: (response: { data: string }) => response,
    }),
  }),
});

export const {
  useGetAllProductsQuery,
  useGetSingleProductQuery,
  useCreateProductMutation,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useProductInventoryQuery,
  useGetSingleEditProductQuery,
  useGenerateAIDescriptionMutation,
} = productApi;
