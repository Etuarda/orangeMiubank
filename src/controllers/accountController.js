// src/controllers/accountController.js
const accountService = require('../services/accountService'); // Importar o serviço de contas
const { z } = require('zod'); // Importar Zod para validação

// Esquemas de validação com Zod
const amountSchema = z.object({
    amount: z.number().positive("O valor deve ser maior que zero.").finite("O valor deve ser um número válido."),
});

const transferInternalSchema = z.object({
    amount: z.number().positive("O valor da transferência deve ser maior que zero.").finite("O valor deve ser um número válido."),
    fromAccountType: z.enum(['CORRENTE', 'INVESTIMENTO'], { message: "Tipo de conta de origem inválido." }),
    toAccountType: z.enum(['CORRENTE', 'INVESTIMENTO'], { message: "Tipo de conta de destino inválido." }),
}).refine(data => data.fromAccountType !== data.toAccountType, {
    message: "Não é possível transferir entre o mesmo tipo de conta do próprio usuário.",
    path: ["fromAccountType", "toAccountType"],
});

const transferExternalSchema = z.object({
    amount: z.number().positive("O valor da transferência deve ser maior que zero.").finite("O valor deve ser um número válido."),
    recipientCpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF do destinatário inválido. Use o formato XXX.XXX.XXX-XX."),
});

const accountController = {
    // Método já existente
    async getAccountBalances(req, res) {
        try {
            const userId = req.user.id;
            const accounts = await accountService.getAccountsByUserId(userId);

            if (!accounts || accounts.length === 0) {
                return res.status(404).json({ error: 'Contas não encontradas para este usuário.' });
            }

            const balances = {
                corrente: 0.00,
                investimento: 0.00,
            };

            accounts.forEach(account => {
                if (account.type === 'CORRENTE') {
                    balances.corrente = account.balance.toNumber();
                } else if (account.type === 'INVESTIMENTO') {
                    balances.investimento = account.balance.toNumber();
                }
            });

            return res.status(200).json(balances);

        } catch (error) {
            console.error('Erro ao buscar saldos das contas:', error);
            return res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar saldos.' });
        }
    },

    async deposit(req, res) {
        try {
            const userId = req.user.id;
            const { amount } = amountSchema.parse(req.body);

            const updatedAccount = await accountService.deposit(userId, amount);

            // Opcional: Atualizar humor do pet após depósito
            await accountService.updatePetMoodForSaving(userId, amount);

            return res.status(200).json({
                message: `Depósito de R$${amount.toFixed(2)} realizado com sucesso na Conta Corrente.`,
                newBalance: updatedAccount.balance.toNumber()
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao realizar depósito:', error);
            // Lança o erro para o middleware de erro se a lógica de tratamento for mais complexa
            return res.status(error.status || 400).json({ error: error.message || 'Erro ao realizar depósito.' });
        }
    },

    async withdraw(req, res) {
        try {
            const userId = req.user.id;
            const { amount } = amountSchema.parse(req.body);

            const updatedAccount = await accountService.withdraw(userId, amount);

            return res.status(200).json({
                message: `Saque de R$${amount.toFixed(2)} realizado com sucesso da Conta Corrente.`,
                newBalance: updatedAccount.balance.toNumber()
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao realizar saque:', error);
            return res.status(error.status || 400).json({ error: error.message || 'Erro ao realizar saque.' });
        }
    },

    async transferInternal(req, res) {
        try {
            const userId = req.user.id;
            const { amount, fromAccountType, toAccountType } = transferInternalSchema.parse(req.body);

            const { updatedFromAccount, updatedToAccount } = await accountService.transferInternal(
                userId,
                amount,
                fromAccountType,
                toAccountType
            );

            // Opcional: Atualizar humor do pet após transferência para investimento (considerando como "salvar")
            if (toAccountType === 'INVESTIMENTO') {
                await accountService.updatePetMoodForSaving(userId, amount);
            }

            return res.status(200).json({
                message: `Transferência interna de R$${amount.toFixed(2)} realizada com sucesso de ${fromAccountType} para ${toAccountType}.`,
                newBalances: {
                    [fromAccountType.toLowerCase()]: updatedFromAccount.balance.toNumber(),
                    [toAccountType.toLowerCase()]: updatedToAccount.balance.toNumber(),
                }
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao realizar transferência interna:', error);
            return res.status(error.status || 400).json({ error: error.message || 'Erro ao realizar transferência interna.' });
        }
    },

    async transferExternal(req, res) {
        try {
            const userId = req.user.id;
            const { amount, recipientCpf } = transferExternalSchema.parse(req.body);

            const { updatedSenderAccount, updatedRecipientAccount } = await accountService.transferExternal(
                userId,
                recipientCpf,
                amount
            );

            return res.status(200).json({
                message: `Transferência externa de R$${amount.toFixed(2)} realizada com sucesso para o CPF ${recipientCpf}.`,
                newSenderBalance: updatedSenderAccount.balance.toNumber(),
                newRecipientBalance: updatedRecipientAccount.balance.toNumber(),
            });

        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao realizar transferência externa:', error);
            return res.status(error.status || 400).json({ error: error.message || 'Erro ao realizar transferência externa.' });
        }
    }
};

module.exports = accountController;