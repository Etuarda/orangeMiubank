// src/middlewares/error.middleware.js

module.exports = (err, req, res, next) => {
    console.error('Erro capturado:', err);

    const status = err.status || 500;
    const message = err.message || 'Erro interno do servidor';

    res.status(status).json({ error: message });
};
