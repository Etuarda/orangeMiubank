// src/services/accountService.js
const prisma = require('../config/prismaClient');
const { Prisma } = require('@prisma/client'); // Importar Prisma para usar Prisma.Decimal

const ACCOUNT_TYPE = {
    CORRENTE: 'CORRENTE',
    INVESTIMENTO: 'INVESTIMENTO'
};

const MOVEMENT_TYPE = {
    DEPOSITO: 'DEPOSITO',
    SAQUE: 'SAQUE',
    TRANSFERENCIA_INTERNA: 'TRANSFERENCIA_INTERNA',
    TRANSFERENCIA_EXTERNA: 'TRANSFERENCIA_EXTERNA',
    COMPRA_ATIVO: 'COMPRA_ATIVO', // Adicionado para referência futura
    VENDA_ATIVO: 'VENDA_ATIVO'  // Adicionado para referência futura
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
            throw new Error('O valor do depósito deve ser maior que zero.');
        }

        return prisma.$transaction(async (tx) => {
            const account = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.CORRENTE // Depósito apenas na Conta Corrente
                }
            });

            if (!account) {
                throw new Error('Conta Corrente não encontrada para o usuário.');
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
            throw new Error('O valor do saque deve ser maior que zero.');
        }

        return prisma.$transaction(async (tx) => {
            const account = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: ACCOUNT_TYPE.CORRENTE // Saque apenas da Conta Corrente
                }
            });

            if (!account) {
                throw new Error('Conta Corrente não encontrada para o usuário.');
            }

            if (new Prisma.Decimal(account.balance).lessThan(amount)) {
                throw new Error('Saldo insuficiente na Conta Corrente.');
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
     * @param {AccountType} fromAccountType - Tipo da conta de origem (CORRENTE ou INVESTIMENTO)
     * @param {AccountType} toAccountType - Tipo da conta de destino (CORRENTE ou INVESTIMENTO)
     * @returns {Promise<object>} - Objeto com as contas atualizadas
     */
    async transferInternal(userId, amount, fromAccountType, toAccountType) {
        if (amount <= 0) {
            throw new Error('O valor da transferência deve ser maior que zero.');
        }
        if (fromAccountType === toAccountType) {
            throw new Error('Não é possível transferir entre o mesmo tipo de conta do próprio usuário.');
        }

        return prisma.$transaction(async (tx) => {
            const fromAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: fromAccountType
                }
            });

            if (!fromAccount) {
                throw new Error(`Conta de origem (${fromAccountType}) não encontrada.`);
            }

            const toAccount = await tx.account.findFirst({
                where: {
                    userId: userId,
                    type: toAccountType
                }
            });

            if (!toAccount) {
                throw new Error(`Conta de destino (${toAccountType}) não encontrada.`);
            }

            if (new Prisma.Decimal(fromAccount.balance).lessThan(amount)) {
                throw new Error('Saldo insuficiente na conta de origem.');
            }

            // Regra de Negócio: Transferência da Conta Investimento para a Conta Corrente só pode ser realizada se não houver operações pendentes de compra ou venda de ativos.
            // Para simplificar no hackathon, vamos verificar se há algum investimento com isSold: false.
            // Em um sistema real, seria mais granular, verificando status de ordens de compra/venda.
            if (fromAccountType === ACCOUNT_TYPE.INVESTIMENTO) {
                const pendingInvestments = await tx.investment.count({
                    where: {
                        userId: userId,
                        isSold: false
                    }
                });
                if (pendingInvestments > 0) {
                    throw new Error('Não é possível transferir da Conta Investimento com operações de ativos pendentes. Venda seus ativos primeiro.');
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
            throw new Error('O valor da transferência deve ser maior que zero.');
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
                throw new Error('Conta Corrente do remetente não encontrada.');
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
                throw new Error('Usuário destinatário ou sua Conta Corrente não encontrada.');
            }

            const recipientCorrenteAccount = recipientUser.accounts[0];

            // Taxa de transferência: 0.5% do valor
            const feeRate = new Prisma.Decimal(0.005); // 0.5%
            const fee = new Prisma.Decimal(amount).times(feeRate);
            const totalDebitAmount = new Prisma.Decimal(amount).plus(fee);

            if (new Prisma.Decimal(senderCorrenteAccount.balance).lessThan(totalDebitAmount)) {
                throw new Error('Saldo insuficiente na Conta Corrente para a transferência e taxa.');
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
                    toAccountId: recipientCorrenteAccount.id, // Destino é a conta do outro usuário
                    amount: totalDebitAmount,
                    type: MOVEMENT_TYPE.TRANSFERENCIA_EXTERNA,
                    description: `Transferência enviada para ${recipientUser.name} (CPF: ${recipientCpf}). Taxa de ${fee.toFixed(2)} incluída.`
                }
            });

            // Registro de movimentação para o destinatário (crédito do valor)
            await tx.movement.create({
                data: {
                    fromAccountId: senderCorrenteAccount.id, // Origem é a conta do outro usuário
                    toAccountId: recipientCorrenteAccount.id,
                    amount: new Prisma.Decimal(amount),
                    type: MOVEMENT_TYPE.TRANSFERENCIA_EXTERNA,
                    description: `Transferência recebida de ${updatedSenderAccount.userId} (conta: ${senderCorrenteAccount.id}).` // Poderia buscar o nome do remetente aqui
                }
            });

            return { updatedSenderAccount, updatedRecipientAccount };
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
            // A lógica de humor pode ser mais complexa. Aqui, um simples incremento.
            // Ex: +1 ponto de humor para cada X reais economizados.
            // Para o hackathon, vamos só registrar o savedThisMonth e o humor pode ser calculado ou atualizado de outra forma.
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

    // Outros métodos para investimentos virão aqui
};

module.exports = accountService;