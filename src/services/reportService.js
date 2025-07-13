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
    },

    /**
     * Gera um relatório consolidado de Imposto de Renda para o usuário.
     * Agrega lucros e impostos pagos de investimentos vendidos em um período específico.
     * @param {string} userId - ID do usuário.
     * @param {number} [year] - Ano para filtrar (opcional).
     * @param {Date} [startDate] - Data de início do período (opcional).
     * @param {Date} [endDate] - Data de fim do período (opcional).
     * @returns {Promise<object>} Objeto com lucros e impostos consolidados.
     */
    async getTaxReport(userId, year, startDate, endDate) {
        const whereCondition = {
            userId: userId,
            isSold: true, // Apenas investimentos que foram vendidos
            saleDate: {}
        };

        if (year) {
            // Se um ano é fornecido, define o início e fim do ano
            whereCondition.saleDate.gte = new Date(`${year}-01-01T00:00:00.000Z`);
            whereCondition.saleDate.lte = new Date(`${year}-12-31T23:59:59.999Z`);
        } else {
            // Se não há ano, usa as datas de início e fim fornecidas
            if (startDate) {
                whereCondition.saleDate.gte = startDate;
            }
            if (endDate) {
                whereCondition.saleDate.lte = new Date(endDate.getTime() + 24 * 60 * 60 * 1000 - 1);
            }
        }

        const soldInvestments = await prisma.investment.findMany({
            where: whereCondition,
            select: {
                profit: true,
                taxPaid: true,
                asset: {
                    select: {
                        name: true,
                        symbol: true,
                        type: true,
                    }
                },
                saleDate: true,
                purchaseDate: true,
                purchasePrice: true,
                salePrice: true,
                quantity: true,
            }
        });

        let totalProfit = new Prisma.Decimal(0);
        let totalTaxPaid = new Prisma.Decimal(0);
        const detailedReport = [];

        soldInvestments.forEach(inv => {
            const profit = inv.profit ? new Prisma.Decimal(inv.profit) : new Prisma.Decimal(0);
            const taxPaid = inv.taxPaid ? new Prisma.Decimal(inv.taxPaid) : new Prisma.Decimal(0);

            totalProfit = totalProfit.plus(profit);
            totalTaxPaid = totalTaxPaid.plus(taxPaid);

            detailedReport.push({
                investmentId: inv.id,
                assetName: inv.asset.name,
                assetSymbol: inv.asset.symbol,
                assetType: inv.asset.type,
                quantity: inv.quantity.toNumber(),
                purchasePrice: inv.purchasePrice.toNumber(),
                salePrice: inv.salePrice ? inv.salePrice.toNumber() : null,
                purchaseDate: inv.purchaseDate,
                saleDate: inv.saleDate,
                profit: profit.toNumber(),
                taxPaid: taxPaid.toNumber(),
            });
        });

        return {
            totalProfit: totalProfit.toNumber(),
            totalTaxPaid: totalTaxPaid.toNumber(),
            detailedReport: detailedReport,
            filterPeriod: year ? `Ano: ${year}` : (startDate && endDate ? `De ${startDate.toISOString().split('T')[0]} a ${endDate.toISOString().split('T')[0]}` : 'Todos os períodos'),
        };
    },
};

module.exports = reportService;
