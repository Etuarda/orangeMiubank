const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando seeding...');

    // Limpeza da base de dados
    await prisma.movement.deleteMany();
    await prisma.investment.deleteMany();
    await prisma.pet.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
    await prisma.financialTip.deleteMany();
    await prisma.asset.deleteMany();

    console.log('✅ Base limpa com sucesso.');

    // Carregando mocks
    const usersMockPath = path.resolve(__dirname, '../assets/users-mock.json');
    const assetsMockPath = path.resolve(__dirname, '../assets/assets-mock.json');

    const usersData = JSON.parse(fs.readFileSync(usersMockPath, 'utf8')).users;
    const assetsData = JSON.parse(fs.readFileSync(assetsMockPath, 'utf8'));

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
                        { type: 'CORRENTE', balance: new Prisma.Decimal(5000.00) },
                        { type: 'INVESTIMENTO', balance: new Prisma.Decimal(1000.00) }
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

    const createdAssets = [];

    for (const stock of assetsData.stocks) {
        const asset = await prisma.asset.create({
            data: {
                symbol: stock.symbol,
                name: stock.name,
                type: 'ACAO',
                currentPrice: new Prisma.Decimal(stock.currentPrice),
                description: `Ações da ${stock.name} do setor ${stock.sector}`
            }
        });

        createdAssets.push(asset);
        console.log(`📈 Ação ${asset.name} (${asset.symbol}) criada.`);
    }

    for (const fi of assetsData.fixedIncome) {
        const asset = await prisma.asset.create({
            data: {
                name: fi.name,
                type: fi.type === 'CDB' ? 'CDB' : 'TESOURO_DIRETO',
                currentPrice: new Prisma.Decimal(fi.minimumInvestment),
                description: `${fi.name} - ${fi.rate * 100}% ${fi.rateType}`,
                rate: new Prisma.Decimal(fi.rate),
                rateType: fi.rateType,
                maturity: new Date(fi.maturity),
                minimumInvestment: new Prisma.Decimal(fi.minimumInvestment)
            }
        });

        createdAssets.push(asset);
        console.log(`🏦 Renda Fixa ${asset.name} criada.`);
    }

    // Criando investimentos para o primeiro usuário
    if (createdUsers.length > 0 && createdAssets.length > 0) {
        const firstUser = createdUsers[0];

        const investmentAccount = await prisma.account.findFirst({
            where: {
                userId: firstUser.id,
                type: 'INVESTIMENTO'
            }
        });

        const boib3 = createdAssets.find(a => a.symbol === 'BOIB3');
        const cdb001 = createdAssets.find(a => a.name === 'CDB Banco A');

        if (boib3 && investmentAccount) {
            const quantity = 5;
            const total = new Prisma.Decimal(quantity).mul(boib3.currentPrice);

            await prisma.account.update({
                where: { id: investmentAccount.id },
                data: { balance: { decrement: total } }
            });

            const investment = await prisma.investment.create({
                data: {
                    userId: firstUser.id,
                    assetId: boib3.id,
                    quantity,
                    buyPrice: boib3.currentPrice
                }
            });

            await prisma.movement.create({
                data: {
                    fromAccountId: investmentAccount.id,
                    toAccountId: investmentAccount.id,
                    amount: total,
                    type: 'COMPRA_ATIVO',
                    description: `Compra de ${quantity} unidades de ${boib3.symbol}`,
                    investmentId: investment.id
                }
            });

            console.log(`💸 Investimento em ${boib3.symbol} criado.`);
        }

        if (cdb001 && investmentAccount) {
            const quantity = 1;
            const total = new Prisma.Decimal(quantity).mul(cdb001.currentPrice);

            await prisma.account.update({
                where: { id: investmentAccount.id },
                data: { balance: { decrement: total } }
            });

            const investment = await prisma.investment.create({
                data: {
                    userId: firstUser.id,
                    assetId: cdb001.id,
                    quantity,
                    buyPrice: cdb001.currentPrice
                }
            });

            await prisma.movement.create({
                data: {
                    fromAccountId: investmentAccount.id,
                    toAccountId: investmentAccount.id,
                    amount: total,
                    type: 'COMPRA_ATIVO',
                    description: `Compra de 1 unidade de ${cdb001.name}`,
                    investmentId: investment.id
                }
            });

            console.log(`💸 Investimento em ${cdb001.name} criado.`);
        }
    }

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
            }
        ]
    });

    console.log('🎓 Pílulas de riqueza criadas.');
    console.log('✅ Seeding finalizado com sucesso.');
}

main()
    .catch((e) => {
        console.error('❌ Erro durante seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
