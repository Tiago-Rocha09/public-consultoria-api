import request from 'request';

class PaymentController {
  async store(req, res) {

    var body = req.body;
    var options = {
      method: 'POST',
      uri: 'https://api.pagar.me/core/v5/orders',
      headers: {
        'Authorization': 'Basic ' + new Buffer("sk_BXj0xY8hAFaq5mzg:").toString('base64'),
        'Content-Type': 'application/json'
      },
      json: body
    };

    var dados = request(options, function (error, response, body) {
      return res.status(200).json({ message: 'transaction successful', data: response });
    });

  }
}

export default new PaymentController();

