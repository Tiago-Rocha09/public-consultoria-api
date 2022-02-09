import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function createCustomer(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { name, phone, obs } = req.body

    if (!name) {
        return res.sendError(Errors.MISSING_FIELD, 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('customers').transacting(trx).insert({
                name,
                phone,
                obs,
                user_id: userId,
                business_id: businessId
            })
            .then(function (resp) {
                const id = resp[0];
                return {id, trx};
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(resp) {
            console.log(resp);
            return res.json({
                status: 200,
                success: true,
                msg: Success.CUSTOMER_CREATED,
                customerId: resp.id,
            })
          })
          .catch(function(err) {
            return res.sendError(Errors.FAILED_SAVE_CUSTOMER, 500)
          });
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_CUSTOMER + ' ' + e, 500)
    }
}

async function selectCustomer(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
            connection('customers')
            .select({
                value: 'id',
                label: 'name'
            })
            .where(
                    {'business_id': businessId},
                    {'active': 1}
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

async function listCustomer(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
            connection('customers')
            .select({
                id: 'id', 
                name: 'name', 
                phone: 'phone', 
                obs: 'obs', 
                createdAt: connection.raw("DATE_FORMAT(created_at,'%d/%m/%Y %H:%i')")
            })
            .where(
                    {'business_id': businessId},
                    {'active': 1}
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

export {
    createCustomer,
    selectCustomer,
    listCustomer
}