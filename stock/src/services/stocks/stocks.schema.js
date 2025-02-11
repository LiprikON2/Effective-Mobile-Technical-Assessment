// // For more information about this file see https://dove.feathersjs.com/guides/cli/service.schemas.html
import { queryProperty, resolve, virtual } from '@feathersjs/schema'
import { Type, getValidator, querySyntax } from '@feathersjs/typebox'
import { dataValidator, queryValidator } from '../../validators.js'
import { shopsSchema } from '../shops/shops.schema.js'
import { productsSchema } from '../products/products.schema.js'

// Main data model schema
export const stocksSchema = Type.Object(
    {
        id: Type.Number(),
        shelf_quantity: Type.Optional(Type.Number()),
        ordered_quantity: Type.Optional(Type.Number()),
        total_quantity: Type.Optional(Type.Number()),
        created_at: Type.Number(),

        product_id: Type.Number(),
        product: Type.Ref(productsSchema),

        shop_id: Type.Number(),
        shop: Type.Ref(shopsSchema)
    },
    { $id: 'Stocks', additionalProperties: false }
)
export const stocksValidator = getValidator(stocksSchema, dataValidator)
export const stocksResolver = resolve({
    shop: virtual(async (stock, context) => {
        // Associate the shop with the stock
        return context.app.service('shops').get(stock.shop_id)
    }),
    product: virtual(async (stock, context) => {
        // Associate the product with the stock
        return context.app.service('products').get(stock.product_id)
    })
})

export const stocksExternalResolver = resolve({})

// Schema for creating new entries
export const stocksDataSchema = Type.Pick(
    stocksSchema,
    ['product_id', 'shop_id', 'shelf_quantity', 'ordered_quantity'],
    {
        $id: 'StocksData'
    }
)
export const stocksDataValidator = getValidator(stocksDataSchema, dataValidator)
// @ts-ignore
export const stocksDataResolver = resolve({
    created_at: async () => {
        return Date.now()
    },
    ordered_quantity: async (value) => {
        return value ?? 0
    },
    shelf_quantity: async (value) => {
        return value ?? 0
    },
    total_quantity: async (value, /** @type stocksSchema */ stock, context) => {
        const ordered_quantity = stock.ordered_quantity ?? 0
        const shelf_quantity = stock.shelf_quantity ?? 0
        return ordered_quantity + shelf_quantity
    }
})

// Schema for updating existing entries
export const stocksPatchSchema = Type.Partial(stocksSchema, {
    $id: 'StocksPatch'
})
export const stocksPatchValidator = getValidator(stocksPatchSchema, dataValidator)
export const stocksPatchResolver = resolve({})

// Schema for allowed query properties
export const stocksQueryProperties = Type.Pick(stocksSchema, [
    'id',
    'created_at',
    'product_id',
    'shop_id',
    'shelf_quantity',
    'ordered_quantity',
    'total_quantity'
])

const productQueryProperties = Type.Pick(productsSchema, ['plu'])

export const stocksQuerySchema = Type.Intersect(
    [
        querySyntax(stocksQueryProperties),
        // Add additional query properties here
        Type.Object(
            {
                'product.plu': Type.Optional(productQueryProperties.properties.plu)
            },
            { additionalProperties: false }
        )
    ],
    { additionalProperties: false }
)

export const stocksQueryValidator = getValidator(stocksQuerySchema, queryValidator)
export const stocksQueryResolver = resolve({
    'product.plu': async (value, query, context) => {
        if (value !== undefined) {
            console.log('value', value)
            // Finds the product(s) with matching PLU
            const products = await context.app.service('products').find({
                query: { plu: value }
            })
            console.log('products', products.length, products)

            // Gets the product IDs
            const productIds = products.data.map((product) => product.id)

            console.log('productIds', productIds.length, productIds)
            // Adds product_id to the query
            query.product_id = { $in: productIds }

            // Removes the product.plu from the query as it's been processed
            delete query['product.plu']
        }

        return value
    }
})
