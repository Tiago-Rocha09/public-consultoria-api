import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function createProduct(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    const { name, description } = req.body

    if (!name ) {
        return res.sendError(JSON.stringify(req.body), 400)
    }

    try {
        connection.transaction(function (trx) {
            connection('products').transacting(trx).insert({
                name,
                description,
                user_id: userId,
                business_id: businessId
            })
            .then( async function (resp) {
                const id = resp[0];
                const result = await connection('inventory')
                .transacting(trx)
                .insert({product_id: id, business_id: businessId, user_id: userId})
                return {id, result, trx};
            })
            .then(trx.commit)
            .catch(trx.rollback);
        })
        .then(function(resp) {
            console.log(resp);
            return res.json({
                status: 200,
                success: true,
                msg: Success.PRODUCT_CREATED,
                productId: resp.id,
            })
          })
          .catch(function(err) {
            return res.sendError(Errors.FAILED_SAVE_CUSTOMER, 500)
          });
    } catch (e) {
        return res.sendError(Errors.FAILED_SAVE_CUSTOMER + ' ' + e, 500)
    }
}

async function selectProduct(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
            connection('products')
            .join("inventory", "products.id", "=", "inventory.product_id")
            .select({
                value: 'products.id',
                label: connection.raw("CONCAT(products.name, '   (', inventory.quantity, ' disponivel)')"),
                saleValue: "inventory.sale_value",
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

async function listProduct(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
            connection('inventory')
            .join('products', 'inventory.product_id', '=', 'products.id')
            .select({
                id: 'inventory.id', 
                name: 'products.name', 
                quantity: 'inventory.quantity', 
                saleValue: 'inventory.sale_value', 
                costValue: 'inventory.cost_value', 
                magazinePrice: connection.raw("(SELECT magazine_value FROM entrie_products WHERE id = (SELECT MAX(id) FROM entrie_products WHERE product_id = products.id))"), 
                updatedAt: connection.raw("DATE_FORMAT(inventory.updated_at,'%d/%m/%Y %H:%i')"),
                createdAt: connection.raw("DATE_FORMAT(inventory.created_at,'%d/%m/%Y %H:%i')")
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

export {
    createProduct,
    selectProduct,
    listProduct
}