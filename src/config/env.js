// src/config/env.js

// Este arquivo carrega as variáveis de ambiente do arquivo .env
// e as exporta para serem usadas de forma centralizada na aplicação.
// É uma boa prática para gerenciar configurações sensíveis e específicas do ambiente.

require('dotenv').config(); // Carrega as variáveis de ambiente do .env

// Exporta as variáveis de ambiente necessárias.
// Usamos 'process.env.PORT || 3000' para definir um valor padrão caso a variável não exista.
module.exports = {
    PORT: process.env.PORT || 3000,
    JWT_SECRET: process.env.JWT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
};
