// src/jobs/marketUpdateJob.js
const cron = require('node-cron');
const marketService = require('../services/marketService');

/**
 * Agendador de tarefas para atualizar os preços dos ativos no mercado simulado.
 * Os preços das ações fictícias devem flutuar ao longo do tempo.
 */
const startMarketUpdateJob = () => {
    // Cron expression: '*/5 * * * *' significa "a cada 5 minutos"
    // Se quiser testar mais rápido, pode usar '*/1 * * * *' para "a cada 1 minuto"
    cron.schedule('*/5 * * * *', async () => { // A cada 5 minutos
        console.log('📈 Executando job de atualização de preços de ativos (a cada 5 minutos)...');
        try {
            // marketService.getAvailableAssets() já contém a lógica para atualizar
            // os preços dos ativos no banco de dados e retornar os ativos atualizados.
            // Basta chamar a função, ela fará o trabalho de update.
            await marketService.getAvailableAssets();
            console.log('✅ Preços dos ativos atualizados com sucesso.');
        } catch (error) {
            console.error('❌ Erro ao executar job de atualização de preços de ativos:', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo" // Defina o fuso horário para garantir a execução correta
    });

    console.log('🚀 Job de atualização de preços de ativos agendado para rodar a cada 5 minutos.');
};

module.exports = startMarketUpdateJob; // Exporta a função diretamente