
function onlyNumbers(value) {
  return value?.replace(/[^0-9]+/g, "")
}

function splitNumberFone(value) {
  return { area_code: value?.slice(0,2), number: value?.slice(3)}
}

function formatDateBr(value) {
  var ano = value.getFullYear();
  var mes = value.getMonth() + 1;
  var dia = value.getDate();
  if (mes < 10) {
      mes = '0' + mes;
  }
  if (dia < 10) {
      dia = '0' + dia;
  }
  var date = dia + '/' + mes + '/' + ano;
  return date;
}

export {
  onlyNumbers,
  splitNumberFone,
  formatDateBr
}