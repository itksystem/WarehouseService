const express = require('express');
const bodyParser = require('body-parser');
const warehouseRoutes = require('./routes/warehouse');
const basketRoutes = require('./routes/basket');

const app = express();
app.use(bodyParser.json());

app.use('/api/warehouse', warehouseRoutes);
app.use('/api/warehouse', basketRoutes);

app.listen(process.env.PORT, () => {
  console.log(`
    ******************************************
    * Warehouse Service running on port ${process.env.PORT} *
    ******************************************`);
});
