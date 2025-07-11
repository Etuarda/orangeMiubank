// src/config/prismaClient.js

// Este arquivo configura e exporta uma única instância do PrismaClient.
// Usar uma instância singleton garante que você não crie múltiplas conexões
// com o banco de dados, o que é uma boa prática para otimização de recursos.

const { PrismaClient } = require('@prisma/client');

// Declaração de uma variável para armazenar a instância do PrismaClient.
// 'global.prisma' é usado para garantir que a instância seja única
// em ambientes de hot-reloading (como nodemon) durante o desenvolvimento.
let prisma;

// Verifica se já existe uma instância global do PrismaClient.
// Se não existir, cria uma nova.
if (process.env.NODE_ENV === 'production') {
    // Em produção, sempre cria uma nova instância.
    prisma = new PrismaClient();
} else {
    // Em desenvolvimento, verifica a instância global.
    if (!global.prisma) {
        global.prisma = new PrismaClient();
    }
    prisma = global.prisma;
}

// Exporta a instância do PrismaClient para ser usada em toda a aplicação.
module.exports = prisma;
