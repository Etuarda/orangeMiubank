// src/index.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJSDoc = require('swagger-jsdoc'); // Importar swagger-jsdoc
const pingRoutes = require('./routes/ping.routes');
const authRoutes = require('./routes/authRoutes'); // Importar as rotas de autenticação
const authMiddleware = require('./middlewares/authMiddleware'); // Importar o middleware de autenticação
const accountController = require('./controllers/accountController'); // Importar accountController
const userService = require('./services/userService'); // Importar userService (para exemplo)
const errorMiddleware = require('./middlewares/errormiddleware');


const app = express();

app.use(cors());
app.use(express.json());

// Configuração do Swagger JSDoc
const swaggerOptions = {
    definition: {
        openapi: '3.0.0', // Especifica a versão OpenAPI (anteriormente swagger: '2.0')
        info: {
            title: 'MiuBank API',
            description: 'Documentação da API do MiuBank 🐱💰',
            version: '1.0.0',
        },
        servers: [ // Adicionado servers para compatibilidade com OpenAPI 3
            {
                url: `http://localhost:${process.env.PORT || 3000}`,
                description: 'Servidor de Desenvolvimento',
            },
        ],
        components: { // Define schemas e securitySchemes
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
                AuthResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        token: { type: 'string' }
                    }
                },
                // Adicione outros schemas conforme necessário para as rotas
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
app.use('/auth', authRoutes); // Usar as rotas de autenticação sob o prefixo /auth

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Usar swaggerSpec gerado pelo JSDoc

// --- Rotas Protegidas ---
// Todas as rotas abaixo usarão o middleware de autenticação
app.use(authMiddleware);

// Exemplo de rota protegida para obter o perfil do usuário logado
/**
 * @swagger
 * /user/profile:
 * get:
 * summary: Retorna o perfil completo do usuário logado.
 * tags: [Usuário]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Perfil do usuário.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * id: { type: string }
 * name: { type: string }
 * email: { type: string }
 * cpf: { type: string }
 * birthDate: { type: string, format: date }
 * accounts:
 * type: array
 * items:
 * type: object
 * properties:
 * id: { type: string }
 * type: { type: string, enum: [CORRENTE, INVESTIMENTO] }
 * balance: { type: number, format: float }
 * pet:
 * type: object
 * properties:
 * id: { type: string }
 * mood: { type: number }
 * savedThisMonth: { type: number, format: float }
 * lastUpdate: { type: string, format: date-time }
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/user/profile', async (req, res) => {
    try {
        const user = await userService.getUserById(req.user.id); // req.user é populado pelo authMiddleware
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar perfil.' });
    }
});

// Endpoint para obter saldos das contas do usuário logado
/**
 * @swagger
 * /accounts/balances:
 * get:
 * summary: Retorna os saldos da Conta Corrente e Conta Investimento do usuário logado.
 * tags: [Conta]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: Saldos das contas.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * corrente:
 * type: number
 * format: float
 * example: 5000.00
 * investimento:
 * type: number
 * format: float
 * example: 1000.00
 * 401:
 * description: Não autorizado / Token inválido ou ausente.
 * content:
 * application: json
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 404:
 * description: Contas não encontradas para o usuário.
 * content:
 * application: json
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 500:
 * description: Erro interno do servidor.
 * content:
 * application: json
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
app.get('/accounts/balances', accountController.getAccountBalances);


// Middleware de erro
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`Swagger UI disponível em http://localhost:${PORT}/api-docs`);
});