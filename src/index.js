// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');

const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/account.routes');
const marketRoutes = require('./routes/market.routes');
const userRoutes = require('./routes/user.routes');

const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();
app.use(cors());
app.use(express.json());

// Configuração do Swagger JSDoc
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'MiuBank API',
            description: 'Documentação da API do MiuBank 🐱💰',
            version: '1.0.0',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Servidor de Desenvolvimento',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Mensagem de erro' }
                    }
                },
                UserRegister: {
                    type: 'object',
                    required: ['name', 'email', 'password', 'cpf', 'birthDate'],
                    properties: {
                        name: { type: 'string', example: 'João da Silva' },
                        email: { type: 'string', format: 'email', example: 'joao.silva@example.com' },
                        password: { type: 'string', format: 'password', example: 'minhaSenhaSegura123' },
                        cpf: { type: 'string', example: '123.456.789-00' },
                        birthDate: { type: 'string', format: 'date', example: '1990-01-01' },
                    }
                },
                UserLogin: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'joao.silva@example.com' },
                        password: { type: 'string', format: 'password', example: 'minhaSenhaSegura123' },
                    }
                }
            }
        },
        tags: [
            { name: 'Autenticação', description: 'Rotas para registro e login de usuários.' },
            { name: 'Conta', description: 'Operações financeiras relacionadas às contas do usuário (depósito, saque, transferências).' },
            { name: 'Mercado', description: 'Operações de compra e venda de ativos e consulta de mercado.' },
            { name: 'Usuário', description: 'Rotas para informações do perfil do usuário.' },
        ]
    },
    apis: [
        './src/routes/authRoutes.js',
        './src/routes/account.routes.js',
        './src/routes/market.routes.js',
        './src/routes/user.routes.js'
    ],
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Rota básica
app.get('/', (req, res) => {
    res.send('MiuBank API rodando! 🐱💰');
});

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas públicas
app.use('/auth', authRoutes);

// Rotas protegidas
app.use('/accounts', accountRoutes);
app.use('/market', marketRoutes);
app.use('/user', userRoutes);

// Middleware de erro
app.use(errorMiddleware);

// Inicialização
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📄 Swagger disponível em http://localhost:${PORT}/api-docs`);
});
