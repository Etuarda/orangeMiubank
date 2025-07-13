// src/controllers/financialTipController.js
const prisma = require('../config/prismaClient'); // Certifique-se de que a importação do prismaClient está correta

const financialTipController = {
    /**
     * Retorna todas as pílulas de riqueza.
     */
    getAllFinancialTips: async (req, res) => {
        try {
            const tips = await prisma.financialTip.findMany({
                orderBy: { createdAt: 'asc' } // Ordena para consistência
            });
            res.status(200).json(tips);
        } catch (error) {
            console.error('Erro ao buscar todas as pílulas de riqueza:', error);
            res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar pílulas de riqueza.' });
        }
    },

    /**
     * Retorna uma pílula de riqueza aleatória.
     */
    getRandomFinancialTip: async (req, res) => {
        try {
            const count = await prisma.financialTip.count();
            if (count === 0) {
                return res.status(404).json({ error: 'Nenhuma pílula de riqueza encontrada.' });
            }
            const skip = Math.floor(Math.random() * count);
            const randomTip = await prisma.financialTip.findFirst({
                skip: skip,
            });
            res.status(200).json(randomTip);
        } catch (error) {
            console.error('Erro ao buscar pílula de riqueza aleatória:', error);
            res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar pílula de riqueza aleatória.' });
        }
    }
};

module.exports = financialTipController;