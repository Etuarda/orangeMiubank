// src/routes/financialTip.routes.js
const express = require('express');
const router = express.Router();
const financialTipController = require('../controllers/financialTipController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplica autenticação a todas as rotas desta subentidade
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Gamificação
 *   description: Funcionalidades relacionadas a dicas e pílulas financeiras
 */

/**
 * @swagger
 * /financial-tips:
 *   get:
 *     summary: Retorna todas as pílulas de riqueza.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pílulas de riqueza.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   example:
 *                     type: string
 *                     nullable: true
 *                   source:
 *                     type: string
 *                     nullable: true
 *                   category:
 *                     type: string
 *                     nullable: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/', financialTipController.getAllFinancialTips);

/**
 * @swagger
 * /financial-tips/random:
 *   get:
 *     summary: Retorna uma pílula de riqueza aleatória.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Uma pílula de riqueza aleatória.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 example:
 *                   type: string
 *                   nullable: true
 *                 source:
 *                   type: string
 *                   nullable: true
 *                 category:
 *                   type: string
 *                   nullable: true
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Nenhuma pílula de riqueza encontrada.
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/random', financialTipController.getRandomFinancialTip);

module.exports = router;
