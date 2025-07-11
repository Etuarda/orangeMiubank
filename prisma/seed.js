// prisma/seed.js

// Este script é usado para popular o banco de dados com dados iniciais (seed data).
// Ele agora lê dados de arquivos mock JSON de dentro da pasta 'assets'.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // Para criptografar senhas
const path = require('path'); // Para resolver caminhos de arquivo
const fs = require('fs'); // Para ler arquivos

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando o processo de seeding...');

    // Limpa o banco de dados antes de popular (opcional, mas útil para testes)
    await prisma.movement.deleteMany({});
    await prisma.investment.deleteMany({});
    await prisma.pet.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.financialTip.deleteMany({});
    await prisma.asset.deleteMany({});

    console.log('Dados existentes limpos.');

    // ====================================================================
    // CARREGANDO DADOS MOCK DOS NOVOS CAMINHOS
    // ====================================================================

    const usersMockPath = path.resolve(__dirname, '../assets/users-mock.json'); // Caminho atualizado
    const assetsMockPath = path.resolve(__dirname, '../assets/assets-mock.json'); // Caminho atualizado

    const usersData = JSON.parse(fs.readFileSync(usersMockPath, 'utf8')).users;
    const assetsData = JSON.parse(fs.readFileSync(assetsMockPath, 'utf8'));

    // ====================================================================
    // CRIAÇÃO DE USUÁRIOS E CONTAS A PARTIR DO MOCK
    // ====================================================================

    const createdUsers = [];
    for (const userData of usersData) {
        const hashedPassword = await bcrypt.hash('password123', 10); // Senha padrão para todos os usuários mock
        const user = await prisma.user.create({
            data: {
                name: userData.name,
                email: userData.email,
                password: hashedPassword,
                // O CPF e birthDate não estão no schema.prisma do User, então não os incluímos aqui.
                // Se precisar, adicione-os ao modelo User no schema.prisma.
                accounts: {
                    create: [
                        { type: 'CORRENTE', balance: 500.00 }, // Saldo inicial padrão para CC
                        { type: 'INVESTIMENTO', balance: 0.00 }, // Saldo inicial padrão para CI
                    ],
                },
                pet: {
                    create: {
                        mood: 3, // Humor neutro inicial
                        savedThisMonth: 0.00,
                        lastUpdate: new Date(),
                    },
                },
            },
        });
        createdUsers.push(user);
        console.log(`Usuário ${user.name} (${user.email}) criado.`);
    }

    // ====================================================================
    // CRIAÇÃO DE ATIVOS A PARTIR DO MOCK
    // ====================================================================

    const createdAssets = [];
    // Ações
    for (const stockData of assetsData.stocks) {
        const asset = await prisma.asset.create({
            data: {
                name: stockData.name,
                type: 'ACAO', // Todos os itens em 'stocks' são do tipo ACAO
                price: stockData.currentPrice,
                description: `Ações da ${stockData.name} do setor ${stockData.sector}.`,
                // minPrice e maxPrice podem ser calculados ou definidos após a variação
                // dailyVariation não é um campo do modelo Asset no schema.prisma
            },
        });
        createdAssets.push(asset);
        console.log(`Ativo AÇÃO: ${asset.name} criado.`);
    }

    // Renda Fixa
    for (const fixedIncomeData of assetsData.fixedIncome) {
        const asset = await prisma.asset.create({
            data: {
                name: fixedIncomeData.name,
                type: fixedIncomeData.type === 'CDB' ? 'CDB' : 'TESOURO_DIRETO', // Mapeia para os enums
                price: fixedIncomeData.minimumInvestment || 1.00, // Usar minInvestment como preço inicial ou 1.00
                description: `${fixedIncomeData.name} - Rendimento ${fixedIncomeData.rate * 100}% ${fixedIncomeData.rateType}. Vencimento: ${fixedIncomeData.maturity}.`,
            },
        });
        createdAssets.push(asset);
        console.log(`Ativo RENDA FIXA: ${asset.name} criado.`);
    }

    // ====================================================================
    // CRIAÇÃO DE INVESTIMENTOS INICIAIS (Exemplo para o primeiro usuário)
    // ====================================================================

    if (createdUsers.length > 0 && createdAssets.length > 0) {
        const firstUser = createdUsers[0]; // Alice
        const xptoAsset = createdAssets.find(a => a.name === 'Ação XPTO');
        const cdbAsset = createdAssets.find(a => a.name === 'CDB Banco A');

        if (xptoAsset) {
            await prisma.investment.create({
                data: {
                    userId: firstUser.id,
                    assetId: xptoAsset.id,
                    quantity: 10,
                    buyPrice: xptoAsset.price.minus(5), // Simula compra por um preço um pouco menor
                },
            });
            console.log(`Investimento inicial de ${firstUser.name} em ${xptoAsset.name} criado.`);
        }

        if (cdbAsset) {
            await prisma.investment.create({
                data: {
                    userId: firstUser.id,
                    assetId: cdbAsset.id,
                    quantity: 1000, // Investiu R$1000 em CDB
                    buyPrice: cdbAsset.price,
                },
            });
            console.log(`Investimento inicial de ${firstUser.name} em ${cdbAsset.name} criado.`);
        }
    }

    // ====================================================================
    // CRIAÇÃO DE PÍLULAS DE RIQUEZA
    // ====================================================================

    await prisma.financialTip.createMany({
        data: [
            {
                title: 'CDB 120% do CDI',
                description: 'Rende mais que a poupança e é garantido pelo FGC. Seu pet aprova!',
                example: 'R$100 guardados por 1 ano = ~R$112,30',
                source: 'https://www.exemplo.com/cdb-miubank',
                category: 'Renda Fixa'
            },
            {
                title: 'Ações: O que são?',
                description: 'São pedacinhos de empresas. Ao comprar, você vira sócio e pode ganhar com o crescimento da empresa ou dividendos. Seu pet quer ser sócio!',
                example: 'Se a Ação XPTO valoriza, seu pet fica mais feliz!',
                source: 'https://www.exemplo.com/acoes-miubank',
                category: 'Renda Variável'
            },
            {
                title: 'Tesouro Direto',
                description: 'Empréstimo para o governo. Seguro e com boa rentabilidade. Ideal para objetivos de longo prazo. Seu pet pode viajar para a lua com o rendimento do Tesouro!',
                example: 'Com R$50 você já começa a investir no futuro do seu pet.',
                source: 'https://www.exemplo.com/tesouro-miubank',
                category: 'Renda Fixa'
            },
            {
                title: 'A importância da Reserva de Emergência',
                description: 'Ter um dinheiro guardado para imprevistos te dá segurança e evita que seu pet passe aperto. Seu pet dorme tranquilo sabendo que tem uma reserva!',
                example: '3 a 6 meses dos seus gastos essenciais.',
                source: 'https://www.exemplo.com/reserva-miubank',
                category: 'Economia'
            },
            {
                title: 'Gastos por Impulso',
                description: 'Comprar sem pensar faz seu pet chorar. Pense duas vezes antes de gastar com coisas que não precisa. Seu pet tá triste porque você tirou R$50 da reserva pra comprar skin do Valorant. 😢',
                example: 'Antes de comprar, espere 24h. Se ainda quiser, compre!',
                source: 'https://www.exemplo.com/gastos-miubank',
                category: 'Comportamento'
            },
        ],
    });
    console.log('Pílulas de riqueza criadas.');

    console.log('Processo de seeding concluído.');
}

// Executa o script de seeding
main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect(); // Desconecta o Prisma Client
    });
