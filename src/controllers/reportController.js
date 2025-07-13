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

const taxReportSchema = z.object({
    year: z.preprocess(
        (val) => parseInt(val, 10),
        z.number().int().positive("O ano deve ser um número inteiro positivo.").optional()
    ),
    startDate: z.string().optional().refine(val => !val || !isNaN(new Date(val)), "Formato de data inválido para startDate (YYYY-MM-DD).").transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().refine(val => !val || !isNaN(new Date(val)), "Formato de data inválido para endDate (YYYY-MM-DD).").transform(val => val ? new Date(val) : undefined),
}).refine(data => {
    // Validação para garantir que ou 'year' ou 'startDate/endDate' são fornecidos, mas não ambos
    const hasYear = data.year !== undefined;
    const hasDateRange = data.startDate !== undefined || data.endDate !== undefined;

    if (hasYear && hasDateRange) {
        return false; // Não pode ter ano e range de datas ao mesmo tempo
    }
    if (data.startDate && data.endDate && data.startDate > data.endDate) {
        return false; // Data de início não pode ser posterior à data de fim
    }
    return true;
}, {
    message: "Forneça um 'year' ou um 'startDate'/'endDate', mas não ambos. A data de início não pode ser posterior à data de fim.",
    path: ["year", "startDate", "endDate"],
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

    /**
     * Gera um relatório consolidado de Imposto de Renda para o usuário logado.
     */
    async getTaxReport(req, res) {
        try {
            const userId = req.user.id;
            const { year, startDate, endDate } = taxReportSchema.parse(req.query);

            const taxReport = await reportService.getTaxReport(userId, year, startDate, endDate);

            return res.status(200).json(taxReport);

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao gerar relatório de Imposto de Renda:', error);
            const statusCode = error.status || 500;
            return res.status(statusCode).json({ error: error.message || 'Erro interno do servidor ao gerar relatório de Imposto de Renda.' });
        }
    },
};

module.exports = reportController;
