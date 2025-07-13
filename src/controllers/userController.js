// src/controllers/userController.js
const userService = require('../services/userService'); // Você já tem este serviço
const prisma = require('../config/prismaClient'); // Certifique-se de que Prisma é importado

const userController = {
    /**
     * Retorna os dados do perfil do usuário logado, incluindo pontos e informações do pet.
     */
    getProfile: async (req, res) => {
        try {
            const userId = req.user.id; // ID do usuário vem do authMiddleware
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    cpf: true, // Se quiser exibir no perfil
                    birthDate: true, // Se quiser exibir no perfil
                    points: true, // <--- INCLUINDO PONTOS DO USUÁRIO
                    pet: { // <--- INCLUINDO DADOS DO PET
                        select: {
                            id: true,
                            mood: true,
                            savedThisMonth: true,
                            lastUpdate: true,
                        }
                    },
                    accounts: { // <--- OPTEI POR INCLUIR CONTAS, MAS PODE SER FEITO VIA OUTRO ENDPOINT
                        select: {
                            id: true,
                            type: true,
                            balance: true,
                        }
                    }
                }
            });

            if (!user) {
                return res.status(404).json({ error: 'Usuário não encontrado.' });
            }
            res.status(200).json(user);
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            res.status(500).json({ error: error.message || 'Erro interno do servidor ao buscar perfil.' });
        }
    },
};

module.exports = userController;