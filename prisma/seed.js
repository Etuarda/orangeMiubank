const { PrismaClient, Prisma } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Função utilitária para carregar JSON com validação
function carregarMock(pathRelativo) {
    const fullPath = path.resolve(__dirname, pathRelativo);
    const raw = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(raw);
}

// Limpa o banco de dados respeitando a ordem das foreign keys
async function limparBanco() {
    await prisma.movement.deleteMany({});
    await prisma.investment.deleteMany({});
    await prisma.financialGoal.deleteMany({});
    await prisma.pet.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.financialTip.deleteMany({});
    await prisma.asset.deleteMany({});
}

// Cria usuários com contas e pets
async function criarUsuarios(usersData) {
    const createdUsers = [];

    for (const user of usersData) {
        const hashedPassword = await bcrypt.hash('password123', 10);

        const novoUsuario = await prisma.user.create({
            data: {
                name: user.name,
                email: user.email,
                password: hashedPassword,
                cpf: user.cpf,
                birthDate: new Date(user.birthDate),
                accounts: {
                    create: [
                        { type: 'CORRENTE', balance: new Prisma.Decimal(5000.0) },
                        { type: 'INVESTIMENTO', balance: new Prisma.Decimal(1000.0) }
                    ]
                },
                pet: {
                    create: {
                        mood: 3,
                        savedThisMonth: new Prisma.Decimal(0.0),
                        lastUpdate: new Date()
                    }
                }
            }
        });

        createdUsers.push(novoUsuario);
    }

    return createdUsers;
}

// Cria ativos do tipo ação e renda fixa
async function criarAtivos(assetsData) {
    const createdAssets = [];

    for (const stock of assetsData.stocks) {
        const asset = await prisma.asset.create({
            data: {
                symbol: stock.symbol,
                name: stock.name,
                type: 'ACAO',
                currentPrice: new Prisma.Decimal(stock.currentPrice),
                description: `Ações da ${stock.name} do setor ${stock.sector}.`,
                lastUpdate: new Date()
            }
        });

        createdAssets.push(asset);
    }

    for (const fi of assetsData.fixedIncome) {
        const asset = await prisma.asset.create({
            data: {
                name: fi.name,
                type: fi.type === 'CDB' ? 'CDB' : 'TESOURO_DIRETO',
                currentPrice: new Prisma.Decimal(fi.minimumInvestment),
                description: `${fi.name} - Rendimento ${fi.rate * 100}% ${fi.rateType}. Vencimento: ${fi.maturity}.`,
                rate: new Prisma.Decimal(fi.rate),
                rateType: fi.rateType,
                maturity: new Date(fi.maturity),
                minimumInvestment: new Prisma.Decimal(fi.minimumInvestment),
                lastUpdate: new Date()
            }
        });

        createdAssets.push(asset);
    }

    return createdAssets;
}

// Cria investimento inicial para o primeiro usuário
async function criarInvestimentoInicial(user, assets) {
    const contaInvestimento = await prisma.account.findFirst({
        where: {
            userId: user.id,
            type: 'INVESTIMENTO'
        }
    });

    if (!contaInvestimento) return;

    const acoes = assets.find(a => a.symbol === 'BOIB3');
    const rendaFixa = assets.find(a => a.name === 'CDB Banco A');

    if (acoes) {
        await registrarInvestimento({
            userId: user.id,
            accountId: contaInvestimento.id,
            asset: acoes,
            quantity: 5
        });
    }

    if (rendaFixa) {
        await registrarInvestimento({
            userId: user.id,
            accountId: contaInvestimento.id,
            asset: rendaFixa,
            quantity: 1
        });
    }
}

// Cria investimento e registra movimentação
async function registrarInvestimento({ userId, accountId, asset, quantity }) {
    const price = new Prisma.Decimal(asset.currentPrice);
    const total = price.times(quantity);

    await prisma.account.update({
        where: { id: accountId },
        data: {
            balance: {
                decrement: total
            }
        }
    });

    const investimento = await prisma.investment.create({
        data: {
            userId,
            assetId: asset.id,
            quantity: new Prisma.Decimal(quantity),
            purchasePrice: price
        }
    });

    await prisma.movement.create({
        data: {
            fromAccountId: accountId,
            toAccountId: accountId,
            amount: total,
            type: 'COMPRA_ATIVO',
            description: `Compra de ${quantity} ${asset.symbol || asset.name}`,
            investmentId: investimento.id
        }
    });
}

// Cria dicas financeiras
async function criarDicas() {
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
                description: 'Ter um dinheiro guardado para imprevistos te dá segurança.',
                example: '3 a 6 meses dos seus gastos essenciais.',
                source: 'https://www.exemplo.com/reserva-miubank',
                category: 'Economia'
            },
            {
                title: 'Gastos por Impulso',
                description: 'Comprar sem pensar faz seu pet chorar.',
                example: 'Antes de comprar, espere 24h.',
                source: 'https://www.exemplo.com/gastos-miubank',
                category: 'Comportamento'
            }
        ]
    });
}

// Função principal
async function main() {
    await limparBanco();

    const usersData = carregarMock('../assets/users-mock.json').users;
    const assetsData = carregarMock('../assets/assets-mock.json');

    const users = await criarUsuarios(usersData);
    const assets = await criarAtivos(assetsData);

    if (users.length && assets.length) {
        await criarInvestimentoInicial(users[0], assets);
    }

    await criarDicas();
}

main()
    .catch((e) => {
        console.error('Erro durante seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
