import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function createOrder(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { customerId, paymentMethod, saleDate, installmentNumber, firstInstallment,
        initialSaleValue, finalSaleValue, cash, closed, obs, items } = req.body

    if (!customerId || !paymentMethod || !saleDate
        || !installmentNumber || items?.length === 0) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('orders').transacting(trx).insert({
                customer_id: customerId,
                payment_method_id: paymentMethod,
                sale_date: saleDate,
                installment_number: installmentNumber,
                first_installment_date: firstInstallment,
                initial_sale_value: initialSaleValue,
                final_sale_value: finalSaleValue,
                cash,
                closed,
                obs,
                business_id: businessId,
                user_id: userId
            })
                .then(async function (resp) {
                    const orderId = resp[0];
                    let productsQuery = items.map(item => {
                        return {
                            order_id: orderId,
                            product_id: item.productId,
                            sale_value: item.finalValue,
                            initial_sale_value: item.totalSaleValue,
                            discount: item.discount,
                            quantity: item.quantity,
                            discount_type: item.discountType
                        }
                    })
                    const result = await connection('order_items')
                        .transacting(trx)
                        .insert(productsQuery)
                    return { orderId, result, trx };
                })
                .then(async function (resp) {
                    const orderId = resp.orderId;
                    const result = await Promise.all(items.map(item => {
                        if (closed) {
                            return connection('inventory')
                                .transacting(trx)
                                .where('product_id', item.productId)
                                .update({
                                    quantity: connection.raw(`quantity - ${item.quantity}`)
                                })
                        }
                        return;

                    }));
                    return { orderId, result, trx };
                })
                .then(async function (resp) {
                    const orderId = resp.orderId;
                    //console.log(cash);
                    if (cash) {
                        const result = await connection('payments')
                            .transacting(trx)
                            .insert({
                                order_id: orderId,
                                value: cash,
                                payment_date: saleDate,
                                payment_method_id: paymentMethod,
                                cash: true
                            })
                    }

                    return { orderId };
                })
                .then(async function (resp) {
                    //console.log(cash);
                    const orderId = resp.orderId
                    let totalInstallments = finalSaleValue;
                    if (cash) {
                        totalInstallments = totalInstallments - cash
                    }
                    let totalByInstallment = totalInstallments / installmentNumber;

                    let installmentsQuery = [];

                    for (let i = 0; i < Number(installmentNumber); i++) {

                        const installmentDate = new Date(firstInstallment);
                        installmentDate.setMonth(installmentDate.getMonth() + i);

                        installmentsQuery.push({
                            order_id: orderId,
                            amount: totalByInstallment,
                            installment_number: i + 1,
                            installment_date: installmentDate
                        })
                    }

                    const result = await connection('installments')
                        .transacting(trx)
                        .insert(installmentsQuery)

                    return true;
                })
                .then(trx.commit)
                .catch(trx.rollback);
        })
            .then(function (resp) {
                //console.log(resp);
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.ORDER_CREATED,
                })
            })
            .catch(function (err) {
                return res.sendError(Errors.FAILED_SAVE_ORDER + ' ' + err, 500)
            });
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_ORDER + ' ' + e, 500)
    }
}

async function selectOrder(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
        connection('orders')
            .join('customers', 'orders.customer_id', '=', 'customers.id')
            .select({
                value: 'orders.id',
                label: connection.raw("concat(customers.name, ' - ', DATE_FORMAT(orders.sale_date,'%d/%m/%Y'))")
            })
            .where(
                { 'orders.business_id': businessId },
            )
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

async function listOrder(req, res) {
    // const { userId, businessId } = req;
    const { rowsPerPage, page, closedOrders, closedPayments, searchTerm, customer, startSaleDate, endSaleDate } = req.query;

    const userId = 1;
    const businessId = 1;

    try {
        console.log(closedOrders);
        let filtersConditions = [`orders.business_id = ${businessId}`];
        if (!closedOrders || closedOrders === '0') {
            filtersConditions.push(`orders.closed = ${closedOrders}`);
        }
        if (searchTerm && searchTerm.length > 0) {
            filtersConditions.push(`(customers.name LIKE '%${searchTerm}%' OR payment_methods.description LIKE '%${searchTerm}%'
            OR orders.obs LIKE '%${searchTerm}%')`);
        }

        if (customer) {
            filtersConditions.push(`customers.id = ${customer}`);
        }

        if (startSaleDate && startSaleDate !== '') {
            console.log(startSaleDate);
            filtersConditions.push(`orders.sale_date >= '${startSaleDate}'`);
        }

        if (endSaleDate && endSaleDate !== '') {
            console.log(endSaleDate);
            filtersConditions.push(`orders.sale_date <= '${endSaleDate}'`);
        }

        const resultCount = await connection('orders')
            .join('customers', 'orders.customer_id', '=', 'customers.id')
            .join('payment_methods', 'orders.payment_method_id', '=', 'payment_methods.id')
            .join('installments', 'orders.id', '=', 'installments.order_id')
            .select({
                count: connection.raw("COUNT(DISTINCT installments.order_id)"),
                totalAmount: connection.raw("SUM(installments.amount)"),
                totalRemainingAmount: connection.raw("SUM(installments.amount - installments.amount_paid)")
            })
            // .count('*', {as: 'total'})
            // .groupBy("orders.id")
            .modify((queryBuilder) => {
                console.log(queryBuilder);
                console.log(closedPayments);

                if (!closedPayments || closedPayments === '0') {
                    filtersConditions.push(`(SELECT SUM(amount - amount_paid) FROM installments WHERE installments.order_id = orders.id) > 0`);
                }
                const filtersConditionsTemp = filtersConditions.join(" AND ")
                queryBuilder.whereRaw(filtersConditionsTemp)
            })
        console.log('resultCount -> ', resultCount);
        const resultData = await connection('orders')
            .join('customers', 'orders.customer_id', '=', 'customers.id')
            .join('payment_methods', 'orders.payment_method_id', '=', 'payment_methods.id')
            .join('installments', 'orders.id', '=', 'installments.order_id')
            .select({
                id: 'orders.id',
                customerId: 'customers.id',
                customerName: 'customers.name',
                paymentMethod: 'payment_methods.description',
                installmentNumber: 'orders.installment_number',
                firstInstallmentDate: connection.raw("DATE_FORMAT(orders.first_installment_date,'%d/%m/%Y')"),
                finalSaleValue: 'orders.final_sale_value',
                initialSaleValue: 'orders.initial_sale_value',
                cash: 'orders.cash',
                closed: 'orders.closed',
                obs: 'orders.obs',
                createdAt: 'orders.created_at',
                saleData: connection.raw("DATE_FORMAT(orders.sale_date,'%d/%m/%Y')"),
                discount: connection.raw("orders.initial_sale_value - orders.final_sale_value"),
                remainingAmount: connection.raw("SUM(installments.amount - installments.amount_paid)"),
                lastSale: connection.raw("(SELECT DATE_FORMAT(MAX(sale_date),'%d/%m/%Y') FROM orders o WHERE o.customer_id = orders.customer_id)"),
            })
            // .whereRaw(filtersConditions)
            .limit(rowsPerPage).offset(rowsPerPage * page)
            .groupBy("orders.id")
            .orderBy("orders.sale_date", "desc")
            .modify((queryBuilder) => {
                console.log(queryBuilder);
                console.log(closedPayments);

                if (!closedPayments || closedPayments === '0') {
                    filtersConditions.push(`(SELECT SUM(amount - amount_paid) FROM installments WHERE installments.order_id = orders.id) > 0`);
                }
                const filtersConditionsTemp = filtersConditions.join(" AND ")
                queryBuilder.whereRaw(filtersConditionsTemp)
            })
        // .then(function (resp) {
        return res.json({
            status: 200,
            success: true,
            msg: Success.LIST_SUCCESSFULL,
            data: {
                items: resultData,
                total: resultCount[0]?.count,
                totalRemainingAmount: resultCount[0]?.totalRemainingAmount,
                totalAmount: resultCount[0]?.totalAmount
            }
        })
        // })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

async function listOrderItems(req, res) {
    const { orderId } = req.query;
    const userId = 1;
    const businessId = 1;
    // SELECT p.name, o_i.initial_sale_value, o_i.sale_value, o_i.discount, o_i.discount_type, o_i.quantity FROM order_items o_i INNER JOIN products p ON o_i.product_id = p.id
    try {
        connection('order_items')
            .join('products', 'order_items.product_id', '=', 'products.id')
            .select({
                productName: 'products.name',
                initialSaleValue: 'order_items.initial_sale_value',
                saleValue: 'order_items.sale_value',
                discount: 'order_items.discount',
                discountType: 'order_items.discount_type',
                quantity: 'order_items.quantity',
            })
            .where(
                { 'order_items.order_id': orderId },
            )
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

async function findOrder(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { orderId } = req.query;

    if (!orderId) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    // customerId, paymentMethod, saleDate, installmentNumber, firstInstallment,
    //     initialSaleValue, finalSaleValue, cash, closed, obs, items
    try {
        connection('orders')
            .select({
                customerId: 'orders.customer_id',
                paymentMethod: 'orders.payment_method_id',
                saleDate: connection.raw("DATE_FORMAT(orders.sale_date,'%Y-%m-%d')"),
                installmentNumber: 'orders.installment_number',
                firstInstallment: connection.raw("DATE_FORMAT(orders.first_installment_date,'%Y-%m-%d')"),
                initialSaleValue: 'orders.initial_sale_value',
                finalSaleValue: 'orders.final_sale_value',
                cash: 'orders.cash',
                closed: 'orders.closed',
                obs: 'orders.obs'
            })
            .where(
                { 'orders.id': orderId },
            )
            .then(function (resp) {
                //console.log(resp);
                connection('order_items')
                    .select({
                        id: 'id',
                        order_id: 'order_id',
                        productId: 'product_id',
                        finalValue: 'sale_value',
                        totalSaleValue: 'initial_sale_value',
                        discount: 'discount',
                        quantity: 'quantity',
                        discountType: 'discount_type'
                    })
                    .where(
                        { 'order_items.order_id': orderId },
                    )
                    .then(function (orderItems) {
                        // resp.orderItems = orderItems;
                        let result = {};
                        if (resp.length > 0) {
                            result = {
                                ...resp[0]
                            }
                        }
                        result = {
                            ...result,
                            orderItems
                        }
                        return res.json({
                            status: 200,
                            success: true,
                            msg: Success.LIST_SUCCESSFULL,
                            data: result
                        })
                    })
            })
            .catch(function (err) {
                return res.sendError(Errors.FAILED_GET_ORDER + ' ' + err, 500)
            });
    } catch (e) {
        return res.sendError(Errors.FAILED_GET_ORDER + ' ' + e, 500)
    }
}

async function closeOrder(req, res) {
    const userId = 1;
    const businessId = 1;

    const { orderId } = req.body

    if (!orderId) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('order_items')
                .transacting(trx)
                .select({
                    orderId: 'order_items.order_id',
                    productId: 'order_items.product_id',
                    quantity: 'order_items.quantity'
                })
                .where(
                    { 'order_items.order_id': orderId },
                )
                .then(async function (resp) {

                    const result = await Promise.all(resp.map(item => {
                        return connection('inventory')
                            .transacting(trx)
                            .where('product_id', item.productId)
                            .update({
                                quantity: connection.raw(`quantity - ${item.quantity}`)
                            })

                    }));
                    return result;
                })
                .then(async function (resp) {
                    const result = await connection('orders')
                        .transacting(trx)
                        .where('id', orderId)
                        .update({
                            closed: true
                        })
                    return result;
                })
                .then(trx.commit)
                .catch(trx.rollback);
        })
            .then(function (resp) {
                //console.log(resp);
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.ORDER_CLOSED,
                })
            })
            .catch(function (err) {
                return res.sendError(Errors.FAILED_CLOSE_ORDER + ' ' + err, 500)
            });
    } catch (error) {
        return res.sendError(Errors.FAILED_CLOSE_ORDER, 500)
    }

}

async function updateOrder(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { orderId, customerId, paymentMethod, saleDate, installmentNumber, firstInstallment,
        initialSaleValue, finalSaleValue, cash, initialCash, closed, obs, items } = req.body

    if (!orderId || !customerId || !paymentMethod || !saleDate
        || !installmentNumber || items?.length === 0) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('orders').transacting(trx)
                .where({ id: orderId })
                .update({
                    customer_id: customerId,
                    payment_method_id: paymentMethod,
                    sale_date: saleDate,
                    installment_number: installmentNumber,
                    first_installment_date: firstInstallment,
                    initial_sale_value: initialSaleValue,
                    final_sale_value: finalSaleValue,
                    cash,
                    closed,
                    obs
                })
                .then(async function (resp) {
                    await Promise.all(items.map(async item => {
                        const { id, deleted } = item;
                        if (id) {
                            if (deleted) {
                                return connection('order_items')
                                    .transacting(trx)
                                    .where('id', id)
                                    .del()
                            }
                            return connection('order_items')
                                .transacting(trx)
                                .where({ 'id': id })
                                .update({
                                    product_id: item.productId,
                                    sale_value: item.finalValue,
                                    initial_sale_value: item.totalSaleValue,
                                    discount: item.discount,
                                    quantity: item.quantity,
                                    discount_type: item.discountType
                                })
                                .then(function (resp) {
                                    return true;
                                })
                        }
                        return connection('order_items')
                            .transacting(trx)
                            .insert({
                                order_id: orderId,
                                product_id: item.productId,
                                sale_value: item.finalValue,
                                initial_sale_value: item.totalSaleValue,
                                discount: item.discount,
                                quantity: item.quantity,
                                discount_type: item.discountType
                            })
                    }))

                    return { trx };
                })
                .then(async function (resp) {
                    const result = await Promise.all(items.map(item => {
                        //console.log(item);

                        const { id, deleted } = item;
                        //console.log(id);
                        if (id && deleted) {
                            return connection('inventory')
                                .transacting(trx)
                                .where('product_id', item.productId)
                                .update({
                                    quantity: connection.raw(`quantity + ${item.initialQuantity}`)
                                })
                        }
                        if (closed && item.quantity !== item.initialQuantity) {
                            return connection('inventory')
                                .transacting(trx)
                                .where('product_id', item.productId)
                                .update({
                                    quantity: connection.raw(`quantity - (${item.quantity - item.initialQuantity})`)
                                })
                        }
                        return;

                    }));
                    return { result, trx };
                })
                .then(function (resp) {
                    //console.log(cash);
                    if (cash) {
                        if (initialCash) {
                            return connection('payments')
                                .transacting(trx)
                                .where({
                                    'order_id': orderId,
                                    'cash': 1
                                })
                                .update({
                                    value: cash,
                                    payment_date: saleDate,
                                    payment_method_id: paymentMethod,
                                })
                        }
                        return connection('payments')
                            .transacting(trx)
                            .insert({
                                order_id: orderId,
                                value: cash,
                                payment_date: saleDate,
                                payment_method_id: paymentMethod,
                                cash: true
                            })
                    } else if (initialCash) {
                        return connection('payments')
                            .transacting(trx)
                            .where({
                                'order_id': orderId,
                                'cash': 1
                            })
                            .del()
                    }


                    return true;
                })
                .then(async function (resp) {
                    //console.log(cash);

                    return await connection('installments')
                        .select({
                            value: 'amount',
                        })
                        .whereRaw('order_id = ? AND amount_paid > 0', [orderId])
                        .then(async function (resp) {
                            console.log(resp);
                            if (resp.length > 0) {

                                return Promise.reject('amount_paid');
                            }
                            return true;
                        })
                        .catch(error => {
                            console.log('error catch -> ', error);
                            return Promise.reject('amount_paid');
                        })
                })
                .then(function (resp) {
                    return connection('installments')
                        .transacting(trx)
                        .where('order_id', orderId)
                        .del()
                })
                .then(async function (resp) {
                    let totalInstallments = finalSaleValue;
                    if (cash) {
                        totalInstallments = totalInstallments - cash
                    }
                    let totalByInstallment = totalInstallments / installmentNumber;

                    let installmentsQuery = [];

                    for (let i = 0; i < Number(installmentNumber); i++) {

                        const installmentDate = new Date(firstInstallment);
                        installmentDate.setMonth(installmentDate.getMonth() + i);

                        installmentsQuery.push({
                            order_id: orderId,
                            amount: totalByInstallment,
                            installment_number: i + 1,
                            installment_date: installmentDate
                        })
                    }
                    //console.log('theeeeeeeere');
                    //console.log(installmentsQuery);
                    const result = await connection('installments')
                        .transacting(trx)
                        .insert(installmentsQuery)

                    return true;
                })
                .then((res) => {
                    console.log('res -> ', res);
                    return trx.commit
                })
                .catch((error) => {
                    console.log('error -> ', error);
                    trx.rollback
                    return res.sendError(Errors.FAILED_UPDATE_ORDER, 400)
                })
        })
            .then(function (resp) {
                console.log(resp);
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.ORDER_UPDATED,
                })
            })
            .catch(function (err) {
                console.log('err -> ', err);
                return res.sendError(Errors.FAILED_UPDATE_ORDER + ' ' + err, 400)
            });
    } catch (e) {
        console.log('errasdfsd -> ', e);
        return res.sendError(Errors.FAILED_UPDATE_ORDER + ' ' + e, 500)
    }
}

async function listOrderItemsLocal(orderId) {
    try {
        const resp = await connection('order_items')
            .join('orders', 'orders.id', '=', 'order_items.order_id')
            .join('products', 'order_items.product_id', '=', 'products.id')
            .select({
                productName: 'products.name',
                initialSaleValue: 'order_items.initial_sale_value',
                saleValue: 'order_items.sale_value',
                discount: 'order_items.discount',
                discountType: 'order_items.discount_type',
                quantity: 'order_items.quantity',
                saleDateValue: 'orders.sale_date',
                saleDate: connection.raw("DATE_FORMAT(orders.sale_date,'%d/%m/%Y')"),
            })
            .where(
                { 'order_items.order_id': orderId },
            )
        return resp;

    } catch (e) {
        return [];
    }
}

async function listCustomerOrdersOpen(req, res) {
    const { customerId } = req.query;
    const userId = 1;
    const businessId = 1;

    try {
        const resultInstallments = await connection('installments')
            .join("orders", "orders.id", "=", "installments.order_id")
            .select({
                number: 'installments.installment_number',
                amount: 'installments.amount',
                amountPaid: 'installments.amount_paid',
                dateValue: 'installments.installment_date',
                orderId: 'installments.order_id',
                remainingAmount: connection.raw("installments.amount - installments.amount_paid"),
                date: connection.raw("DATE_FORMAT(installments.installment_date,'%d/%m/%Y')"),
            })
            .whereRaw("orders.customer_id = ? AND installments.amount_paid < installments.amount", [customerId])
            .orderBy('installments.installment_date');
        console.log('resultInstallments -> ', resultInstallments);
        let openOrders = [];
        resultInstallments?.map(item => {
            if (openOrders?.indexOf(item?.orderId) < 0) {
                openOrders.push(item?.orderId);
            }
        })

        let itemsOpenOrders = [];
        await Promise.all(
            openOrders.map(async orderId => {
                const items = await listOrderItemsLocal(orderId);
                return itemsOpenOrders.push(items);
            })
        )

        return res.json({
            status: 200,
            success: true,
            msg: Success.LIST_SUCCESSFULL,
            data: {
                installments: resultInstallments,
                itemsOpenOrders
            }
        })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

async function findCustomerRemainingAmount(req, res) {
    const { customerId } = req.query;
    const userId = 1;
    const businessId = 1;

    try {
        const resultTotalRemainingAmount = await connection('installments')
            .join("orders", "orders.id", "=", "installments.order_id")
            .select({
                remainingAmount: connection.raw("SUM(installments.amount - installments.amount_paid)"),
            })
            .whereRaw("orders.customer_id = ? AND installments.amount_paid < installments.amount", [customerId])
            .orderBy('installments.installment_date');

        return res.json({
            status: 200,
            success: true,
            msg: Success.LIST_SUCCESSFULL,
            data: {
                totalRemainingAmount: resultTotalRemainingAmount[0]?.remainingAmount
            }
        })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

export {
    createOrder,
    selectOrder,
    listOrder,
    listOrderItems,
    closeOrder,
    findOrder,
    updateOrder,
    listCustomerOrdersOpen,
    findCustomerRemainingAmount
}