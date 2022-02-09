export const Errors = {
    MISSING_FIELD: "Não recebemos todos os dados da sua requisição",
    EMAIL_ALREADY_REGISTERED: "Já existe uma conta com este email",
    CPF_ALREADY_REGISTERED: "Já existe uma conta com este CPF",
    SIGNUP_GENERIC_ERROR: "Erro ao salvar o novo login",
    UNABLE_REGISTER_TOKEN: "Não foi possível registrar seu token de acesso",
    INVALID_GOOGLE_TOKEN: "Token de acesso google inválido",
    SIGNIN_GENERIC_ERROR: "Erro ao buscar o login",
    WRONG_PASSWORD: "Usuário/senha incorretos",
    NOT_AUTHENTICATED: "Login expirado ou inválido",
    UNABLE_IDENTIFY_USER: "Não foi possível identificar o usuário",
    UNABLE_UPDATE_ORDER_WHEN_HAS_INSTALLMENT_PAID: "Não é possível alterar o pedido quando já existe um pagamento registrado",
    
    FAILED_SAVE_CUSTOMER: "Não foi possível salvar cliente no momento",
    FAILED_SAVE_PRODUCT: "Não foi possível salvar produto no momento",
    FAILED_SAVE_ENTRIE: "Não foi possível salvar a entrada de produtos no momento",
    FAILED_SAVE_ORDER: "Não foi possível salvar o pedido no momento",
    FAILED_SAVE_PAYMENT: "Não foi possível salvar o pagamento no momento",
    FAILED_LIST: "Não foi possível listar no momento",
    FAILED_CLOSE_ORDER: "Não foi possível fechar a ordem no momento",
    FAILED_GET_ORDER: "Não foi possível Buscar os detalhes do pedido no momento",
    FAILED_GET_ENTRIE: "Não foi possível Buscar os detalhes da entrada no momento",

    FAILED_UPDATE_ORDER: "Não foi possível atualizar o pedido no momento",
    
    PAGARME_INVALID_REQUEST: "Não foi possível realizar a requisição",
    PAGARME_UNAUTHORIZED: "Não foi possível identificar o vendedor",
    PAGARME_REQUEST_FAILED: "Não foi possível concluir a requisição",
    PAGARME_INVALID_PARAMETERS: "Alguns parâmetros não foram enviados no formato correto",
    PAGARME_TOO_MANY_REDIRECTS: "Não foi possível finalizar a requisição",
    PAGARME_SERVER_ERROR: "Erro interno no gateway de pagamento",
    EVENTS_NOT_FOUND: "Não foi possivel encontrar nenhum evento",

    //Mensagens do app do organizador
    EVENT_LIST: "Não foi possível buscar a lista de ingressozz",
    PURCHASE_LIST: "Não foi possível buscar a lista de compras",
    FAILED_TICKET_CHECK: "O ingresso não foi encontrado",
    FAILED_CHECK_: "Não foi possível validar o ingresso",
    FAILED_TICKET_UPDATE: "Não foi possível atualizar o ingresso"
}