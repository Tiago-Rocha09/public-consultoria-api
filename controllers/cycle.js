import { Errors } from '../util/error.js';
import { connection } from '../db/index.js';
import { Success } from '../util/success.js';

async function selectCycle(req, res) {
    // const { userId, businessId } = req;
    const userId = 1;
    const businessId = 1;

    try {
            connection('cycles')
            .select({
                value: 'id',
                label: "name"
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
    selectCycle
}