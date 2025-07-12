const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const userService = require('../services/userService');

const router = express.Router();

/**
 * @swagger
 * /user/profile:
 *   get:
 *     summary: Retorna os dados do perfil do usuário logado.
 *     tags: [Usuário]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "c9d4c053-49b6-410c-bc78-2d54a9991870"
 *                 name:
 *                   type: string
 *                   example: "João da Silva"
 *                 email:
 *                   type: string
 *                   example: "joao@example.com"
 *       401:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar perfil.' });
    }
});

module.exports = router;
