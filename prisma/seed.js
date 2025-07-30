// prisma/seed.js
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    // Sinaliza o início do processo de seeding
    console.log('Iniciando seeding...');
    try {
        // --- Limpeza da base de dados ---
        // A ordem de exclusão é crucial devido às chaves estrangeiras.
        // É necessário deletar as tabelas "dependentes" primeiro (as que referenciam IDs de outras tabelas)
        // antes de deletar as tabelas "principais" (as que são referenciadas).

        // Movement depende de Account e Investment
        await prisma.movement.deleteMany({});

        // Investment depende de User e Asset
        await prisma.investment.deleteMany({});

        // FinancialGoal depende de User
        await prisma.financialGoal.deleteMany({});

        // Pet depende de User
        await prisma.pet.deleteMany({});

        // Account depende de User
        await prisma.account.deleteMany({});

        // User é referenciado por Account, Investment, FinancialGoal e Pet
        await prisma.user.deleteMany({});

        // FinancialTip e Asset não possuem dependências diretas de outras tabelas neste contexto de exclusão,
        // mas Investment depende de Asset. Podem ser limpas após suas dependentes.
        await prisma.financialTip.deleteMany({});
        await prisma.asset.deleteMany({});

        // Sinaliza que a limpeza foi concluída
        console.log('Base de dados limpa com sucesso.');

        // --- Carregando dados mockados ---
        // Caminhos para os arquivos JSON de mock
        const usersMockPath = path.resolve(__dirname, '../assets/users-mock.json');
        const assetsMockPath = path.resolve(__dirname, '../assets/assets-mock.json');

        // Lendo e parseando os dados dos arquivos mock
        const usersData = JSON.parse(fs.readFileSync(usersMockPath, 'utf8')).users;
        const assetsData = JSON.parse(fs.readFileSync(assetsMockPath, 'utf8'));

        // ====================================================================
        // CRIAÇÃO DE USUÁRIOS E CONTAS A PARTIR DOS DADOS MOCK
        // ====================================================================
        const createdUsers = [];
        for (const user of usersData) {
            // Hash da senha para segurança
            const hashedPassword = await bcrypt.hash('password123', 10);
            const birthDate = new Date(user.birthDate);

            const newUser = await prisma.user.create({
                data: {
                    name: user.name,
                    email: user.email,
                    password: hashedPassword,
                    cpf: user.cpf,
                    birthDate,
                    accounts: {
                        // Cria duas contas padrão para cada usuário: corrente e investimento
                        create: [
                            { type: 'CORRENTE', balance: new Prisma.Decimal(5000.00) },
                            { type: 'INVESTIMENTO', balance: new Prisma.Decimal(1000.00) }
                        ]
                    },
                    pet: {
                        // Cria um pet padrão para cada usuário
                        create: {
                            mood: 3,
                            savedThisMonth: new Prisma.Decimal(0.00),
                            lastUpdate: new Date()
                        }
                    }
                }
            });
            createdUsers.push(newUser);
        }

        // ====================================================================
        // CRIAÇÃO DE ATIVOS (AÇÕES E RENDA FIXA) A PARTIR DOS DADOS MOCK
        // ====================================================================
        const createdAssets = [];
        // Criação de ativos do tipo AÇÃO
        for (const stock of assetsData.stocks) {
            const asset = await prisma.asset.create({
                data: {
                    symbol: stock.symbol,
                    name: stock.name,
                    type: 'ACAO',
                    currentPrice: new Prisma.Decimal(stock.currentPrice),
                    description: `Ações da ${stock.name} do setor ${stock.sector}.`,
                    lastUpdate: new Date(),
                }
            });
            createdAssets.push(asset);
        }

        // Criação de ativos do tipo RENDA FIXA (CDB, Tesouro Direto)
        for (const fi of assetsData.fixedIncome) {
            const asset = await prisma.asset.create({
                data: {
                    name: fi.name,
                    type: fi.type === 'CDB' ? 'CDB' : 'TESOURO_DIRETO',
                    currentPrice: new Prisma.Decimal(fi.minimumInvestment), // Usa minInvestment como preço inicial para RF
                    description: `${fi.name} - Rendimento ${fi.rate * 100}% ${fi.rateType}. Vencimento: ${fi.maturity}.`,
                    rate: new Prisma.Decimal(fi.rate),
                    rateType: fi.rateType,
                    maturity: new Date(fi.maturity),
                    minimumInvestment: new Prisma.Decimal(fi.minimumInvestment),
                    lastUpdate: new Date(),
                }
            });
            createdAssets.push(asset);
        }

        // ====================================================================
        // CRIAÇÃO DE INVESTIMENTOS INICIAIS (Exemplo para o primeiro usuário)
        // ====================================================================
        // Adiciona alguns investimentos de exemplo para o primeiro usuário criado
        if (createdUsers.length > 0 && createdAssets.length > 0) {
            const firstUser = createdUsers[0];
            const firstUserInvestmentAccount = await prisma.account.findFirst({
                where: {
                    userId: firstUser.id,
                    type: 'INVESTIMENTO'
                }
            });

            // Busca ativos específicos para o investimento inicial
            const boib3Asset = createdAssets.find(a => a.symbol === 'BOIB3');
            const cdb001Asset = createdAssets.find(a => a.name === 'CDB Banco A');

            // Cria investimento em AÇÃO (BOIB3)
            if (boib3Asset && firstUserInvestmentAccount) {
                const quantity = 5;
                const purchasePrice = new Prisma.Decimal(boib3Asset.currentPrice);
                const totalCost = purchasePrice.times(quantity);

                // Debita o valor da conta de investimento do usuário
                await prisma.account.update({
                    where: { id: firstUserInvestmentAccount.id },
                    data: { balance: { decrement: totalCost } }
                });

                const investment = await prisma.investment.create({
                    data: {
                        userId: firstUser.id,
                        assetId: boib3Asset.id,
                        quantity: new Prisma.Decimal(quantity),
                        purchasePrice: purchasePrice,
                    },
                });

                // Registra a movimentação de compra
                await prisma.movement.create({
                    data: {
                        fromAccountId: firstUserInvestmentAccount.id,
                        toAccountId: firstUserInvestmentAccount.id,
                        amount: totalCost,
                        type: 'COMPRA_ATIVO',
                        description: `Compra de ${quantity} unidades de ${boib3Asset.symbol}`,
                        investmentId: investment.id,
                    },
                });
            }

            // Cria investimento em RENDA FIXA (CDB Banco A)
            if (cdb001Asset && firstUserInvestmentAccount) {
                const quantityCDB = 1; // Representa 1 unidade nominal do CDB
                const purchasePriceCDB = new Prisma.Decimal(cdb001Asset.currentPrice);
                const totalCostCDB = purchasePriceCDB.times(quantityCDB);

                // Debita o valor da conta de investimento do usuário
                await prisma.account.update({
                    where: { id: firstUserInvestmentAccount.id },
                    data: { balance: { decrement: totalCostCDB } }
                });

                const investment = await prisma.investment.create({
                    data: {
                        userId: firstUser.id,
                        assetId: cdb001Asset.id,
                        quantity: new Prisma.Decimal(quantityCDB),
                        purchasePrice: purchasePriceCDB,
                    },
                });

                // Registra a movimentação de compra
                await prisma.movement.create({
                    data: {
                        fromAccountId: firstUserInvestmentAccount.id,
                        toAccountId: firstUserInvestmentAccount.id,
                        amount: totalCostCDB,
                        type: 'COMPRA_ATIVO',
                        description: `Compra de ${quantityCDB} unidade(s) de ${cdb001Asset.name}`,
                        investmentId: investment.id,
                    },
                });
            }
        }

        // ====================================================================
        // CRIAÇÃO DE PÍLULAS DE RIQUEZA
        // ====================================================================
        // Insere dicas financeiras pré-definidas no banco de dados
        await prisma.financialTip.createMany({
            data: [
                {
                    title: 'CDB 120% do CDI',
                    description: 'Rende mais que a poupança e é garantido pelo FGC.',
                    example: 'R$100 por 1 ano = ~R$112,30',
                    source: 'https://www.exemplo.com/cdb-miubank',
                    category: 'Renda Fixa'
                },
                {
                    title: 'Ações: O que são?',
                    description: 'Você se torna sócio da empresa.',
                    example: 'BOIB3 subiu = lucro pro seu pet!',
                    source: 'https://www.exemplo.com/acoes-miubank',
                    category: 'Renda Variável'
                },
                {
                    title: 'Tesouro Direto',
                    description: 'Seguro e com boa rentabilidade.',
                    example: 'Com R$50 você já começa.',
                    source: 'https://www.exemplo.com/tesouro-miubank',
                    category: 'Renda Fixa'
                },
                {
                    title: 'A importância da Reserva de Emergência',
                    description: 'Ter um dinheiro guardado para imprevistos te dá segurança e evita que seu pet passe aperto.',
                    example: '3 a 6 meses dos seus gastos essenciais.',
                    source: 'https://www.exemplo.com/reserva-miubank',
                    category: 'Economia'
                },
                {
                    title: 'Gastos por Impulso',
                    description: 'Comprar sem pensar faz seu pet chorar. Pense duas vezes antes de gastar com coisas que não precisa.',
                    example: 'Antes de comprar, espere 24h. Se ainda quiser, compre!',
                    source: 'https://www.exemplo.com/gastos-miubank',
                    category: 'Comportamento'
                },
            ],
        });

        // Sinaliza que o seeding foi finalizado com sucesso
        console.log('Seeding finalizado com sucesso.');
    } catch (e) {
        // Em caso de erro, loga a exceção e encerra o processo
        console.error('Erro durante seeding:', e);
        process.exit(1);
    } finally {
        // Garante que a conexão com o Prisma seja encerrada
        await prisma.$disconnect();
    }
}

// Executa o script de seeding
main()
    .catch((e) => {
        // Captura erros não tratados para garantir que sejam logados
        console.error('Erro durante seeding (catch global):', e);
        process.exit(1);
    })
    .finally(async () => {
        // Garante a desconexão do Prisma mesmo após erros
        await prisma.$disconnect();
    });