const express = require('express');
const marketController = require('../controllers/marketController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Todas as rotas abaixo usarão o middleware de autenticação
router.use(authMiddleware);

/**
 * @swagger
 * /market/assets:
 *   get:
 *     summary: Retorna a lista de ativos disponíveis no mercado com seus preços simulados.
 *     tags: [Mercado]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ativos.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     example: "uuid-do-ativo"
 *                   symbol:
 *                     type: string
 *                     example: "BOIB3"
 *                   name:
 *                     type: string
 *                     example: "Boi Bom"
 *                   type:
 *                     type: string
 *                     enum: [ACAO, CDB, TESOURO_DIRETO]
 *                     example: "ACAO"
 *                   currentPrice:
 *                     type: number
 *                     format: float
 *                     example: 25.50
 *                   description:
 *                     type: string
 *                     example: "Ações da Boi Bom do setor Agro."
 *                   rate:
 *                     type: number
 *                     format: float
 *                     nullable: true
 *                     example: 0.12
 *                   rateType:
 *                     type: string
 *                     nullable: true
 *                     example: "pre"
 *                   maturity:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     example: "2024-12-31T00:00:00.000Z"
 *                   minimumInvestment:
 *                     type: number
 *                     format: float
 *                     nullable: true
 *                     example: 1000.00
 *                   lastUpdate:
 *                     type: string
 *                     format: date-time
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/assets', marketController.getMarketAssets);

/**
 * @swagger
 * /market/investments:
 *   get:
 *     summary: Retorna a lista de investimentos ativos (não vendidos) do usuário logado.
 *     tags: [Mercado]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de investimentos do usuário.
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
 *                     example: null
 *                   saleDate:
 *                     type: string
 *                     format: date-time
 *                     nullable: true
 *                     example: null
 *                   taxPaid:
 *                     type: number
 *                     format: float
 *                     nullable: true
 *                     example: null
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
router.get('/investments', marketController.getUserInvestments);

/**
 * @swagger
 * /market/buy:
 *   post:
 *     summary: Realiza a compra de um ativo com saldo da Conta Investimento.
 *     tags: [Mercado]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *               - quantity
 *             properties:
 *               assetId:
 *                 type: string
 *                 format: uuid
 *                 example: "uuid-do-ativo-a-comprar"
 *               quantity:
 *                 type: number
 *                 format: float
 *                 example: 10
 *     responses:
 *       200:
 *         description: Compra de ativo realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Compra de 10 unidades do ativo realizada com sucesso."
 *                 investment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     assetId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       format: float
 *                     purchasePrice:
 *                       type: number
 *                       format: float
 *                     newInvestmentAccountBalance:
 *                       type: number
 *                       format: float
 *                       example: 999.99
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/buy', marketController.buyAsset);

/**
 * @swagger
 * /market/sell:
 *   post:
 *     summary: Realiza a venda de um ativo existente na carteira de investimentos do usuário.
 *     tags: [Mercado]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - investmentId
 *             properties:
 *               investmentId:
 *                 type: string
 *                 format: uuid
 *                 example: "uuid-do-investimento-a-vender"
 *               quantityToSell:
 *                 type: number
 *                 format: float
 *                 nullable: true
 *                 example: 5
 *                 description: Opcional. Se não informado, vende a quantidade total remanescente.
 *     responses:
 *       200:
 *         description: Venda de ativo realizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Venda de ativo realizada com sucesso. Imposto retido: R$0.37. Lucro/Prejuízo: R$2.13."
 *                 updatedInvestment:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     assetId:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                       format: float
 *                     isSold:
 *                       type: boolean
 *                     salePrice:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                     taxPaid:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       example: 0.37
 *                     profit:
 *                       type: number
 *                       format: float
 *                       nullable: true
 *                       example: 2.13
 *                     newInvestmentAccountBalance:
 *                       type: number
 *                       format: float
 *                       example: 1050.00
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sell', marketController.sellAsset);

module.exports = router;
