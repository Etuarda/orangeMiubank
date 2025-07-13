// src/routes/report.routes.js
const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(authMiddleware);

/**
 * @swagger
 * /reports/statement:
 *   get:
 *     summary: Gera um extrato de movimentações para uma conta específica do usuário logado.
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: accountType
 *         schema:
 *           type: string
 *           enum: [CORRENTE, INVESTIMENTO]
 *         required: true
 *         description: "Tipo da conta (CORRENTE ou INVESTIMENTO) para o extrato."
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Data de início do período para o extrato (YYYY-MM-DD)."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Data de fim do período para o extrato (YYYY-MM-DD)."
 *     responses:
 *       200:
 *         description: Extrato de conta gerado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accountId:
 *                   type: string
 *                   example: "uuid-da-conta"
 *                 accountType:
 *                   type: string
 *                   enum: [CORRENTE, INVESTIMENTO]
 *                   example: "CORRENTE"
 *                 currentBalance:
 *                   type: number
 *                   format: float
 *                   example: 4850.50
 *                 statement:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-01-20T10:30:00.000Z"
 *                       type:
 *                         type: string
 *                         enum: [DEPOSITO, SAQUE, TRANSFERENCIA_INTERNA, TRANSFERENCIA_EXTERNA, COMPRA_ATIVO, VENDA_ATIVO]
 *                         example: "DEPOSITO"
 *                       description:
 *                         type: string
 *                         example: "Depósito em Conta Corrente."
 *                       value:
 *                         type: string
 *                         example: "+100.00"
 *                       rawAmount:
 *                         type: number
 *                         format: float
 *                         example: 100.00
 *                       isDebit:
 *                         type: boolean
 *                         example: false
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/statement', reportController.getAccountStatement);

/**
 * @swagger
 * /reports/investments-summary:
 *   get:
 *     summary: Gera um resumo dos investimentos ativos do usuário logado.
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Resumo de investimentos gerado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "uuid-do-investimento"
 *                   assetSymbol:
 *                     type: string
 *                     example: "BOIB3"
 *                   assetName:
 *                     type: string
 *                     example: "Boi Bom"
 *                   assetType:
 *                     type: string
 *                     enum: [ACAO, CDB, TESOURO_DIRETO]
 *                     example: "ACAO"
 *                   quantity:
 *                     type: number
 *                     format: float
 *                     example: 5
 *                   purchasePrice:
 *                     type: number
 *                     format: float
 *                     example: 25.50
 *                   currentPrice:
 *                     type: number
 *                     format: float
 *                     example: 26.00
 *                   purchaseDate:
 *                     type: string
 *                     format: date-time
 *                   isSold:
 *                     type: boolean
 *                     example: false
 *                   salePrice:
 *                     type: number
 *                     format: float
 *                     nullable: true
 *                   saleDate:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                   taxPaid:
 *                     type: number
 *                     format: float
 *                     nullable: true
 *                   currentValue:
 *                     type: number
 *                     format: float
 *                     example: 130.00
 *                   profitOrLoss:
 *                     type: number
 *                     format: float
 *                     example: 2.50
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/investments-summary', reportController.getInvestmentSummary);

/**
 * @swagger
 * /reports/tax-report:
 *   get:
 *     summary: Gera um relatório consolidado de Imposto de Renda para o usuário logado.
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *           format: int32
 *         required: false
 *         description: "Ano para o relatório de IR (ex: 2024)."
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Data de início do período (YYYY-MM-DD)."
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: "Data de fim do período (YYYY-MM-DD)."
 *     responses:
 *       200:
 *         description: Relatório de Imposto de Renda gerado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProfit:
 *                   type: number
 *                   format: float
 *                   example: 150.75
 *                   description: "Lucro total consolidado no período."
 *                 totalTaxPaid:
 *                   type: number
 *                   format: float
 *                   example: 22.61
 *                   description: "Imposto total pago."
 *                 detailedReport:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       investmentId:
 *                         type: string
 *                         example: "uuid-do-investimento"
 *                       assetName:
 *                         type: string
 *                         example: "Boi Bom"
 *                       assetSymbol:
 *                         type: string
 *                         example: "BOIB3"
 *                       assetType:
 *                         type: string
 *                         enum: [ACAO, CDB, TESOURO_DIRETO]
 *                         example: "ACAO"
 *                       quantity:
 *                         type: number
 *                         format: float
 *                         example: 10
 *                       purchasePrice:
 *                         type: number
 *                         format: float
 *                         example: 25.00
 *                       salePrice:
 *                         type: number
 *                         format: float
 *                         example: 26.50
 *                       purchaseDate:
 *                         type: string
 *                         format: date-time
 *                       saleDate:
 *                         type: string
 *                         format: date-time
 *                       profit:
 *                         type: number
 *                         format: float
 *                         example: 15.00
 *                       taxPaid:
 *                         type: number
 *                         format: float
 *                         example: 2.25
 *                 filterPeriod:
 *                   type: string
 *                   example: "Ano: 2024"
 *                   description: "Descrição do período filtrado."
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/tax-report', reportController.getTaxReport);

module.exports = router;
