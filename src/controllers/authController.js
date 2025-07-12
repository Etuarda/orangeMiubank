// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prismaClient'); // Sua instância do Prisma Client
const { JWT_SECRET } = require('../config/env'); // Sua chave secreta do JWT
const { z } = require('zod'); // Importar Zod para validação de esquema

// Esquemas de validação com Zod
const userRegisterSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres."),
    email: z.string().email("Formato de e-mail inválido.").max(255, "E-mail muito longo."),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").max(255, "Senha muito longa."),
    cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, "CPF inválido. Use o formato XXX.XXX.XXX-XX."),
    birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data de nascimento inválida. Use o formato YYYY-MM-DD."),
});

const userLoginSchema = z.object({
    email: z.string().email("Formato de e-mail inválido."),
    password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres."),
});

const authController = {
    async register(req, res) {
        try {
            // Validação dos dados de entrada com Zod
            const userData = userRegisterSchema.parse(req.body);

            const { name, email, password, cpf, birthDate } = userData;

            // Verificar se o email ou CPF já estão cadastrados
            const existingUser = await prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                return res.status(409).json({ error: 'E-mail já cadastrado.' });
            }

            const existingCpf = await prisma.user.findUnique({
                where: { cpf },
            });
            if (existingCpf) {
                return res.status(409).json({ error: 'CPF já cadastrado.' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);

            const newUser = await prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    cpf,
                    birthDate: new Date(birthDate), // Converte a string para Date
                    accounts: {
                        create: [
                            { type: 'CORRENTE', balance: 0.00 },
                            { type: 'INVESTIMENTO', balance: 0.00 },
                        ],
                    },
                    pet: {
                        create: {
                            mood: 3, // Humor inicial
                            savedThisMonth: 0.00,
                            lastUpdate: new Date(),
                        },
                    },
                },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    cpf: true,
                    birthDate: true,
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
                        }
                    }
                }
            });

            // Gerar token JWT
            const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '1h' });

            return res.status(201).json({
                message: 'Usuário cadastrado com sucesso.',
                user: newUser,
                token
            });

        } catch (error) {
            // Tratamento de erros Zod
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao registrar usuário:', error);
            return res.status(500).json({ error: 'Erro interno do servidor ao registrar usuário.' });
        }
    },

    async login(req, res) {
        try {
            // Validação dos dados de entrada com Zod
            const loginData = userLoginSchema.parse(req.body);

            const { email, password } = loginData;

            const user = await prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                return res.status(400).json({ error: 'Credenciais inválidas.' });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(400).json({ error: 'Credenciais inválidas.' });
            }

            // Gerar token JWT
            const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

            return res.status(200).json({
                message: 'Login bem-sucedido.',
                token,
                userId: user.id,
                email: user.email,
                name: user.name,
            });

        } catch (error) {
            // Tratamento de erros Zod
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors.map(err => err.message).join(', ') });
            }
            console.error('Erro ao fazer login:', error);
            return res.status(500).json({ error: 'Erro interno do servidor ao fazer login.' });
        }
    },
};

module.exports = authController;