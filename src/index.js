require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('../swagger/swagger.json');
const pingRoutes = require('./routes/ping.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas (exemplo futuro)
// const userRoutes = require('./routes/user.routes');
// app.use('/users', userRoutes);

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

// Rota básica
app.get('/', (req, res) => {
    res.send('MiuBank API rodando! 🐱💰');
});
app.use(pingRoutes);
// Middleware de erro (somente essa linha aqui)
const errorMiddleware = require('./middlewares/error.middleware');
app.use(errorMiddleware);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
