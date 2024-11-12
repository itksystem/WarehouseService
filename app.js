const express = require('express');
const bodyParser = require('body-parser');
const warehouseRoutes = require('./routes/warehouse');

const app = express();
app.use(bodyParser.json());

app.use(function(request, response, next){
  console.log(request);  
  next();
});

app.use('/api/warehouse', warehouseRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
