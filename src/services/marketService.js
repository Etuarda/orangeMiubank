// src/services/marketService.js
const prisma = require('../config/prismaClient');
const { Prisma } = require('@prisma/client');

const marketService = {
    /**
     * Simula a obtenção de ativos disponíveis no mercado e atualiza seus preços.
     * Para ações, simula flutuações. Para renda fixa, simula rentabilidade.
     * @returns {Promise<object[]>} Lista de ativos com seus preços atuais.
     */
    async getAvailableAssets() {
        const allAssets = await prisma.asset.findMany();

        await Promise.all(allAssets.map(async (asset) => {
            let newPrice = new Prisma.Decimal(asset.currentPrice);

            if (asset.type === 'ACAO') {
                // Simulação da variação de preço para ações
                const randomValue = Math.random();
                let variationPercentage;

                if (randomValue < 0.40) { // 40% dos casos
                    variationPercentage = (Math.random() * (0.02 - 0.001) + 0.001); // 0.1% a 2%
                } else if (randomValue < 0.70) { // 30% dos casos
                    variationPercentage = (Math.random() * (0.03 - 0.02) + 0.02); // 2% a 3%
                } else if (randomValue < 0.90) { // 20% dos casos
                    variationPercentage = (Math.random() * (0.04 - 0.03) + 0.03); // 3% a 4%
                } else { // 10% dos casos
                    variationPercentage = (Math.random() * (0.05 - 0.04) + 0.04); // 4% a 5%
                }

                // Sorteia a direção da variação (alta ou baixa)
                const direction = Math.random() < 0.5 ? 1 : -1; // 50% de chance de subir, 50% de cair
                const variation = newPrice.times(variationPercentage).times(direction);
                newPrice = newPrice.plus(variation);

                // Garante que o valor das ações nunca seja negativo
                if (newPrice.lessThan(0)) {
                    newPrice = new Prisma.Decimal(0.01); // Preço mínimo para evitar valores negativos
                }
            } else if (asset.type === 'CDB' || asset.type === 'TESOURO_DIRETO') {
                // Simulação de rentabilidade para Renda Fixa
                // Para simplificar, vamos aplicar a taxa diária proporcional
                if (asset.rate && asset.rateType) {
                    const dailyRate = new Prisma.Decimal(asset.rate).div(365); // Taxa anual para diária
                    const growth = newPrice.times(dailyRate);
                    newPrice = newPrice.plus(growth);

                    // Opcional: Simular inflação para pós-fixados (exemplo simplificado)
                    if (asset.rateType === 'pos') {
                        const inflationFactor = new Prisma.Decimal(1).plus(new Prisma.Decimal(0.0001)); // Ex: 0.01% de inflação diária
                        newPrice = newPrice.times(inflationFactor);
                    }
                }
            }

            // Atualiza o preço e a data da última atualização no banco de dados
            await prisma.asset.update({
                where: { id: asset.id },
                data: { currentPrice: newPrice, lastUpdate: new Date() }
            });
        }));

        // Retorna os ativos atualizados
        return prisma.asset.findMany();
    },

    /**
     * Busca um ativo pelo seu ID.
     * @param {string} assetId
     * @returns {Promise<object|null>}
     */
    async getAssetById(assetId) {
        // Primeiro, atualiza todos os ativos (para garantir que os preços simulados sejam os mais recentes)
        await this.getAvailableAssets();
        // Em seguida, busca o ativo específico
        const asset = await prisma.asset.findUnique({
            where: { id: assetId }
        });
        return asset;
    },

    /**
     * Busca um ativo pelo seu símbolo.
     * @param {string} symbol
     * @returns {Promise<object|null>}
     */
    async getAssetBySymbol(symbol) {
        // Primeiro, atualiza todos os ativos (para garantir que os preços simulados sejam os mais recentes)
        await this.getAvailableAssets();
        // Em seguida, busca o ativo específico
        const asset = await prisma.asset.findUnique({
            where: { symbol: symbol }
        });
        return asset;
    },

    /**
     * Busca os investimentos de um usuário.
     * @param {string} userId
     * @returns {Promise<object[]>} Lista de investimentos do usuário.
     */
    async getUserInvestments(userId) {
        // Opcional: Atualizar preços de ativos antes de retornar os investimentos
        // await this.getAvailableAssets(); // Já é chamado implicitamente por getAssetById/getAssetBySymbol

        const investments = await prisma.investment.findMany({
            where: { userId: userId, isSold: false }, // Retorna apenas investimentos ativos
            include: {
                asset: {
                    select: {
                        symbol: true,
                        name: true,
                        currentPrice: true, // Preço atual do ativo no mercado
                        type: true, // Para diferenciar no cálculo de lucro/imposto
                    }
                }
            }
        });

        // Calcular lucro/prejuízo e valor atual para cada investimento
        return investments.map(inv => {
            const currentPrice = new Prisma.Decimal(inv.asset.currentPrice);
            const purchasePrice = new Prisma.Decimal(inv.purchasePrice);
            const quantity = new Prisma.Decimal(inv.quantity);

            const currentValue = currentPrice.times(quantity);
            const initialValue = purchasePrice.times(quantity);
            const profitOrLoss = currentValue.minus(initialValue);

            return {
                id: inv.id,
                assetSymbol: inv.asset.symbol || inv.asset.name, // Usa símbolo ou nome para RF
                assetName: inv.asset.name,
                assetType: inv.asset.type,
                quantity: quantity.toNumber(),
                purchasePrice: purchasePrice.toNumber(),
                currentPrice: currentPrice.toNumber(), // Preço atual de mercado
                purchaseDate: inv.purchaseDate,
                currentValue: currentValue.toNumber(),
                profitOrLoss: profitOrLoss.toNumber(),
                // Campos de venda (nulos se não vendidos)
                isSold: inv.isSold,
                salePrice: inv.salePrice ? inv.salePrice.toNumber() : null,
                saleDate: inv.saleDate,
                taxPaid: inv.taxPaid ? inv.taxPaid.toNumber() : null,
            };
        });
    }
};

module.exports = marketService;
