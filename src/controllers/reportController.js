// src/controllers/reportController.js
const reportService = require('../services/reportService');
const { z } = require('zod');

const statementSchema = z.object({
    accountType: z.enum(['CORRENTE', 'INVESTIMENTO'], { message: "Tipo de conta inválido. Deve ser 'CORRENTE' ou 'INVESTIMENTO'." }),
    startDate: z.string().optional().refine(val => !val || !isNaN(new Date(val)), "Formato de data inválido para startDate (YYYY-MM-DD).").transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().refine(val => !val || !isNaN(new Date(val)), "Formato de data inválido para endDate (YYYY-MM-DD).").transform(val => val ? new Date(val) : undefined),
}).refine(data => {
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
        return false;
    }
    return true;
}, {
    message: "A data de início não pode ser posterior à data de fim.",
    path: ["startDate", "endDate"],
});

const reportController = {
    async getAccountStatement(req, res) {
        try {
            const userId = req.user.id;
            const { accountType, startDate, endDate } = statementSchema.parse(req.query);

            const statement = await reportService.getAccountStatement(userId, accountType, startDate, endDate);

            return res.status(200).json(statement);

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao gerar extrato de conta:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao gerar extrato.' });
        }
    },

    async getInvestmentSummary(req, res) {
        try {
            const userId = req.user.id;

            const summary = await reportService.getInvestmentSummary(userId);

            return res.status(200).json(summary);

        } catch (error) {
            console.error('Erro ao gerar resumo de investimentos:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao gerar resumo de investimentos.' });
        }
    },
};

module.exports = reportController;