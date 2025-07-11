// src/routes/authRoutes.js

// Este arquivo define as rotas relacionadas à autenticação de usuários.

const express = require('express');
const authController = require('../controllers/authController'); // Importa o controller de autenticação

const router = express.Router();

/**
 * @swagger
 * /auth/users:
 * post:
 * summary: Cadastra um novo usuário e suas contas
 * tags: [Autenticação]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserRegister'
 * responses:
 * 201:
 * description: Usuário cadastrado com sucesso.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/AuthResponse'
 * 400:
 * description: Dados de entrada inválidos.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 * 409:
 * description: E-mail já cadastrado.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/users', authController.register);

/**
 * @swagger
 * /auth/sessions:
 * post:
 * summary: Realiza o login do usuário e gera um token JWT
 * tags: [Autenticação]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserLogin'
 * responses:
 * 200:
 * description: Login bem-sucedido.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/AuthResponse'
 * 400:
 * description: Credenciais inválidas ou dados de entrada inválidos.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/sessions', authController.login);

module.exports = router;