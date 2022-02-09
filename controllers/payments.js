import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function createOrderPayment(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { orderId, value, paymentDate, paymentMethod, customerId } = req.body

    if (!orderId || !value || !paymentDate || !paymentMethod) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('payments').transacting(trx).insert({
                order_id: orderId,
                value,
                payment_date: paymentDate,
                payment_method_id: paymentMethod
            })
                .then(function (resp) {
                    const paymentId = resp[0];
                    connection('installments')
                        .select({
                            id: 'installments.id',
                            amount: 'installments.amount',
                            amountPaid: 'installments.amount_paid'
                        })
                        .whereRaw('installments.order_id = ? AND installments.amount > installments.amount_paid', [orderId])
                        .orderBy('installments.installment_date')
                        .then(async function (respInstallments) {
                            //console.log('respInstallments -> ', respInstallments);
                            let paidInstallments = [];
                            let totalPaid = 0;
                            respInstallments.map(a => {
                                const { id, amount, amountPaid } = a;
                                let amountPaidInThisInstallment = amount - amountPaid;
                                console.log('id -> ',id);
                                console.log('amount -> ', amount);
                                console.log('amountPaid -> ', amountPaid);
                                console.log('value -> ', value);
                                console.log('amountPaidInThisInstallment -> ', amountPaidInThisInstallment);
                                console.log('totalPaid -> ', totalPaid);
                                console.log('totalPaidSum -> ', totalPaid + amountPaidInThisInstallment);

                                if ((totalPaid + amountPaidInThisInstallment) <= value) {
                                    totalPaid += amountPaidInThisInstallment;
                                    paidInstallments.push({
                                        id,
                                        amount: +((amountPaidInThisInstallment + amountPaid).toFixed(2))
                                    })
                                } else if ((value - totalPaid) > 0) {
                                    amountPaidInThisInstallment = value - totalPaid;
                                    totalPaid += amountPaidInThisInstallment;
                                    paidInstallments.push({
                                        id,
                                        amount: +((amountPaidInThisInstallment + amountPaid).toFixed(2))
                                    })
                                }
                            });

                            console.log('paidInstallments -> ', paidInstallments);
                            await connection.transaction(tran => {
                                const promises = paidInstallments.map(a => {
                                    //console.log('a -> ', a);
                                    return connection('installments')
                                        .where({ 'id': a.id })
                                        .update({
                                            amount_paid: a.amount,
                                            payment_id: paymentId
                                        })
                                        .transacting(tran);
                                })

                                Promise.all(promises) // Once every query is written
                                    .then(tran.commit) // We try to execute all of them
                                    .catch(tran.rollback);
                            })
                            if (value > totalPaid) {
                                //console.log('totalPaid -> ', totalPaid);
                                connection('installments')
                                    .join('orders', "orders.id", "=", "installments.order_id")
                                    .select({
                                        id: 'installments.id',
                                        amount: 'installments.amount',
                                        amountPaid: 'installments.amount_paid'
                                    })
                                    .whereRaw('installments.order_id <> ? AND orders.customer_id = ? AND installments.amount > installments.amount_paid', [orderId, customerId])
                                    .orderBy('installments.installment_date')

                                    .then(async function (respInstallmentsFromOtherSales) {
                                        //console.log(respInstallmentsFromOtherSales);
                                        if (respInstallmentsFromOtherSales.length > 0) {

                                            const paidInstallments = [];
                                            respInstallmentsFromOtherSales.map(a => {
                                                const { id, amount, amountPaid } = a;
                                                let amountPaidInThisInstallment = amount - amountPaid;

                                                if ((totalPaid + amountPaidInThisInstallment) <= value) {
                                                    console.log('here 1');
                                                    totalPaid += amountPaidInThisInstallment;
                                                    paidInstallments.push({
                                                        id,
                                                        amount: +((amountPaidInThisInstallment + amountPaid).toFixed(2))
                                                    })
                                                } else if ((value - totalPaid) > 0) {
                                                    //console.log('here 2');
                                                    //console.log('value -> ', value);
                                                    //console.log('totalPaid here -> ', totalPaid);
                                                    amountPaidInThisInstallment = value - totalPaid;
                                                    totalPaid += amountPaidInThisInstallment;
                                                    paidInstallments.push({
                                                        id,
                                                        amount: +((amountPaidInThisInstallment + amountPaid).toFixed(2))
                                                    })
                                                }
                                            });
                                            //console.log(paidInstallments);
                                            await connection.transaction(tran => {
                                                const promises = paidInstallments.map(a => {
                                                    console.log('aa -> ', a);
                                                    return connection('installments')
                                                        .where({ 'id': a.id })
                                                        .update({
                                                            amount_paid: a.amount,
                                                            payment_id: paymentId
                                                        })
                                                        .transacting(tran);
                                                })

                                                Promise.all(promises) // Once every query is written
                                                    .then(tran.commit) // We try to execute all of them
                                                    .catch(tran.rollback);
                                            })

                                            if (value > totalPaid) {
                                                //console.log('theeeeeere');
                                                //console.log(value);
                                                //console.log(totalPaid);
                                                await connection.transaction(tran => {
                                                    connection('customer_credit')
                                                        .select({
                                                            id: 'id',
                                                            amount: 'amount',
                                                        })
                                                        .where('customer_id', customerId)
                                                        .then(async result => {
                                                            console.log('result there -> ', result);
                                                            if (result?.length > 0) {
                                                                const customerCredit = result[0];
                                                                const newCustomerCredit = customerCredit?.amount + (value - totalPaid);
                                                                const creditId = customerCredit.id;
                                                                connection('customer_credit')
                                                                    .transacting(tran)
                                                                    .where({ 'id': creditId })
                                                                    .update({
                                                                        amount: +((newCustomerCredit).toFixed(2))
                                                                    })
                                                                    .then(tran.commit) // We try to execute all of them
                                                                    .catch(tran.rollback);
                                                            } else {
                                                                connection('customer_credit').transacting(tran).insert({
                                                                    customer_id: customerId,
                                                                    amount: +((value - totalPaid).toFixed(2)),
                                                                    payment_id: paymentId
                                                                })
                                                                    .then(tran.commit) // We try to execute all of them
                                                                    .catch(tran.rollback);
                                                            }
                                                        })
                                                })
                                            }
                                        } else {
                                            //console.log('heeeeeere');
                                            await connection.transaction(tran => {
                                                connection('customer_credit')
                                                    .select({
                                                        id: 'id',
                                                        amount: 'amount',
                                                    })
                                                    .where('customer_id', customerId)
                                                    .then(async result => {
                                                        //console.log('result there -> ', result);
                                                        if (result?.length > 0) {
                                                            const customerCredit = result[0];
                                                            const newCustomerCredit = customerCredit?.amount + (value - totalPaid);
                                                            const creditId = customerCredit.id;
                                                            connection('customer_credit')
                                                                .transacting(tran)
                                                                .where({ 'id': creditId })
                                                                .update({
                                                                    amount: +((newCustomerCredit).toFixed(2))
                                                                })
                                                                .then(tran.commit) // We try to execute all of them
                                                                .catch(tran.rollback);
                                                        } else {
                                                          //  console.log('eslse');
                                                          //  console.log(value - totalPaid);
                                                            connection('customer_credit').transacting(tran).insert({
                                                                customer_id: customerId,
                                                                amount: +(((value - totalPaid)).toFixed(2)),
                                                                payment_id: paymentId
                                                            })
                                                                .then(tran.commit) // We try to execute all of them
                                                                .catch(tran.rollback);
                                                        }
                                                    })

                                            })

                                        }


                                    })

                            }
                            // return true;
                        })
                    return { trx };
                })
                .then(trx.commit)
                .catch(trx.rollback);
        })
            .then(function (resp) {
               // console.log(resp);
                return res.json({
                    status: 200,
                    success: true,
                    msg: Success.PAYMENT_CREATED,
                })
            })
            .catch(function (err) {
                return res.sendError(Errors.FAILED_SAVE_PAYMENT, 500)
            });
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_PAYMENT + ' ' + e, 500)
    }
}

async function listOrderPayments(req, res) {
    const { orderId } = req.query;
    const userId = 1;
    const businessId = 1;
    // SELECT p.name, o_i.initial_sale_value, o_i.sale_value, o_i.discount, o_i.discount_type, o_i.quantity FROM order_items o_i INNER JOIN products p ON o_i.product_id = p.id
    //    id	order_id	value	payment_date	updated_at	create_at

    try {
        connection('payments')
            .join('payment_methods', 'payments.payment_method_id', '=', 'payment_methods.id')
            .select({
                id: 'payments.id',
                order_id: 'payments.order_id',
                value: 'payments.value',
                paymentMethod: 'payment_methods.description',
                paymentDate: connection.raw("DATE_FORMAT(payments.payment_date,'%d/%m/%Y')"),
            })
            .whereRaw("payments.order_id = ? AND payments.value > 0", [orderId])
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

async function listOrderInstallments(req, res) {
    const { orderId } = req.query;
    const userId = 1;
    const businessId = 1;
    // SELECT p.name, o_i.initial_sale_value, o_i.sale_value, o_i.discount, o_i.discount_type, o_i.quantity FROM order_items o_i INNER JOIN products p ON o_i.product_id = p.id
    //    id	order_id	value	payment_date	updated_at	create_at

    try {
        const resultInstallments = await connection('installments')
            .select({
                number: 'installments.installment_number',
                amount: 'installments.amount',
                amountPaid: 'installments.amount_paid',
                dateValue: 'installments.installment_date',
                remainingAmount: connection.raw("installments.amount - installments.amount_paid"),
                date: connection.raw("DATE_FORMAT(installments.installment_date,'%d/%m/%Y')"),
            })
            .whereRaw("installments.order_id = ? AND installments.amount_paid < installments.amount", [orderId] )
           // console.log('resultInstallments -> ',resultInstallments);
        const resultPayedAmount = await connection('installments')
            .join("orders", "orders.id", "=", "installments.order_id")
            .join("payments", "payments.id", "=", "installments.payment_id")
            .select({
                amount: 'installments.amount',
                amountPaid: 'installments.amount_paid',
                number: 'installments.installment_number',
                dateValue: 'installments.installment_date',
                remainingAmount: connection.raw("installments.amount - installments.amount_paid"),
                //date: connection.raw("DATE_FORMAT(installments.installment_date,'%d/%m/%Y')"),
                paymentData: connection.raw("DATE_FORMAT(payments.payment_date,'%d/%m/%Y')"),
                totalAmountPaid: connection.raw("sum(installments.amount_paid)")
            })
            .where(
                { 
                    'installments.order_id': orderId,
                }
            )
            .groupByRaw("orders.customer_id, installments.payment_id")
            //console.log('resultPayedAmount -> ',resultPayedAmount);

    const result = resultPayedAmount.concat(resultInstallments);
    // .then(function (resp) {
    return res.json({
        status: 200,
        success: true,
        msg: Success.LIST_SUCCESSFULL,
        data: result
    })
    // })

} catch (e) {
    return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
}
}

async function findCustomerCreditDebit(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { customerId, orderId } = req.query;

    if (!customerId) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    // customerId, paymentMethod, saleDate, installmentNumber, firstInstallment,
    //     initialSaleValue, finalSaleValue, cash, closed, obs, items
    try {
        const credit = await connection('customer_credit')
            .select('amount')
            .where(
                { 'customer_id': customerId },
            )

        //console.log(resp);
        const debit = await connection('installments')
            .join('orders', 'orders.id', '=', 'installments.order_id')
            .select({
                amount: connection.raw("SUM(installments.amount - installments.amount_paid)"),
            })
            .whereRaw("installments.amount_paid < installments.amount AND orders.customer_id = ? AND orders.id <> ?", [customerId, orderId])

        return res.json({
            status: 200,
            success: true,
            data: {
                credit: credit[0],
                debit: debit[0]
            },
            msg: Success.LIST_SUCCESSFULL,
        })

    } catch (e) {
        return res.sendError(Errors.FAILED_LIST + ' ' + e, 500)
    }
}

export {
    createOrderPayment,
    listOrderPayments,
    listOrderInstallments,
    findCustomerCreditDebit
}