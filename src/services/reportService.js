// src/services/reportService.js
const prisma = require('../config/prismaClient');
const { Prisma } = require('@prisma/client');

const reportService = {
    /**
     * Gera um extrato de conta para um usuário e tipo de conta, opcionalmente filtrado por período.
     * @param {string} userId - ID do usuário.
     * @param {'CORRENTE' | 'INVESTIMENTO'} accountType - Tipo da conta (CORRENTE ou INVESTIMENTO).
     * @param {Date} [startDate] - Data de início do período (opcional).
     * @param {Date} [endDate] - Data de fim do período (opcional).
     * @returns {Promise<object>} Objeto contendo dados do extrato.
     */
    async getAccountStatement(userId, accountType, startDate, endDate) {
        const account = await prisma.account.findFirst({
            where: {
                userId: userId,
                type: accountType
            },
            select: {
                id: true,
                balance: true
            }
        });

        if (!account) {
            const error = new Error(`Conta ${accountType} não encontrada para o usuário.`);
            error.status = 404;
            throw error;
        }

        const whereCondition = {
            OR: [
                { fromAccountId: account.id },
                { toAccountId: account.id }
            ],
            createdAt: {}
        };

        if (startDate) {
            whereCondition.createdAt.gte = startDate;
        }
        if (endDate) {
            // Adiciona um dia para incluir movimentos até o final do dia da data final
            whereCondition.createdAt.lte = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
        }

        const movements = await prisma.movement.findMany({
            where: whereCondition,
            orderBy: {
                createdAt: 'asc'
            },
            select: {
                id: true,
                amount: true,
                type: true,
                description: true,
                createdAt: true,
                fromAccountId: true,
                toAccountId: true,
            }
        });

        const formattedStatements = movements.map(move => {
            const isDebit = move.fromAccountId === account.id;
            const sign = isDebit ? '-' : '+';
            const value = move.amount.toNumber();

            return {
                date: move.createdAt,
                type: move.type,
                description: move.description || `Movimentação ${move.type}`,
                value: `${sign}${value.toFixed(2)}`,
                rawAmount: value,
                isDebit: isDebit
            };
        });

        return {
            accountId: account.id,
            accountType: accountType,
            currentBalance: account.balance.toNumber(),
            statement: formattedStatements
        };
    },

    /**
     * Gera um resumo dos investimentos ativos de um usuário.
     * @param {string} userId - ID do usuário.
     * @returns {Promise<Array<object>>} Lista de investimentos ativos com rentabilidade.
     */
    async getInvestmentSummary(userId) {
        const investments = await (require('./marketService')).getUserInvestments(userId);
        return investments;
    }
};

module.exports = reportService;