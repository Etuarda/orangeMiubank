// src/services/financialGoalService.js
const prisma = require('../config/prismaClient');
const { Prisma } = require('@prisma/client');

const financialGoalService = {
    /**
     * Cria uma nova meta financeira para o usuário.
     * @param {string} userId - ID do usuário.
     * @param {string} name - Nome da meta.
     * @param {number} targetAmount - Valor alvo da meta.
     * @param {string} [deadline] - Data limite (formato YYYY-MM-DD, opcional).
     * @returns {Promise<object>} A meta criada.
     */
    async createGoal(userId, name, targetAmount, deadline) {
        if (targetAmount <= 0) {
            const error = new Error('O valor alvo da meta deve ser maior que zero.');
            error.status = 400;
            throw error;
        }

        const goal = await prisma.financialGoal.create({
            data: {
                userId: userId,
                name: name,
                targetAmount: new Prisma.Decimal(targetAmount),
                deadline: deadline ? new Date(deadline) : null,
            }
        });

        // Gamificação: Conceder pontos por criar uma meta
        await prisma.user.update({
            where: { id: userId },
            data: { points: { increment: 10 } } // Ex: 10 pontos por criar uma meta
        });

        return goal;
    },

    /**
     * Lista todas as metas financeiras de um usuário.
     * @param {string} userId - ID do usuário.
     * @returns {Promise<Array<object>>} Lista de metas.
     */
    async getGoalsByUserId(userId) {
        const goals = await prisma.financialGoal.findMany({
            where: { userId: userId },
            orderBy: { createdAt: 'asc' }
        });

        return goals.map(goal => ({
            id: goal.id,
            name: goal.name,
            targetAmount: goal.targetAmount.toNumber(),
            currentAmount: goal.currentAmount.toNumber(),
            progressPercentage: goal.targetAmount.greaterThan(0) ?
                new Prisma.Decimal(goal.currentAmount).div(goal.targetAmount).times(100).toNumber() : 0,
            deadline: goal.deadline,
            isAchieved: goal.isAchieved,
            createdAt: goal.createdAt,
        }));
    },

    /**
     * Atualiza o progresso de uma meta financeira e verifica se foi alcançada.
     * Pode ser chamado após um depósito ou transferência para investimento.
     * @param {string} goalId - ID da meta a ser atualizada.
     * @param {string} userId - ID do usuário (para verificação de posse).
     * @param {number} amountAdded - Valor a ser adicionado ao progresso.
     * @returns {Promise<object>} A meta atualizada.
     */
    async updateGoalProgress(goalId, userId, amountAdded) {
        if (amountAdded <= 0) {
            const error = new Error('O valor adicionado ao progresso deve ser maior que zero.');
            error.status = 400;
            throw error;
        }

        return prisma.$transaction(async (tx) => {
            const goal = await tx.financialGoal.findUnique({
                where: { id: goalId }
            });

            if (!goal || goal.userId !== userId) {
                const error = new Error('Meta financeira não encontrada ou não pertence a este usuário.');
                error.status = 404;
                throw error;
            }
            if (goal.isAchieved) {
                const error = new Error('Esta meta já foi alcançada.');
                error.status = 400;
                throw error;
            }

            let newCurrentAmount = new Prisma.Decimal(goal.currentAmount).plus(amountAdded);
            let isAchieved = false;
            let pointsForAchieving = 0;

            if (newCurrentAmount.greaterThanOrEqualTo(goal.targetAmount)) {
                newCurrentAmount = goal.targetAmount; // Garante que não ultrapasse o alvo
                isAchieved = true;
                pointsForAchieving = 50; // Ex: 50 pontos por alcançar uma meta
            }

            const updatedGoal = await tx.financialGoal.update({
                where: { id: goalId },
                data: {
                    currentAmount: newCurrentAmount,
                    isAchieved: isAchieved,
                    updatedAt: new Date(),
                }
            });

            // Gamificação: Adicionar pontos por alcançar a meta
            if (isAchieved && pointsForAchieving > 0) {
                await tx.user.update({
                    where: { id: userId },
                    data: { points: { increment: pointsForAchieving } }
                });
                console.log(`🎉 Usuário ${userId} ganhou ${pointsForAchieving} pontos por alcançar a meta "${goal.name}".`);
                // Opcional: Atualizar humor do pet com grande incremento
                // await petService.addPointsAndUpdateMood(userId, 0, 2); // Apenas +2 humor
            }

            return updatedGoal;
        });
    },

    /**
     * Atualiza uma meta financeira existente (nome, valor alvo, data limite).
     * @param {string} goalId - ID da meta a ser atualizada.
     * @param {string} userId - ID do usuário (para verificação de posse).
     * @param {object} updates - Objeto com os campos a serem atualizados (name, targetAmount, deadline).
     * @returns {Promise<object>} A meta atualizada.
     */
    async updateGoal(goalId, userId, updates) {
        const goal = await prisma.financialGoal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== userId) {
            const error = new Error('Meta financeira não encontrada ou não pertence a este usuário.');
            error.status = 404;
            throw error;
        }

        if (updates.targetAmount && new Prisma.Decimal(updates.targetAmount).lessThanOrEqualTo(0)) {
            const error = new Error('O valor alvo da meta deve ser maior que zero.');
            error.status = 400;
            throw error;
        }

        // Se o targetAmount for alterado para um valor menor que o currentAmount,
        // e o currentAmount já for maior ou igual ao novo targetAmount,
        // a meta pode ser considerada alcançada.
        let isAchieved = goal.isAchieved;
        if (updates.targetAmount && new Prisma.Decimal(goal.currentAmount).greaterThanOrEqualTo(updates.targetAmount)) {
            isAchieved = true;
            // Opcional: Adicionar pontos se a meta for alcançada por uma edição
            if (!goal.isAchieved) { // Se não estava alcançada antes
                await prisma.user.update({
                    where: { id: userId },
                    data: { points: { increment: 50 } } // Ex: 50 pontos por alcançar uma meta
                });
                console.log(`🎉 Usuário ${userId} ganhou 50 pontos por alcançar a meta "${goal.name}" via edição.`);
            }
        } else if (goal.isAchieved && updates.targetAmount && new Prisma.Decimal(goal.currentAmount).lessThan(updates.targetAmount)) {
            // Se a meta estava alcançada e o targetAmount foi aumentado para um valor maior que o currentAmount,
            // ela não está mais alcançada.
            isAchieved = false;
        }


        const updatedGoal = await prisma.financialGoal.update({
            where: { id: goalId },
            data: {
                name: updates.name || goal.name,
                targetAmount: updates.targetAmount ? new Prisma.Decimal(updates.targetAmount) : goal.targetAmount,
                deadline: updates.deadline !== undefined ? (updates.deadline ? new Date(updates.deadline) : null) : goal.deadline,
                isAchieved: isAchieved, // Atualiza o status de alcançada
                updatedAt: new Date(),
            }
        });

        return updatedGoal;
    },

    /**
     * Deleta uma meta financeira.
     * @param {string} goalId - ID da meta a ser deletada.
     * @param {string} userId - ID do usuário (para verificação de posse).
     * @returns {Promise<object>} A meta deletada.
     */
    async deleteGoal(goalId, userId) {
        const goal = await prisma.financialGoal.findUnique({
            where: { id: goalId }
        });

        if (!goal || goal.userId !== userId) {
            const error = new Error('Meta financeira não encontrada ou não pertence a este usuário.');
            error.status = 404;
            throw error;
        }

        await prisma.financialGoal.delete({
            where: { id: goalId }
        });

        return { message: 'Meta financeira deletada com sucesso.' };
    }
};

module.exports = financialGoalService;