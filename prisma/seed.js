// prisma/seed.js
const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando seeding...');

    // Limpeza da base de dados (ordem importa devido a foreign keys)
    await prisma.movement.deleteMany({});
    await prisma.investment.deleteMany({});
    await prisma.pet.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.financialTip.deleteMany({});
    await prisma.asset.deleteMany({});

    console.log('✅ Base limpa com sucesso.');

    // Carregando mocks
    const usersMockPath = path.resolve(__dirname, '../assets/users-mock.json');
    const assetsMockPath = path.resolve(__dirname, '../assets/assets-mock.json');

    const usersData = JSON.parse(fs.readFileSync(usersMockPath, 'utf8')).users;
    const assetsData = JSON.parse(fs.readFileSync(assetsMockPath, 'utf8'));

    // ====================================================================
    // CRIAÇÃO DE USUÁRIOS E CONTAS A PARTIR DO MOCK
    // ====================================================================
    const createdUsers = [];
    for (const user of usersData) {
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
                    create: [
                        { type: 'CORRENTE', balance: new Prisma.Decimal(5000.00) }, // Saldo inicial para CC
                        { type: 'INVESTIMENTO', balance: new Prisma.Decimal(1000.00) } // Saldo inicial para CI
                    ]
                },
                pet: {
                    create: {
                        mood: 3,
                        savedThisMonth: new Prisma.Decimal(0.00),
                        lastUpdate: new Date()
                    }
                }
            }
        });
        createdUsers.push(newUser);
        console.log(`👤 Usuário ${newUser.name} criado.`);
    }

    // ====================================================================
    // CRIAÇÃO DE ATIVOS A PARTIR DO MOCK
    // ====================================================================
    const createdAssets = [];
    // Ações
    for (const stock of assetsData.stocks) {
        const asset = await prisma.asset.create({
            data: {
                symbol: stock.symbol,
                name: stock.name,
                type: 'ACAO',
                currentPrice: new Prisma.Decimal(stock.currentPrice),
                description: `Ações da ${stock.name} do setor ${stock.sector}.`,
                lastUpdate: new Date(),
                // Campos de renda fixa não aplicáveis (serão nulos)
            }
        });
        createdAssets.push(asset);
        console.log(`📈 Ação ${asset.name} (${asset.symbol}) criada.`);
    }

    // Renda Fixa
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
                // Symbol não aplicável (será nulo)
            }
        });
        createdAssets.push(asset);
        console.log(`🏦 Renda Fixa ${asset.name} criada.`);
    }

    // ====================================================================
    // CRIAÇÃO DE INVESTIMENTOS INICIAIS (Exemplo para o primeiro usuário)
    // ====================================================================
    if (createdUsers.length > 0 && createdAssets.length > 0) {
        const firstUser = createdUsers[0];
        const firstUserInvestmentAccount = await prisma.account.findFirst({
            where: {
                userId: firstUser.id,
                type: 'INVESTIMENTO'
            }
        });

        const boib3Asset = createdAssets.find(a => a.symbol === 'BOIB3');
        const cdb001Asset = createdAssets.find(a => a.name === 'CDB Banco A');

        if (boib3Asset && firstUserInvestmentAccount) {
            const quantity = 5;
            const purchasePrice = new Prisma.Decimal(boib3Asset.currentPrice);
            const totalCost = purchasePrice.times(quantity);

            // Debita da conta de investimento
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
            console.log(`💸 Investimento inicial de ${firstUser.name} em ${boib3Asset.name} criado.`);
        }

        if (cdb001Asset && firstUserInvestmentAccount) {
            const quantityCDB = 1; // Representa 1 unidade nominal do CDB
            const purchasePriceCDB = new Prisma.Decimal(cdb001Asset.currentPrice);
            const totalCostCDB = purchasePriceCDB.times(quantityCDB);

            // Debita da conta de investimento
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
            console.log(`💸 Investimento inicial de ${firstUser.name} em ${cdb001Asset.name} criado.`);
        }
    }

    // ====================================================================
    // CRIAÇÃO DE PÍLULAS DE RIQUEZA
    // ====================================================================
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
    console.log('🎓 Pílulas de riqueza criadas.');
    console.log('✅ Seeding finalizado com sucesso.');
}

// Executa o script de seeding
main()
    .catch((e) => {
        console.error('❌ Erro durante seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });