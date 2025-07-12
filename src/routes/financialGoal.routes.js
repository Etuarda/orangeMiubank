// src/routes/financialGoal.routes.js
const express = require('express');
const financialGoalController = require('../controllers/financialGoalController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Gamificação
 *   description: Funcionalidades relacionadas a pontos e metas financeiras
 */

/**
 * @swagger
 * /goals:
 *   post:
 *     summary: Cria uma nova meta financeira para o usuário logado.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - targetAmount
 *             properties:
 *               name:
 *                 type: string
 *                 example: Viagem para a Praia
 *               targetAmount:
 *                 type: number
 *                 format: float
 *                 example: 5000.00
 *               deadline:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2026-12-31"
 *                 description: Data limite para alcançar a meta (YYYY-MM-DD).
 *     responses:
 *       201:
 *         description: Meta financeira criada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Meta financeira criada com sucesso.
 *                 goal:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     targetAmount: { type: number, format: float }
 *                     currentAmount: { type: number, format: float }
 *                     deadline: { type: string, format: date-time, nullable: true }
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/', financialGoalController.createGoal);

/**
 * @swagger
 * /goals:
 *   get:
 *     summary: Lista todas as metas financeiras do usuário logado.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de metas financeiras do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   targetAmount: { type: number, format: float }
 *                   currentAmount: { type: number, format: float }
 *                   progressPercentage: { type: number, format: float }
 *                   deadline: { type: string, format: date-time, nullable: true }
 *                   isAchieved: { type: boolean }
 *                   createdAt: { type: string, format: date-time }
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', financialGoalController.getGoals);

/**
 * @swagger
 * /goals/{id}/track-progress:
 *   patch:
 *     summary: Atualiza o progresso de uma meta financeira específica do usuário.
 *     description: Use este endpoint para adicionar um valor ao progresso de uma meta.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da meta financeira a ser atualizada.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amountAdded
 *             properties:
 *               amountAdded:
 *                 type: number
 *                 format: float
 *                 example: 100.00
 *                 description: Valor a ser adicionado ao progresso da meta.
 *     responses:
 *       200:
 *         description: Progresso da meta atualizado com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Progresso da meta atualizado.
 *                 goal:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     targetAmount: { type: number, format: float }
 *                     currentAmount: { type: number, format: float }
 *                     progressPercentage: { type: number, format: float }
 *                     isAchieved: { type: boolean }
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.patch('/:id/track-progress', financialGoalController.updateGoalProgress);

/**
 * @swagger
 * /goals/{id}:
 *   put:
 *     summary: Atualiza uma meta financeira existente (nome, valor alvo, data limite).
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da meta financeira a ser atualizada.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Viagem para a Europa
 *               targetAmount:
 *                 type: number
 *                 format: float
 *                 example: 7500.00
 *               deadline:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2027-06-30"
 *     responses:
 *       200:
 *         description: Meta financeira atualizada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Meta atualizada com sucesso.
 *                 goal:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     name: { type: string }
 *                     targetAmount: { type: number, format: float }
 *                     currentAmount: { type: number, format: float }
 *                     deadline: { type: string, format: date-time, nullable: true }
 *                     isAchieved: { type: boolean }
 *       400:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.put('/:id', financialGoalController.updateGoal);

/**
 * @swagger
 * /goals/{id}:
 *   delete:
 *     summary: Deleta uma meta financeira específica do usuário.
 *     tags: [Gamificação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID da meta financeira a ser deletada.
 *     responses:
 *       200:
 *         description: Meta financeira deletada com sucesso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Meta financeira deletada com sucesso.
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id', financialGoalController.deleteGoal);

module.exports = router;
