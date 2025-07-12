// src/controllers/financialGoalController.js
const financialGoalService = require('../services/financialGoalService');
const { z } = require('zod');
const { Prisma } = require('@prisma/client'); // Importar Prisma para usar Decimal

// Esquemas de validação
const createGoalSchema = z.object({
    name: z.string().min(3, "O nome da meta deve ter no mínimo 3 caracteres."),
    targetAmount: z.number().positive("O valor alvo deve ser maior que zero.").finite("O valor alvo deve ser um número válido."),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido para deadline (YYYY-MM-DD).").optional().transform(val => val ? val : undefined),
});

const updateGoalSchema = z.object({
    name: z.string().min(3, "O nome da meta deve ter no mínimo 3 caracteres.").optional(),
    targetAmount: z.number().positive("O valor alvo deve ser maior que zero.").finite("O valor alvo deve ser um número válido.").optional(),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de data inválido para deadline (YYYY-MM-DD).").optional().nullable().transform(val => val === null ? null : (val ? val : undefined)), // Permite null para remover deadline
}).refine(data => data.name !== undefined || data.targetAmount !== undefined || data.deadline !== undefined, {
    message: "Pelo menos um campo (name, targetAmount ou deadline) deve ser fornecido para atualização.",
    path: ["body"],
});


const updateGoalProgressSchema = z.object({
    amountAdded: z.number().positive("O valor adicionado ao progresso deve ser maior que zero.").finite("O valor deve ser um número válido."),
});


const financialGoalController = {
    /**
     * Cria uma nova meta financeira para o usuário logado.
     */
    async createGoal(req, res) {
        try {
            const userId = req.user.id;
            const { name, targetAmount, deadline } = createGoalSchema.parse(req.body);

            const newGoal = await financialGoalService.createGoal(userId, name, targetAmount, deadline);

            return res.status(201).json({
                message: 'Meta financeira criada com sucesso.',
                goal: {
                    id: newGoal.id,
                    name: newGoal.name,
                    targetAmount: newGoal.targetAmount.toNumber(),
                    currentAmount: newGoal.currentAmount.toNumber(),
                    deadline: newGoal.deadline,
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao criar meta financeira:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao criar meta financeira.' });
        }
    },

    /**
     * Lista todas as metas financeiras do usuário logado.
     */
    async getGoals(req, res) {
        try {
            const userId = req.user.id;
            const goals = await financialGoalService.getGoalsByUserId(userId);
            return res.status(200).json(goals);
        } catch (error) {
            console.error('Erro ao listar metas financeiras:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao listar metas financeiras.' });
        }
    },

    /**
     * Atualiza o progresso de uma meta financeira específica do usuário.
     */
    async updateGoalProgress(req, res) {
        try {
            const userId = req.user.id;
            const { id: goalId } = req.params; // ID da meta vem da URL
            const { amountAdded } = updateGoalProgressSchema.parse(req.body);

            const updatedGoal = await financialGoalService.updateGoalProgress(goalId, userId, amountAdded);

            return res.status(200).json({
                message: `Progresso da meta "${updatedGoal.name}" atualizado.`,
                goal: {
                    id: updatedGoal.id,
                    name: updatedGoal.name,
                    targetAmount: updatedGoal.targetAmount.toNumber(),
                    currentAmount: updatedGoal.currentAmount.toNumber(),
                    progressPercentage: updatedGoal.targetAmount.greaterThan(0) ?
                        new Prisma.Decimal(updatedGoal.currentAmount).div(updatedGoal.targetAmount).times(100).toNumber() : 0,
                    isAchieved: updatedGoal.isAchieved,
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao atualizar progresso da meta:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao atualizar progresso da meta.' });
        }
    },

    /**
     * Atualiza uma meta financeira existente (nome, valor alvo, data limite).
     */
    async updateGoal(req, res) {
        try {
            const userId = req.user.id;
            const { id: goalId } = req.params;
            const updates = updateGoalSchema.parse(req.body); // Valida e pega as atualizações

            const updatedGoal = await financialGoalService.updateGoal(goalId, userId, updates);

            return res.status(200).json({
                message: `Meta "${updatedGoal.name}" atualizada com sucesso.`,
                goal: {
                    id: updatedGoal.id,
                    name: updatedGoal.name,
                    targetAmount: updatedGoal.targetAmount.toNumber(),
                    currentAmount: updatedGoal.currentAmount.toNumber(),
                    deadline: updatedGoal.deadline,
                    isAchieved: updatedGoal.isAchieved,
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao atualizar meta financeira:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao atualizar meta financeira.' });
        }
    },

    /**
     * Deleta uma meta financeira específica do usuário.
     */
    async deleteGoal(req, res) {
        try {
            const userId = req.user.id;
            const { id: goalId } = req.params;

            const result = await financialGoalService.deleteGoal(goalId, userId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao deletar meta financeira:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao deletar meta financeira.' });
        }
    },
};

module.exports = financialGoalController;