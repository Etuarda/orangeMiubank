// src/services/userService.js
const prisma = require('../config/prismaClient');

const userService = {
    /**
     * Busca um usuário pelo ID, incluindo suas contas e pet.
     * @param {string} userId
     * @returns {Promise<object|null>}
     */
    async getUserById(userId) {
        return prisma.user.findUnique({
            where: { id: userId },
            include: {
                accounts: {
                    select: {
                        id: true,
                        type: true,
                        balance: true,
                    }
                },
                pet: {
                    select: {
                        id: true,
                        mood: true,
                        savedThisMonth: true,
                        lastUpdate: true,
                    }
                }
            }
        });
    },

    /**
     * Busca um usuário pelo email.
     * @param {string} email
     * @returns {Promise<object|null>}
     */
    async getUserByEmail(email) {
        return prisma.user.findUnique({
            where: { email: email },
        });
    },

    /**
     * Busca um usuário pelo CPF.
     * @param {string} cpf
     * @returns {Promise<object|null>}
     */
    async getUserByCpf(cpf) {
        return prisma.user.findUnique({
            where: { cpf: cpf },
        });
    },

    // Outros métodos relacionados a usuários podem ser adicionados aqui
};

module.exports = userService;