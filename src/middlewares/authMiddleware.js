// src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const prisma = require('../config/prismaClient');

const authMiddleware = async (req, res, next) => {
    // Obter o token do cabeçalho de autorização
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido ou mal formatado.' });
    }

    const token = authHeader.split(' ')[1]; // Extrai o token após 'Bearer '

    try {
        // Verificar o token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Buscar o usuário no banco de dados para garantir que ele ainda existe
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
            }
        });

        if (!user) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        // Adicionar informações do usuário à requisição (para uso nos controllers)
        req.user = user;
        next(); // Continuar para o próximo middleware/rota

    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Token inválido.' });
        }
        console.error('Erro no middleware de autenticação:', error);
        return res.status(500).json({ error: 'Erro interno do servidor ao autenticar.' });
    }
};

module.exports = authMiddleware;