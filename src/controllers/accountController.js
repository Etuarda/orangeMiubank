// src/controllers/accountController.js
const prisma = require('../config/prismaClient');
const userService = require('../services/userService'); // Pode ser útil para buscar dados do usuário

const accountController = {
    async getAccountBalances(req, res) {
        try {
            const userId = req.user.id; // ID do usuário vem do authMiddleware

            const accounts = await prisma.account.findMany({
                where: { userId: userId },
                select: {
                    type: true,
                    balance: true,
                }
            });

            if (!accounts || accounts.length === 0) {
                return res.status(404).json({ error: 'Contas não encontradas para este usuário.' });
            }

            const balances = {
                corrente: 0.00,
                investimento: 0.00,
            };

            accounts.forEach(account => {
                if (account.type === 'CORRENTE') {
                    balances.corrente = account.balance.toNumber(); // Converte Decimal para Number
                } else if (account.type === 'INVESTIMENTO') {
                    balances.investimento = account.balance.toNumber();
                }
            });

            return res.status(200).json(balances);

        } catch (error) {
            console.error('Erro ao buscar saldos das contas:', error);
            // Delega para o middleware de erro para um tratamento mais genérico ou específico
            // res.status(500).json({ error: 'Erro interno do servidor ao buscar saldos.' });
            // Ou, para usar o error.middleware:
            // next(error); // Se você quiser que o middleware de erro capture.
            return res.status(500).json({ error: 'Erro interno do servidor ao buscar saldos.' }); // Retorna direto por simplicidade aqui
        }
    },
    // Outros métodos de conta (depósito, saque, transferência) virão aqui
};

module.exports = accountController;