# 🐾 MiuBank — API Bancária Gamificada

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-lightgrey)](https://www.prisma.io/)
[![Status](https://img.shields.io/badge/status-em%20desenvolvimento-orange)](#)

---

## ✨ Sobre o Projeto

O **MiuBank** é mais que uma API bancária: é uma jornada financeira gamificada com propósito educativo. Aqui, usuários aprendem a lidar com dinheiro por meio de ações reais (depósitos, transferências, investimentos) enquanto evoluem um Pet virtual que reage às suas conquistas.

> Gerencie suas finanças, cuide do seu Pet e alcance metas com diversão e disciplina. 🎯

---

## 🔗 Links Importantes

* 🔄 **API Render (Deploy Backend):** [orangemiubank.onrender.com](https://orangemiubank.onrender.com)
* 📄 **Swagger (Documentação):** [orangemiubank.onrender.com/api-docs](https://orangemiubank.onrender.com/api-docs)
* 💻 **Deploy Frontend (GitHub Pages):** [etuarda.github.io/orangeMiubank-Front](https://etuarda.github.io/orangeMiubank-Front/)
* 📁 **Repositório Frontend:** [github.com/Etuarda/orangeMiubank-Front](https://github.com/Etuarda/orangeMiubank-Front)

---

## 🧠 Tecnologias Utilizadas

* **Linguagem:** JavaScript (ES6+)
* **Runtime:** [Node.js](https://nodejs.org/)
* **Framework Web:** [Express.js](https://expressjs.com/)
* **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/)
* **ORM:** [Prisma](https://www.prisma.io/)
* **Documentação:** [Swagger UI + JSDoc](https://swagger.io/)
* **Autenticação:** JWT + bcryptjs
* **Validação:** Zod
* **Tarefas Agendadas:** node-cron
* **Outros:** dotenv, cors

---

## 📁 Estrutura do Projeto

```bash
miubank/
├── prisma/                 # Migrations, seed e schema
├── src/
│   ├── config/             # Conexão com o DB, variáveis de ambiente
│   ├── controllers/        # Controle das rotas
│   ├── services/           # Regras de negócio
│   ├── middlewares/        # Autenticação e erros
│   ├── routes/             # Definição de endpoints
│   ├── jobs/               # Tarefas automáticas (ex: simulação do mercado)
│   └── index.js            # Ponto de entrada da API
├── swagger/                # Arquivo swagger.json gerado por JSDoc
├── assets/                 # Mocks e dados de exemplo
├── regradenegocio.md       # Documento de regras de negócio
└── README.md
```

---

## 🔐 Autenticação

* **Registro**: `POST /auth/register`
* **Login**: `POST /auth/login`
* **Token JWT**: deve ser enviado como `Bearer <token>` no header `Authorization`.
* **Middleware**: protege rotas sensíveis e disponibiliza `req.user`.

---

## 💸 Funcionalidades Principais

| Operação                           | Descrição                                                            |
| ---------------------------------- | -------------------------------------------------------------------- |
| `POST /accounts/deposit`           | Depósito em Conta Corrente                                           |
| `POST /accounts/withdraw`          | Saque da Conta Corrente com validação de saldo                       |
| `POST /accounts/transfer/internal` | Transferência entre Conta Corrente e Conta Investimento              |
| `POST /accounts/transfer/external` | Transferência entre usuários (taxa de 0.5%)                          |
| `POST /market/buy`                 | Compra de ativos com taxa de corretagem (ações)                      |
| `POST /market/sell`                | Venda de ativos com cálculo de IR sobre lucro                        |
| `GET /reports`                     | Relatórios filtráveis: extratos, investimentos e imposto consolidado |
| `POST /financial-goals`            | Criação de metas financeiras                                         |

---

## 📊 Simulador de Mercado

* Atualiza os preços a cada 5 minutos (via cron).
* Simula variações em ações e rentabilidade de renda fixa.
* Garante valores coerentes com o mercado real.

---

## 🕹️ Gamificação

| Recurso               | Impacto                                                     |
| --------------------- | ----------------------------------------------------------- |
| **Pet Virtual**       | Humor do pet muda com base nas ações financeiras do usuário |
| **Sistema de Pontos** | Usuários ganham pontos ao criar metas ou investir           |
| **Metas Financeiras** | Planejamento visual e progressivo de conquistas pessoais    |

---

## 📖 Documentação Swagger

Acesse a documentação interativa em:

```
https://orangemiubank.onrender.com/api-docs
```

Inclui:

* Métodos, rotas, parâmetros e respostas
* Modelos de entidades
* Esquemas de autenticação

---

## 📐 Modelos de Dados (Prisma)

| Entidade        | Função Principal                                |
| --------------- | ----------------------------------------------- |
| `User`          | Dados pessoais + pontuação do Pet               |
| `Account`       | Conta Corrente ou Investimento (saldo separado) |
| `Asset`         | Ações, CDBs, Tesouro Direto                     |
| `Investment`    | Registros de ativos comprados                   |
| `Movement`      | Histórico de movimentações                      |
| `Pet`           | Estados emocionais gamificados                  |
| `FinancialGoal` | Metas financeiras do usuário                    |
| `FinancialTip`  | Dicas financeiras rotativas                     |

---

## 🚧 Melhorias Futuras

* ✅ Testes automatizados com Jest
* 📣 Sistema de notificações por eventos financeiros
* 📈 Simulação de cenários de investimento
* 🏅 Gamificação extra: badges e rankings
* 🧾 Reestruturação avançada da lógica de ordens de ativos

---

## 🚀 Instruções para Rodar o Projeto

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/miubank-backend.git
cd miubank-backend
```

2. Instale as dependências:

```bash
npm install
```

3. Configure o `.env`:

```env
DATABASE_URL=postgresql://usuario:senha@localhost:5432/miubank
JWT_SECRET=sua_chave_secreta
```

4. Rode as migrations e o seed:

```bash
npx prisma migrate dev --name init
node prisma/seed.js
```

5. Inicie o servidor:

```bash
npm run dev
```

---

## 📝 Licença

Este projeto está licenciado sob a [MIT License](./LICENSE).
Sinta-se livre para usar, modificar e distribuir com os devidos créditos.

---

## 🤝 Contribuição

Contribuições são bem-vindas!
Se desejar propor melhorias ou sugerir novas funcionalidades, abra uma issue ou pull request.

---

## 💡 Créditos

Desenvolvido por [Eduarda Silva Santos](https://www.linkedin.com/in/itseduarda) com foco em educação financeira acessível e experiência de usuário gamificada.
Projeto submetido ao Orange Hackathon.

---
