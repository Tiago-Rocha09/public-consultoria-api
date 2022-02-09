import nodemailer from "nodemailer";

import { AwesomeQR } from "awesome-qr";
import fs from "fs";
import { CONFIG_CONTATO_EVENTOS } from "../util/emailConfiguration.js";
import { avisoPedidoRecebido, emailQrCode, statusCanceled, statusClosed, statusPaid, statusPaymentFailed, emailHTML } from "./emailsBody.js";
import { getTicketsFromPurchaseId } from "../controllers/purchase.js";
import { response } from "express";
import { create } from "domain";

async function enviarQRCode({ id_ingresso, email }) {

  try {

    // const { email, id_ingresso } = req.body;

    const buffer = await new AwesomeQR({
      text: `${id_ingresso}`,
      size: 500,
    }).draw();

    fs.writeFileSync("qrcode.png", buffer);

    const transporter = nodemailer.createTransport(CONFIG_CONTATO_EVENTOS);

    let info = await transporter.sendMail(emailQrCode({ email }));

    console.log("Message sent: %s", id_ingresso, email);

    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
    // return res.send({ message: "Teste Try" })
    return true;
  }
  catch (error) {
    console.log("Erro ao enviar qr " + error);
    return false;
    // return res.send({ message: "Teste" })
  }
}

async function pedidoRecebido(body) {

  try {

    let { customer, created_at, id } = body;

    created_at = created_at.split('T');
    var data = created_at[0];
    var hora = created_at[1];
    data = data.split('-'); data = data[2] + '/' + data[1] + '/' + data[0];
    hora = hora.replace('Z', '');
    created_at = data + ' às ' + hora;
    console.log(created_at);

    const { name, email } = customer;

    const transporter = nodemailer.createTransport(CONFIG_CONTATO_EVENTOS);

    console.log('Chegou aqui');

    let info = await transporter.sendMail(avisoPedidoRecebido({ name, email, created_at, id }));

    console.log("Message sent: %s", info.messageId);

    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  }
  catch (error) {
    console.log("Erro " + error);
  }
}

async function emailChangeStatus({ email, name, type, idCompra }) {
  console.log('emailChangeStatus');
  console.log('type ----->', type);
  const transporter = nodemailer.createTransport(CONFIG_CONTATO_EVENTOS);

  switch (type) {
    case 'paid':
      await transporter.sendMail(statusPaid({ email }));
      let { tickets, success } = await getTicketsFromPurchaseId({ purchaseId: idCompra })
      console.log('tickets --------> ', tickets);
      console.log('success --------> ', success);
      if (!success) return;
      tickets.map(a => {
        enviarQRCode({ id_ingresso: a.codigo, email: a.email });
      })
      break;
    case 'payment_failed':
      await transporter.sendMail(statusPaymentFailed({ email }));
      // enviarQRCode({id_ingresso: 123576, email});
      break;
    case 'canceled':
      await transporter.sendMail(statusCanceled({ email }));
      break;
    case 'closed':
      await transporter.sendMail(statusClosed({ email }));
      break;

    default:
      break;
  }

  return true;
}

async function emailTeste(body) {

  try {

    console.log(body);

    var name = 'Rodolfo';
    var email = 'junior_geyer@hotmail.com';
    var created_at = 'Rodolfo';
    var id = '12';

    const transporter = nodemailer.createTransport(CONFIG_CONTATO_EVENTOS);

    let info = await transporter.sendMail(emailHTML({ name, email, created_at, id }));

    console.log("Message sent: %s", info.messageId);

    // console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  }
  catch (error) {
    console.log("Erro " + error);
  }
}

export {
  enviarQRCode, pedidoRecebido, emailChangeStatus, emailTeste
}


