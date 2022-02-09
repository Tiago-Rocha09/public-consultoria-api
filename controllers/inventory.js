import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function createEntrie(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { description, cycleId, originId, products } = req.body

    if (!cycleId || !originId || !products || products?.length === 0) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('entries').transacting(trx).insert({
                description,
                cycle_id: cycleId,
                origin_id: originId,
                business_id: businessId,
                user_id: userId
            })
                .then(async function (resp) {
                    const id = resp[0];
                    let productsQuery = products.map(product => {
                        return {
                            entrie_id: id,
                            product_id: product.productId,
                            quantity: product.quantity,
                            cost_value: product.costValue,
                            magazine_value: product.magazineValue,
                            sale_value: product.saleValue,
                            business_id: businessId,
                            user_id: userId,
                        }
                    })
                    const result = await connection('entrie_products')
                        .transacting(trx)
                        .insert(productsQuery)
                    return { id, result, trx };
                })
                .then(async function (resp) {
                    const id = resp[0];
                    await Promise.all(products.map(product => {
                        return connection('inventory')
                            .transacting(trx)
                            .where('product_id', product.productId)
                            .update({
                                cost_value: connection.raw(`((cost_value*quantity)+(${product.costValue * product.quantity}))/(quantity+${product.quantity})`),
                                quantity: connection.raw(`quantity + ${product.quantity}`),
                                sale_value: product.saleValue
                            })
                    }));
                    return true;
                })
                .then(trx.commit)
                .catch(trx.rollback);
        })
            .then(function (resp) {
                console.log(resp);
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.ENTRIE_CREATED,
                })
            })
            .catch(function (err) {
                return res.sendError(Errors.FAILED_SAVE_ENTRIE + ' ' + err, 500)
            });
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_ENTRIE + ' ' + e, 500)
    }
}

async function selectEntrie(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
        connection('entries')
            .select({
                value: 'id',
                label: "description"
            })
            .then(function (resp) {
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.LIST_SUCCESSFULL,
                    data: resp
                })
            })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

async function listEntrie(req, res) {
    // const { userId, businessId } = req;
    const { rowsPerPage, page, searchTerm } = req.query;
    const userId = 1;
    const businessId = 1;

    let filtersConditions = [`entries.business_id = ${businessId}`];


    if (searchTerm && searchTerm.length > 0) {
        filtersConditions.push(`(cycles.name LIKE '%${searchTerm}%' OR origins.name LIKE '%${searchTerm}%'
        OR entries.description LIKE '%${searchTerm}%')`);
    }
    filtersConditions = filtersConditions.join(" AND ")

    try {
        const resultCount = await connection('entries')
            .join('cycles', 'entries.cycle_id', '=', 'cycles.id')
            .join('origins', 'entries.origin_id', '=', 'origins.id')
            .count('entries.id', {as: 'count'})
            .whereRaw(filtersConditions)

        const resultData = await connection('entries')
            .join('cycles', 'entries.cycle_id', '=', 'cycles.id')
            .join('origins', 'entries.origin_id', '=', 'origins.id')
            .select({
                id: 'entries.id',
                description: 'entries.description',
                cycle: 'cycles.name',
                origin: 'origins.name',
                createdAt: connection.raw("DATE_FORMAT(entries.created_at,'%d/%m/%Y %H:%i')")
            })
            .whereRaw(filtersConditions)
            .limit(rowsPerPage).offset(rowsPerPage * page)
            .orderBy("entries.created_at", "desc")
            // .then(function (resp) {
            return res.json({
                status: 200,
                success: true,
                msg: Success.LIST_SUCCESSFULL,
                data: {
                    items: resultData,
                    total: resultCount[0]?.count,
                }
            })
            // })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

async function findEntrie(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { entrieId } = req.query;

    if (!entrieId) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    // customerId, paymentMethod, saleDate, installmentNumber, firstInstallment,
    //     initialSaleValue, finalSaleValue, cash, closed, obs, items
    try {
        const entriesResult = await connection('entries')
            .select({
                id: 'id',
                description: 'description',
                cycle: 'cycle_id',
                origin: 'origin_id',
                createdAt: connection.raw("DATE_FORMAT(created_at,'%d/%m/%Y %H:%i')")
            })
            .where(
                { 'entries.id': entrieId },
            )
        if (entriesResult?.length > 0) {
            let entrie = entriesResult[0];

            const entrieProductsResult = await connection('entrie_products')
                .select({
                    id: 'id',
                    productId: 'product_id',
                    initialQuantity: 'quantity',
                    costValue: 'cost_value',
                    magazineValue: 'magazine_value',
                    saleValue: 'sale_value',
                })
                .where(
                    { 'entrie_id': entrie.id },
                )

            entrie.items = entrieProductsResult?.length > 0 ? entrieProductsResult : []

            return res.json({
                status: 200,
                success: true,
                msg: Success.LIST_SUCCESSFULL,
                data: entrie
            })

        } else {
            return res.sendError(Errors.FAILED_GET_ENTRIE, 500)
        }
    } catch (e) {
        return res.sendError(Errors.FAILED_GET_ENTRIE, 500)
    }
}

async function updateEntrie(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { entrieId, description, cycleId, originId, products } = req.body

    if (!entrieId || !cycleId || !originId || !products || products?.length === 0) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('entries').transacting(trx)
                .where({ id: entrieId })
                .update({
                    description,
                    cycle_id: cycleId,
                    origin_id: originId,
                })
                .then(async function (resp) {
                    // const id = resp[0];
                    await Promise.all(products.map(async product => {
                        const { id, deleted } = product;
                        if (id || deleted) {
                            if (deleted) {
                                return connection('entrie_products')
                                    .transacting(trx)
                                    .where('id', id)
                                    .del()
                            }
                            return connection('entrie_products')
                                .transacting(trx)
                                .where({ 'id': id })
                                .update({
                                    product_id: product.productId,
                                    quantity: product.quantity,
                                    cost_value: product.costValue,
                                    magazine_value: product.magazineValue,
                                    sale_value: product.saleValue,
                                })
                                .then(function (resp) {
                                    return true;
                                })
                        }
                        return connection('entrie_products')
                            .transacting(trx)
                            .insert({
                                
                                entrie_id: entrieId,
                                product_id: product.productId,
                                quantity: product.quantity,
                                cost_value: product.costValue,
                                magazine_value: product.magazineValue,
                                sale_value: product.saleValue,
                                business_id: businessId,
                                user_id: userId,
                            })
                    }))
                        .then(async function (resp) {
                            const id = resp[0];
                            await Promise.all(products.map(product => {
                                const { id, deleted } = product;
                                if (id || deleted) {
                                    if (deleted) {
                                        return connection('inventory')
                                            .transacting(trx)
                                            .where('product_id', product.productId)
                                            .update({
                                                quantity: connection.raw(`quantity - ${product.initialQuantity}`),
                                            })
                                    }
                                    return connection('inventory')
                                        .transacting(trx)
                                        .where('product_id', product.productId)
                                        .update({
                                            quantity: connection.raw(`quantity + (${product.quantity - product.initialQuantity})`),
                                            sale_value: product.saleValue
                                        })
                                }
                                return connection('inventory')
                                    .transacting(trx)
                                    .where('product_id', product.productId)
                                    .update({
                                        cost_value: connection.raw(`((cost_value*quantity)+(${product.costValue * product.quantity}))/(quantity+${product.quantity})`),
                                        quantity: connection.raw(`quantity + ${product.quantity}`),
                                        sale_value: product.saleValue
                                    })
                            }));
                            return true;
                        })
                        .then(trx.commit)
                        .catch(trx.rollback);
                })
                .then(function (resp) {
                    console.log(resp);
                    return res.json({
                        status: 200,
                        success: true,
                        msg: Success.ENTRIE_UPDATED,
                    })
                })
                .catch(function (err) {
                    return res.sendError(Errors.FAILED_SAVE_ENTRIE + ' ' + err, 500)
                });
        })
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_ENTRIE + ' ' + e, 500)
    }
}

export {
    createEntrie,
    selectEntrie,
    listEntrie,
    findEntrie,
    updateEntrie
}