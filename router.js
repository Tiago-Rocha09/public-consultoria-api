import express from 'express';
import { createCustomer, listCustomer, selectCustomer } from './controllers/customer.js';
import { selectCycle } from './controllers/cycle.js';
import { createEntrie, findEntrie, listEntrie, selectEntrie, updateEntrie } from './controllers/inventory.js';
import { closeOrder, createOrder, findOrder, listCustomerOrdersOpen, findCustomerRemainingAmount, listOrder, listOrderItems, selectOrder, updateOrder } from './controllers/order.js';
import { selectOrigin } from './controllers/origin.js';
import { selectPaymentMethod } from './controllers/paymentMethod.js';
import { createOrderPayment, findCustomerCreditDebit, listOrderInstallments, listOrderPayments } from './controllers/payments.js';
import { createProduct, listProduct, selectProduct } from './controllers/product.js';
import { checkAuth } from './midlewares/auth.js';

const router = express.Router();

router.get('/', (req, res) => res.send('Eventozz API'));

router.post('/customer/create', createCustomer);
router.post('/product/create', createProduct);
router.post('/entrie/create', createEntrie);
router.post('/order/create', createOrder);
router.post('/payment/create', createOrderPayment);

router.get('/customer/list', listCustomer);
router.get('/product/list', listProduct);
router.get('/entrie/list', listEntrie);
router.get('/order/list', listOrder);
router.get('/order/list-items', listOrderItems);
router.get('/payment/list-order-payments', listOrderPayments);
router.get('/payment/list-order-installments', listOrderInstallments);
router.get('/order/list-open-customer-orders', listCustomerOrdersOpen);

router.get('/order/select', selectOrder);
router.get('/cycle/select', selectCycle);
router.get('/entrie/select', selectEntrie);
router.get('/origin/select', selectOrigin);
router.get('/customer/select', selectCustomer);
router.get('/product/select', selectProduct);
router.get('/payment-method/select', selectPaymentMethod);

router.get('/order/find', findOrder);
router.get('/entrie/find', findEntrie);
router.get('/payment/find-customer-credit-debit', findCustomerCreditDebit);
router.get('/payment/find-total-customer-remaining-amount', findCustomerRemainingAmount);

router.put('/order/close', closeOrder);
router.put('/order/update', updateOrder);
router.put('/entrie/update', updateEntrie);

export default router;