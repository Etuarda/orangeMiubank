// src/services/accountService.js
const prisma = require('../config/prismaClient');
const { Prisma } = require('@prisma/client');
const marketService = require('./marketService'); // Importar o marketService

const ACCOUNT_TYPE = {
    CORRENTE: 'CORRENTE',
    INVESTIMENTO: 'INVESTIMENTO'
};

const MOVEMENT_TYPE = {
    DEPOSITO: 'DEPOSITO',
    SAQUE: 'SAQUE',
    TRANSFERENCIA_INTERNA: 'TRANSFERENCIA_INTERNA',
    TRANSFERENCIA_EXTERNA: 'TRANSFERENCIA_EXTERNA',
    COMPRA_ATIVO: 'COMPRA_ATIVO',
    VENDA_ATIVO: 'VENDA_ATIVO'
};

const ASSET_TYPE = { // Adicionado para facilitar a referência de tipos de ativo
    ACAO: 'ACAO',
    CDB: 'CDB',
    TESOURO_DIRETO: 'TESOURO_DIRETO'
};

const accountService = {
    /**
     * Busca as contas de um usuário.
     * @param {string} userId
     * @returns {Promise<object[]>}
     */
    async getAccountsByUserId(userId) {
        return prisma.account.findMany({
            where: { userId: userId },
            select: {
                id: true,
                type: true,
                balance: true,
                userId: true
            }
        });
    },

    /**
     * Realiza um depósito em uma Conta Corrente.
     * @param {string} userId - ID do usuário
     * @param {number} amount - Valor do depósito
     * @returns {Promise<object>} - Conta atualizada e movimentação
     */
    async deposit(userId, amount) {
        if (amount <= 0) {
            const error = new Error('O valor do depósito deve ser maior que zero.');
            error.status = 400; // Bad Request
            throw error;
        }

        return prisma.$transaction(async (tx) => {
            const account = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.CORRENTE // Depósito apenas na Conta Corrente
                }
            });

            if (!account) {
                const error = new Error('Conta Corrente não encontrada para o usuário.');
                error.status = 404; // Not Found
                throw error;
            }

            const newBalance = new Prisma.Decimal(account.balance).plus(amount);

            const updatedAccount = await tx.account.update({
                where: { id: account.id },
                data: { balance: newBalance }
            });

            await tx.movement.create({
                data: {
                    fromAccountId: account.id, // Em depósito, a conta de origem e destino é a mesma
                    toAccountId: account.id,
                    amount: new Prisma.Decimal(amount),
                    type: MOVEMENT_TYPE.DEPOSITO,
                    description: `Depósito em Conta Corrente.`
                }
            });

            return updatedAccount;
        });
    },

    /**
     * Realiza um saque de uma Conta Corrente.
     * @param {string} userId - ID do usuário
     * @param {number} amount - Valor do saque
     * @returns {Promise<object>} - Conta atualizada e movimentação
     */
    async withdraw(userId, amount) {
        if (amount <= 0) {
            const error = new Error('O valor do saque deve ser maior que zero.');
            error.status = 400; // Bad Request
            throw error;
        }

        return prisma.$transaction(async (tx) => {
            const account = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.CORRENTE // Saque apenas da Conta Corrente
                }
            });

            if (!account) {
                const error = new Error('Conta Corrente não encontrada para o usuário.');
                error.status = 404; // Not Found
                throw error;
            }

            if (new Prisma.Decimal(account.balance).lessThan(amount)) {
                const error = new Error('Saldo insuficiente na Conta Corrente.');
                error.status = 400; // Bad Request
                throw error;
            }

            const newBalance = new Prisma.Decimal(account.balance).minus(amount);

            const updatedAccount = await tx.account.update({
                where: { id: account.id },
                data: { balance: newBalance }
            });

            await tx.movement.create({
                data: {
                    fromAccountId: account.id, // Em saque, a conta de origem e destino é a mesma
                    toAccountId: account.id,
                    amount: new Prisma.Decimal(amount),
                    type: MOVEMENT_TYPE.SAQUE,
                    description: `Saque da Conta Corrente.`
                }
            });

            return updatedAccount;
        });
    },

    /**
     * Realiza uma transferência entre contas do mesmo usuário.
     * @param {string} userId - ID do usuário que está transferindo
     * @param {number} amount - Valor da transferência
     * @param {string} fromAccountType - Tipo da conta de origem ('CORRENTE' ou 'INVESTIMENTO')
     * @param {string} toAccountType - Tipo da conta de destino ('CORRENTE' ou 'INVESTIMENTO')
     * @returns {Promise<object>} - Objeto com as contas atualizadas
     */
    async transferInternal(userId, amount, fromAccountType, toAccountType) {
        if (amount <= 0) {
            const error = new Error('O valor da transferência deve ser maior que zero.');
            error.status = 400;
            throw error;
        }
        if (fromAccountType === toAccountType) {
            const error = new Error('Não é possível transferir entre o mesmo tipo de conta do próprio usuário.');
            error.status = 400;
            throw error;
        }

        return prisma.$transaction(async (tx) => {
            const fromAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: fromAccountType
                }
            });

            if (!fromAccount) {
                const error = new Error(`Conta de origem (${fromAccountType}) não encontrada.`);
                error.status = 404;
                throw error;
            }

            const toAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: toAccountType
                }
            });

            if (!toAccount) {
                const error = new Error(`Conta de destino (${toAccountType}) não encontrada.`);
                error.status = 404;
                throw error;
            }

            if (new Prisma.Decimal(fromAccount.balance).lessThan(amount)) {
                const error = new Error('Saldo insuficiente na conta de origem.');
                error.status = 400;
                throw error;
            }

            // Regra de Negócio: Transferência da Conta Investimento para a Conta Corrente só pode ser realizada se não houver operações pendentes de compra ou venda de ativos.
            // Para simplificar no hackathon, vamos verificar se há algum investimento com isSold: false.
            if (fromAccountType === ACCOUNT_TYPE.INVESTIMENTO) {
                const pendingInvestments = await tx.investment.count({
                    where: {
                        userId: userId,
                        isSold: false
                    }
                });
                if (pendingInvestments > 0) {
                    const error = new Error('Não é possível transferir da Conta Investimento com operações de ativos pendentes. Venda seus ativos primeiro.');
                    error.status = 400;
                    throw error;
                }
            }

            const updatedFromAccount = await tx.account.update({
                where: { id: fromAccount.id },
                data: { balance: { decrement: new Prisma.Decimal(amount) } }
            });

            const updatedToAccount = await tx.account.update({
                where: { id: toAccount.id },
                data: { balance: { increment: new Prisma.Decimal(amount) } }
            });

            // Registro de movimentação para a conta de origem
            await tx.movement.create({
                data: {
                    fromAccountId: fromAccount.id,
                    toAccountId: toAccount.id,
                    amount: new Prisma.Decimal(amount),
                    type: MOVEMENT_TYPE.TRANSFERENCIA_INTERNA,
                    description: `Transferência interna de ${fromAccountType} para ${toAccountType}`
                }
            });

            return { updatedFromAccount, updatedToAccount };
        });
    },

    /**
     * Realiza uma transferência externa (entre diferentes usuários).
     * @param {string} senderUserId - ID do usuário remetente
     * @param {string} recipientCpf - CPF do usuário destinatário
     * @param {number} amount - Valor da transferência
     * @returns {Promise<object>} - Objeto com as contas atualizadas e a movimentação
     */
    async transferExternal(senderUserId, recipientCpf, amount) {
        if (amount <= 0) {
            const error = new Error('O valor da transferência deve ser maior que zero.');
            error.status = 400;
            throw error;
        }

        // Regra de Negócio: Somente a Conta Corrente pode ser usada para transferências entre usuários.
        return prisma.$transaction(async (tx) => {
            const senderCorrenteAccount = await tx.account.findFirst({
                where: {
                    userId: senderUserId,
                    type: ACCOUNT_TYPE.CORRENTE
                }
            });

            if (!senderCorrenteAccount) {
                const error = new Error('Conta Corrente do remetente não encontrada.');
                error.status = 404;
                throw error;
            }

            const recipientUser = await tx.user.findUnique({
                where: { cpf: recipientCpf },
                include: {
                    accounts: {
                        where: { type: ACCOUNT_TYPE.CORRENTE }
                    }
                }
            });

            if (!recipientUser || recipientUser.accounts.length === 0) {
                const error = new Error('Usuário destinatário ou sua Conta Corrente não encontrada.');
                error.status = 404;
                throw error;
            }

            const recipientCorrenteAccount = recipientUser.accounts[0];

            // Taxa de transferência: 0.5% do valor
            const feeRate = new Prisma.Decimal(0.005); // 0.5%
            const fee = new Prisma.Decimal(amount).times(feeRate);
            const totalDebitAmount = new Prisma.Decimal(amount).plus(fee);

            if (new Prisma.Decimal(senderCorrenteAccount.balance).lessThan(totalDebitAmount)) {
                const error = new Error('Saldo insuficiente na Conta Corrente para a transferência e taxa.');
                error.status = 400;
                throw error;
            }

            // Debitar do remetente (valor + taxa)
            const updatedSenderAccount = await tx.account.update({
                where: { id: senderCorrenteAccount.id },
                data: { balance: { decrement: totalDebitAmount } }
            });

            // Creditar no destinatário (apenas o valor)
            const updatedRecipientAccount = await tx.account.update({
                where: { id: recipientCorrenteAccount.id },
                data: { balance: { increment: new Prisma.Decimal(amount) } }
            });

            // Registro de movimentação para o remetente (débito com taxa)
            await tx.movement.create({
                data: {
                    fromAccountId: senderCorrenteAccount.id,
                    toAccountId: recipientCorrenteAccount.id,
                    amount: totalDebitAmount,
                    type: MOVEMENT_TYPE.TRANSFERENCIA_EXTERNA,
                    description: `Transferência enviada para ${recipientUser.name} (CPF: ${recipientCpf}). Taxa de ${fee.toFixed(2)} incluída.`
                }
            });

            // Registro de movimentação para o destinatário (crédito do valor)
            await tx.movement.create({
                data: {
                    fromAccountId: senderCorrenteAccount.id, // Origem é a conta do outro usuário (para rastreamento)
                    toAccountId: recipientCorrenteAccount.id,
                    amount: new Prisma.Decimal(amount),
                    type: MOVEMENT_TYPE.TRANSFERENCIA_EXTERNA,
                    description: `Transferência recebida de ${senderUserId} (CPF do remetente: ${senderCorrenteAccount.userId ? (await tx.user.findUnique({ where: { id: senderUserId }, select: { cpf: true } })).cpf : 'Desconhecido'}).`
                }
            });

            return { updatedSenderAccount, updatedRecipientAccount };
        });
    },

    /**
     * Realiza a compra de um ativo.
     * @param {string} userId - ID do usuário
     * @param {string} assetId - ID do ativo a ser comprado
     * @param {number} quantity - Quantidade do ativo a ser comprado
     * @returns {Promise<object>} - O investimento criado e a conta de investimento atualizada
     */
    async buyAsset(userId, assetId, quantity) {
        if (quantity <= 0) {
            const error = new Error('A quantidade a ser comprada deve ser maior que zero.');
            error.status = 400;
            throw error;
        }

        return prisma.$transaction(async (tx) => {
            const asset = await marketService.getAssetById(assetId); // Usar getAssetById
            if (!asset) {
                const error = new Error(`Ativo com ID '${assetId}' não encontrado.`);
                error.status = 404;
                throw error;
            }

            const investmentAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.INVESTIMENTO
                }
            });

            if (!investmentAccount) {
                const error = new Error('Conta Investimento não encontrada para o usuário.');
                error.status = 404;
                throw error;
            }

            // Taxa de corretagem para ações: 1%
            let brokerageFee = new Prisma.Decimal(0);
            if (asset.type === ASSET_TYPE.ACAO) {
                brokerageFee = new Prisma.Decimal(asset.currentPrice).times(quantity).times(0.01); // 1%
            }

            const totalCost = new Prisma.Decimal(asset.currentPrice).times(quantity).plus(brokerageFee);

            if (new Prisma.Decimal(investmentAccount.balance).lessThan(totalCost)) {
                const error = new Error('Saldo insuficiente na Conta Investimento para comprar este ativo.');
                error.status = 400;
                throw error;
            }

            // Debitar da Conta Investimento (valor do ativo + taxa)
            const updatedAccount = await tx.account.update({
                where: { id: investmentAccount.id },
                data: { balance: { decrement: totalCost } }
            });

            // Criar o registro de investimento
            const newInvestment = await tx.investment.create({
                data: {
                    userId: userId,
                    assetId: asset.id,
                    quantity: new Prisma.Decimal(quantity),
                    purchasePrice: new Prisma.Decimal(asset.currentPrice),
                    purchaseDate: new Date(),
                    isSold: false,
                }
            });

            // Registrar movimentação
            await tx.movement.create({
                data: {
                    fromAccountId: investmentAccount.id,
                    toAccountId: investmentAccount.id, // Para compra, origem e destino são a mesma conta
                    amount: totalCost,
                    type: MOVEMENT_TYPE.COMPRA_ATIVO,
                    description: `Compra de ${quantity} ${asset.symbol || asset.name} (taxa: R$${brokerageFee.toFixed(2)})`,
                    investmentId: newInvestment.id,
                }
            });

            // Opcional: Atualizar humor do pet (considerando investimento como "salvar")
            await this.updatePetMoodForSaving(userId, totalCost.toNumber());

            return { newInvestment, updatedAccount };
        });
    },

    /**
     * Realiza a venda de um ativo.
     * @param {string} userId - ID do usuário
     * @param {string} investmentId - ID do investimento a ser vendido
     * @param {number} [quantityToSell] - Quantidade do ativo a ser vendida (opcional, se não informado, vende tudo)
     * @returns {Promise<object>} - O investimento atualizado e a conta de investimento atualizada, e valores de imposto/lucro
     */
    async sellAsset(userId, investmentId, quantityToSell) {
        return prisma.$transaction(async (tx) => {
            const investment = await tx.investment.findUnique({
                where: { id: investmentId },
                include: { asset: true }
            });

            if (!investment || investment.userId !== userId || investment.isSold) {
                const error = new Error('Investimento não encontrado, não pertence ao usuário ou já foi totalmente vendido.');
                error.status = 404;
                throw error;
            }

            const currentAssetPrice = new Prisma.Decimal(investment.asset.currentPrice);
            const initialPurchasePricePerUnit = new Prisma.Decimal(investment.purchasePrice);
            const totalOwnedQuantity = new Prisma.Decimal(investment.quantity);

            const actualQuantityToSell = quantityToSell ? new Prisma.Decimal(quantityToSell) : totalOwnedQuantity;

            if (actualQuantityToSell.lessThanOrEqualTo(0) || actualQuantityToSell.greaterThan(totalOwnedQuantity)) {
                const error = new Error('Quantidade a ser vendida inválida.');
                error.status = 400;
                throw error;
            }

            const totalRevenueBeforeTax = actualQuantityToSell.times(currentAssetPrice);
            const originalCostOfSoldQuantity = actualQuantityToSell.times(initialPurchasePricePerUnit);
            let grossProfit = totalRevenueBeforeTax.minus(originalCostOfSoldQuantity);
            let taxRate = new Prisma.Decimal(0);

            // Regra de Imposto de Renda
            if (grossProfit.greaterThan(0)) { // Só incide imposto sobre lucro
                if (investment.asset.type === ASSET_TYPE.ACAO) {
                    taxRate = new Prisma.Decimal(0.15); // 15% para ações
                } else if (investment.asset.type === ASSET_TYPE.CDB || investment.asset.type === ASSET_TYPE.TESOURO_DIRETO) {
                    taxRate = new Prisma.Decimal(0.22); // 22% para renda fixa
                }
            }

            const taxAmount = grossProfit.times(taxRate);
            const netRevenue = totalRevenueBeforeTax.minus(taxAmount);

            const investmentAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.INVESTIMENTO
                }
            });

            if (!investmentAccount) {
                const error = new Error('Conta Investimento não encontrada para o usuário.');
                error.status = 404;
                throw error;
            }

            // Creditar na Conta Investimento (valor líquido após imposto)
            const updatedAccount = await tx.account.update({
                where: { id: investmentAccount.id },
                data: { balance: { increment: netRevenue } }
            });

            let updatedInvestment;
            let finalProfit = new Prisma.Decimal(0);
            let finalTaxPaid = new Prisma.Decimal(0);

            if (actualQuantityToSell.equals(totalOwnedQuantity)) {
                // Venda total
                updatedInvestment = await tx.investment.update({
                    where: { id: investment.id },
                    data: {
                        isSold: true,
                        quantity: new Prisma.Decimal(0), // Quantidade remanescente é zero
                        salePrice: currentAssetPrice, // Preço de venda por unidade
                        saleDate: new Date(),
                        profit: investment.profit ? new Prisma.Decimal(investment.profit).plus(grossProfit.minus(taxAmount)) : grossProfit.minus(taxAmount),
                        taxPaid: investment.taxPaid ? new Prisma.Decimal(investment.taxPaid).plus(taxAmount) : taxAmount,
                    }
                });
                finalProfit = grossProfit.minus(taxAmount);
                finalTaxPaid = taxAmount;
            } else {
                // Venda parcial: atualiza a quantidade do investimento existente
                updatedInvestment = await tx.investment.update({
                    where: { id: investment.id },
                    data: {
                        quantity: { decrement: actualQuantityToSell },
                        // Para vendas parciais, o lucro/imposto pode ser acumulado ou tratado como um novo registro.
                        // Para simplicidade, vamos acumular no registro original, mas é mais complexo em cenários reais.
                        profit: investment.profit ? new Prisma.Decimal(investment.profit).plus(grossProfit.minus(taxAmount)) : grossProfit.minus(taxAmount),
                        taxPaid: investment.taxPaid ? new Prisma.Decimal(investment.taxPaid).plus(taxAmount) : taxAmount,
                    }
                });
                finalProfit = grossProfit.minus(taxAmount);
                finalTaxPaid = taxAmount;
            }

            // Registrar movimentação de venda
            await tx.movement.create({
                data: {
                    fromAccountId: investmentAccount.id, // Origem/destino é a própria conta de investimento
                    toAccountId: investmentAccount.id,
                    amount: netRevenue, // Valor líquido creditado
                    type: MOVEMENT_TYPE.VENDA_ATIVO,
                    description: `Venda de ${actualQuantityToSell.toFixed(4)} ${investment.asset.symbol || investment.asset.name}. Lucro Bruto: R$${grossProfit.toFixed(2)}, Imposto: R$${taxAmount.toFixed(2)}.`,
                    investmentId: updatedInvestment.id,
                }
            });

            return { updatedInvestment, updatedAccount, taxPaidAmount: finalTaxPaid, profitAmount: finalProfit };
        });
    },

    /**
     * Atualiza o humor do pet com base no dinheiro economizado (simplesmente incrementa)
     * Pode ser chamado após depósitos ou investimentos bem-sucedidos.
     * @param {string} userId
     * @param {number} amountSaved
     */
    async updatePetMoodForSaving(userId, amountSaved) {
        try {
            const pet = await prisma.pet.findUnique({
                where: { userId: userId }
            });

            if (pet) {
                let newMood = pet.mood;
                // Exemplo: a cada R$100 economizados, o humor do pet aumenta em 1, limitado a 5.
                if (amountSaved >= 100) {
                    newMood = Math.min(5, pet.mood + Math.floor(amountSaved / 100));
                }

                await prisma.pet.update({
                    where: { userId: userId },
                    data: {
                        mood: newMood,
                        savedThisMonth: new Prisma.Decimal(pet.savedThisMonth).plus(amountSaved),
                        lastUpdate: new Date(),
                    }
                });
                console.log(`Pet do usuário ${userId} teve humor atualizado para ${newMood}. Salvo este mês: ${new Prisma.Decimal(pet.savedThisMonth).plus(amountSaved).toFixed(2)}`);
            }
        } catch (error) {
            console.error('Erro ao atualizar humor do pet:', error);
            // Não propaga o erro para não impedir a operação principal
        }
    }
};

module.exports = accountService;