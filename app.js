const express = require('express');
const bodyParser = require('body-parser');
const warehousehRoutes = require('./routes/warehouse');

const app = express();
app.use(bodyParser.json());

app.use(function(request, response, next){
  console.log(request.url);  
  next();
});

app.use('/api/warehouse', warehousehRoutes);

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});
