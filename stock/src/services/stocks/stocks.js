// For more information about this file see https://dove.feathersjs.com/guides/cli/service.html

import { hooks as schemaHooks } from '@feathersjs/schema'
import {
    stocksDataValidator,
    stocksPatchValidator,
    stocksQueryValidator,
    stocksResolver,
    stocksExternalResolver,
    stocksDataResolver,
    stocksPatchResolver,
    stocksQueryResolver
} from './stocks.schema.js'
import { StocksService, getOptions } from './stocks.class.js'
import { stocksPath, stocksMethods } from './stocks.shared.js'
import { authenticate } from '@feathersjs/authentication'
import { queueChange } from '../../hooks/queue-change.js'

export * from './stocks.class.js'
export * from './stocks.schema.js'

// A configure function that registers the service and its hooks via `app.configure`
export const stocks = (app) => {
    // Register our service on the Feathers application
    app.use(stocksPath, new StocksService(getOptions(app)), {
        // A list of all methods this service exposes externally
        methods: stocksMethods,
        // You can add additional custom events to be sent to clients here
        events: []
    })

    // Initialize hooks
    app.service(stocksPath).hooks({
        around: {
            all: [
                // Default feathers auth
                //     authenticate('jwt'),
                schemaHooks.resolveExternal(stocksExternalResolver),
                schemaHooks.resolveResult(stocksResolver)
            ]
        },
        before: {
            all: [
                schemaHooks.validateQuery(stocksQueryValidator),
                schemaHooks.resolveQuery(stocksQueryResolver)
            ],
            find: [
                async (context) => {
                    const query = context.service.createQuery(context.params)

                    query
                        .select([
                            'stocks.id',
                            'stocks.product_id',
                            'stocks.shop_id',
                            'stocks.shelf_quantity',
                            'stocks.ordered_quantity',
                            'stocks.total_quantity',
                            'stocks.created_at'
                        ])
                        .leftJoin('products as product', 'stocks.product_id', 'product.id')
                        .groupBy('stocks.id')
                    context.params.knex = query
                }
            ],
            get: [],
            create: [
                schemaHooks.validateData(stocksDataValidator),
                schemaHooks.resolveData(stocksDataResolver)
            ],
            patch: [
                schemaHooks.validateData(stocksPatchValidator),
                schemaHooks.resolveData(stocksPatchResolver)
            ],
            remove: []
        },
        after: {
            all: [],
            create: [queueChange],
            patch: [queueChange],
            remove: [queueChange]
        },
        error: {
            all: []
        }
    })
}
