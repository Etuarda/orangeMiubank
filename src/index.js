// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc');
const pingRoutes = require('./routes/ping.routes');
const authRoutes = require('./routes/authRoutes');
const accountRoutes = require('./routes/account.routes'); // Importar as rotas de conta
const authMiddleware = require('./middlewares/authMiddleware');
const userService = require('./services/userService'); // Importar userService (para exemplo de profile)
const errorMiddleware = require('./middlewares/errorMiddleware'); // Certifique-se do nome do arquivo

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
                        error: {
                            type: 'string',
                            example: 'Mensagem de erro'
                        }
                    }
                },
                AuthResponse: { // Embora não seja diretamente usado, mantém a consistência
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        token: { type: 'string' }
                    }
                },
                UserRegister: { // Exemplo de schema para o corpo da requisição de registro
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
                UserLogin: { // Exemplo de schema para o corpo da requisição de login
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'joao.silva@example.com' },
                        password: { type: 'string', format: 'password', example: 'minhaSenhaSegura123' },
                    }
                }
                // Novos schemas para as operações de conta não são estritamente necessários aqui,
                // pois já são definidos inline nos @swagger da rota.
            }
        }
    },
    apis: ['./src/routes/*.js'], // Caminho para os arquivos de rota que contêm anotações JSDoc
};

const swaggerSpec = swaggerJSDoc(swaggerOptions);

// Rotas públicas
app.get('/', (req, res) => {
    res.send('MiuBank API rodando! 🐱💰');
});
app.use(pingRoutes);
app.use('/auth', authRoutes); // Rotas de autenticação

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// --- Rotas Protegidas (Exemplo) ---
// Note: o middleware authMiddleware pode ser aplicado individualmente ou por grupo de rotas.
// Aqui, para /user/profile, é aplicado diretamente. Para /accounts, será aplicado nas rotas.
app.get('/user/profile', authMiddleware, async (req, res) => { // Movendo authMiddleware para aqui
    try {
        const user = await userService.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar perfil.' });
    }
});

// Usar as rotas de conta (que já aplicam authMiddleware internamente no account.routes.js)
app.use('/accounts', accountRoutes);

// Middleware de erro
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Swagger UI disponível em http://localhost:${PORT}/api-docs`);
});