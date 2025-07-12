// src/routes/account.routes.js
const express = require('express');
const accountController = require('../controllers/accountController');
const authMiddleware = require('../middlewares/authMiddleware'); // Certifique-se de importar

const router = express.Router();

// Todas as rotas abaixo usarão o middleware de autenticação
router.use(authMiddleware);

// Endpoint para obter saldos das contas do usuário logado (já existente no index.js, mas pode ser movido para cá)
/**
 * @swagger
 * /accounts/balances:
 * get:
 * summary: Retorna os saldos da Conta Corrente e Conta Investimento do usuário logado.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Saldos das contas.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * corrente:
 * type: number
 * format: float
 * example: 5000.00
 * investimento:
 * type: number
 * format: float
 * example: 1000.00
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: Contas não encontradas para o usuário.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/balances', accountController.getAccountBalances);

// Endpoint para realizar depósito
/**
 * @swagger
 * /accounts/deposit:
 * post:
 * summary: Realiza um depósito na Conta Corrente do usuário logado.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * properties:
 * amount:
 * type: number
 * format: float
 * example: 100.50
 * responses:
 * 200:
 * description: Depósito realizado com sucesso.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Depósito de R$100.50 realizado com sucesso na Conta Corrente.
 * newBalance:
 * type: number
 * format: float
 * example: 5100.50
 * 400:
 * description: Valor do depósito inválido ou Conta Corrente não encontrada.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/deposit', accountController.deposit);

// Endpoint para realizar saque
/**
 * @swagger
 * /accounts/withdraw:
 * post:
 * summary: Realiza um saque da Conta Corrente do usuário logado.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * properties:
 * amount:
 * type: number
 * format: float
 * example: 50.00
 * responses:
 * 200:
 * description: Saque realizado com sucesso.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Saque de R$50.00 realizado com sucesso da Conta Corrente.
 * newBalance:
 * type: number
 * format: float
 * example: 4950.00
 * 400:
 * description: Valor do saque inválido ou saldo insuficiente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/withdraw', accountController.withdraw);

// Endpoint para transferências internas
/**
 * @swagger
 * /accounts/transfer/internal:
 * post:
 * summary: Realiza uma transferência entre a Conta Corrente e a Conta Investimento do próprio usuário.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * - fromAccountType
 * - toAccountType
 * properties:
 * amount:
 * type: number
 * format: float
 * example: 200.00
 * fromAccountType:
 * type: string
 * enum: [CORRENTE, INVESTIMENTO]
 * example: CORRENTE
 * toAccountType:
 * type: string
 * enum: [CORRENTE, INVESTIMENTO]
 * example: INVESTIMENTO
 * responses:
 * 200:
 * description: Transferência interna realizada com sucesso.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Transferência interna de R$200.00 realizada com sucesso de CORRENTE para INVESTIMENTO.
 * newBalances:
 * type: object
 * properties:
 * corrente:
 * type: number
 * format: float
 * example: 4800.00
 * investimento:
 * type: number
 * format: float
 * example: 1200.00
 * 400:
 * description: Erro de validação, saldo insuficiente ou contas inválidas.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/transfer/internal', accountController.transferInternal);

// Endpoint para transferências externas
/**
 * @swagger
 * /accounts/transfer/external:
 * post:
 * summary: Realiza uma transferência da Conta Corrente do usuário logado para a Conta Corrente de outro usuário.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - amount
 * - recipientCpf
 * properties:
 * amount:
 * type: number
 * format: float
 * example: 150.00
 * recipientCpf:
 * type: string
 * example: 987.654.321-00
 * responses:
 * 200:
 * description: Transferência externa realizada com sucesso.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: Transferência externa de R$150.00 realizada com sucesso para o CPF 987.654.321-00.
 * newSenderBalance:
 * type: number
 * format: float
 * example: 4849.25
 * newRecipientBalance:
 * type: number
 * format: float
 * example: 1150.00
 * 400:
 * description: Erro de validação, saldo insuficiente, CPF do destinatário inválido ou não encontrado.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/transfer/external', accountController.transferExternal);


module.exports = router;