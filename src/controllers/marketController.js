// src/controllers/marketController.js
const marketService = require('../services/marketService');
const accountService = require('../services/accountService'); // Para compra/venda
const { z } = require('zod');

// Esquemas de validação
const buyAssetSchema = z.object({
    assetId: z.string().uuid("ID do ativo inválido."),
    quantity: z.number().positive("A quantidade deve ser maior que zero.").finite("A quantidade deve ser um número válido."),
});

const sellAssetSchema = z.object({
    // CORREÇÃO AQUI: .finite() antes de .optional()
    quantityToSell: z.number().positive("A quantidade a ser vendida deve ser maior que zero.").finite("A quantidade deve ser um número válido.").optional(),
    investmentId: z.string().uuid("ID do investimento inválido."),
});

const marketController = {
    /**
     * Retorna a lista de ativos disponíveis no mercado com seus preços atuais.
     */
    async getMarketAssets(req, res) {
        try {
            const assets = await marketService.getAvailableAssets();
            return res.status(200).json(assets.map(asset => ({
                id: asset.id,
                symbol: asset.symbol,
                name: asset.name,
                type: asset.type,
                currentPrice: asset.currentPrice.toNumber(),
                description: asset.description,
                rate: asset.rate ? asset.rate.toNumber() : null,
                rateType: asset.rateType,
                maturity: asset.maturity,
                minimumInvestment: asset.minimumInvestment ? asset.minimumInvestment.toNumber() : null,
                lastUpdate: asset.lastUpdate,
            })));
        } catch (error) {
            console.error('Erro ao buscar ativos do mercado:', error);
            return res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar ativos do mercado.' });
        }
    },

    /**
     * Retorna os investimentos de um usuário.
     */
    async getUserInvestments(req, res) {
        try {
            const userId = req.user.id;
            const investments = await marketService.getUserInvestments(userId);
            return res.status(200).json(investments);
        } catch (error) {
            console.error('Erro ao buscar investimentos do usuário:', error);
            return res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar investimentos.' });
        }
    },

    /**
     * Realiza a compra de um ativo.
     */
    async buyAsset(req, res) {
        try {
            const userId = req.user.id;
            const { assetId, quantity } = buyAssetSchema.parse(req.body);

            const { newInvestment, updatedAccount } = await accountService.buyAsset(userId, assetId, quantity);

            return res.status(200).json({
                message: `Compra de ${quantity} unidades do ativo realizada com sucesso.`,
                investment: {
                    id: newInvestment.id,
                    assetId: newInvestment.assetId,
                    quantity: newInvestment.quantity.toNumber(),
                    purchasePrice: newInvestment.purchasePrice.toNumber(),
                },
                newInvestmentAccountBalance: updatedAccount.balance.toNumber(),
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao comprar ativo:', error);
            const statusCode = error.status || 400;
            return res.status(statusCode).json({ error: error.message || 'Erro ao comprar ativo.' });
        }
    },

    /**
     * Realiza a venda de um ativo.
     */
    async sellAsset(req, res) {
        try {
            const userId = req.user.id;
            const { investmentId, quantityToSell } = sellAssetSchema.parse(req.body);

            const { updatedInvestment, updatedAccount, taxPaidAmount, profitAmount } = await accountService.sellAsset(userId, investmentId, quantityToSell);

            return res.status(200).json({
                message: `Venda de ativo realizada com sucesso. Imposto retido: R$${(taxPaidAmount || 0).toFixed(2)}. Lucro/Prejuízo: R$${(profitAmount || 0).toFixed(2)}.`,
                updatedInvestment: {
                    id: updatedInvestment.id,
                    assetId: updatedInvestment.assetId,
                    quantity: updatedInvestment.quantity.toNumber(),
                    isSold: updatedInvestment.isSold,
                    salePrice: updatedInvestment.salePrice ? updatedInvestment.salePrice.toNumber() : null,
                    taxPaid: updatedInvestment.taxPaid ? updatedInvestment.taxPaid.toNumber() : null,
                    profit: updatedInvestment.profit ? updatedInvestment.profit.toNumber() : null,
                },
                newInvestmentAccountBalance: updatedAccount.balance.toNumber(),
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao vender ativo:', error);
            const statusCode = error.status || 400;
            return res.status(statusCode).json({ error: error.message || 'Erro ao vender ativo.' });
        }
    }
};

module.exports = marketController;